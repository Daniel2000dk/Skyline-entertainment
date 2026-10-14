"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createActivation } from "@/lib/auth/activation";
import { revalidateInternal } from "@/lib/revalidate";
import { requireRole } from "@/lib/auth/staff";
import { formValue, type FormState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, inviteSchema, roleSchema, usernameSchema } from "@/lib/validation/auth";

export type LinkFormState = FormState & { link?: string; code?: string; username?: string };

const staffIdSchema = z.uuid();

/**
 * Creates a staff account with a username chosen by the admin. The Auth
 * account gets an undeliverable internal email address (".invalid" never
 * resolves); the member activates it with a link + separate code.
 */
export async function inviteStaff(
  _prev: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  await requireRole(["admin"]);

  const values = {
    username: formValue(formData, "username"),
    displayName: formValue(formData, "displayName"),
    role: formValue(formData, "role"),
  };
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const usernameTaken: LinkFormState = {
    status: "error",
    fieldErrors: { username: "Deze gebruikersnaam is al in gebruik." },
    values,
  };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();
  if (existing) return usernameTaken;

  // Insert as the admin (RLS + audit), then create the Auth user; the
  // database trigger turns the matching invitation into a staff profile.
  const email = `${randomUUID()}@users.skyline.invalid`;
  const { data: invitation, error } = await supabase
    .from("staff_invitations")
    .insert({
      email,
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      role: parsed.data.role,
    })
    .select("id")
    .single();
  if (error || !invitation) {
    return error?.code === "23505"
      ? usernameTaken
      : { status: "error", message: "Toevoegen is mislukt. Probeer het opnieuw.", values };
  }

  const { data: created } = await createAdminClient().auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (!created?.user) {
    await supabase
      .from("staff_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", invitation.id);
    return { status: "error", message: "Toevoegen is mislukt. Probeer het opnieuw.", values };
  }

  revalidateInternal();
  const activation = await createActivation(created.user.id);
  if (!activation) {
    return {
      status: "error",
      message: `${parsed.data.displayName} is toegevoegd, maar de activatielink kon niet worden gemaakt. Gebruik "Nieuwe activatielink" bij de medewerker.`,
    };
  }
  return {
    status: "success",
    message: `${parsed.data.displayName} is toegevoegd.`,
    username: parsed.data.username,
    link: activation.url,
    code: activation.code,
  };
}

/** New activation link + code, e.g. for a forgotten password or an expired link. */
export async function createLoginLink(
  _prev: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  const currentAdmin = await requireRole(["admin"]);
  const staffId = staffIdSchema.safeParse(formValue(formData, "staffId"));
  if (!staffId.success) return { status: "error", message: "Onbekende medewerker." };
  if (staffId.data === currentAdmin.id) {
    return { status: "error", message: "Je eigen wachtwoord wijzig je via Account." };
  }

  // The database re-checks admin rights, logs it and voids older links.
  const activation = await createActivation(staffId.data);
  if (!activation)
    return { status: "error", message: "Link maken is mislukt. Probeer het opnieuw." };
  return { status: "success", link: activation.url, code: activation.code };
}

export async function updateStaffUsername(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole(["admin"]);
  const staffId = staffIdSchema.safeParse(formValue(formData, "staffId"));
  const username = usernameSchema.safeParse(formValue(formData, "username"));
  if (!staffId.success) return { status: "error", message: "Onbekende medewerker." };
  if (!username.success) {
    return { status: "error", message: username.error.issues[0]?.message ?? "Ongeldige invoer." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_profiles")
    .update({ username: username.data })
    .eq("id", staffId.data)
    .select("id");
  if (error) {
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "Deze gebruikersnaam is al in gebruik."
          : "Opslaan is mislukt. Probeer het opnieuw.",
    };
  }
  if (!data?.length) return { status: "error", message: "Onbekende medewerker." };

  revalidateInternal();
  return { status: "success", message: "Gebruikersnaam opgeslagen." };
}

export async function updateStaffRole(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(["admin"]);
  const staffId = staffIdSchema.safeParse(formValue(formData, "staffId"));
  const role = roleSchema.safeParse(formValue(formData, "role"));
  if (!staffId.success || !role.success) return { status: "error", message: "Ongeldige invoer." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_profiles")
    .update({ role: role.data })
    .eq("id", staffId.data)
    .select("id");

  if (error) {
    return {
      status: "error",
      message:
        error.code === "42501"
          ? "Je kunt je eigen rol niet wijzigen."
          : "Rol wijzigen is mislukt. Probeer het opnieuw.",
    };
  }
  if (!data?.length) return { status: "error", message: "Onbekende medewerker." };

  revalidateInternal();
  return { status: "success", message: "Rol opgeslagen." };
}

export async function setStaffActive(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(["admin"]);
  const staffId = staffIdSchema.safeParse(formValue(formData, "staffId"));
  const active = formValue(formData, "active");
  if (!staffId.success || (active !== "true" && active !== "false")) {
    return { status: "error", message: "Ongeldige invoer." };
  }
  const isActive = active === "true";

  // The profile change revokes all data access immediately (RLS); the ban
  // additionally blocks new logins and session refreshes.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_profiles")
    .update({ is_active: isActive })
    .eq("id", staffId.data)
    .select("id");

  if (error) {
    return {
      status: "error",
      message:
        error.code === "42501"
          ? "Je kunt jezelf niet deactiveren."
          : "Status wijzigen is mislukt. Probeer het opnieuw.",
    };
  }
  if (!data?.length) return { status: "error", message: "Onbekende medewerker." };

  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(staffId.data, {
    ban_duration: isActive ? "none" : "876000h",
  });

  revalidateInternal();
  if (banError) {
    return {
      status: "error",
      message: isActive
        ? "Medewerker is geactiveerd, maar inloggen is nog geblokkeerd. Probeer het opnieuw."
        : "Medewerker heeft geen toegang meer, maar het account kon niet worden geblokkeerd. Probeer het opnieuw.",
    };
  }
  return {
    status: "success",
    message: isActive ? "Medewerker is weer actief." : "Medewerker is gedeactiveerd.",
  };
}

/** For a lost phone: removes the member's authenticator so they can log in with password only. */
export async function resetStaffMfa(_prev: FormState, formData: FormData): Promise<FormState> {
  const currentAdmin = await requireRole(["admin"]);
  const staffId = staffIdSchema.safeParse(formValue(formData, "staffId"));
  if (!staffId.success) return { status: "error", message: "Onbekende medewerker." };
  if (staffId.data === currentAdmin.id) {
    return { status: "error", message: "Je eigen tweestapsverificatie beheer je via Account." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: staffId.data });
  if (error) return { status: "error", message: "Resetten is mislukt. Probeer het opnieuw." };
  for (const factor of data.factors) {
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: staffId.data,
    });
    if (deleteError)
      return { status: "error", message: "Resetten is mislukt. Probeer het opnieuw." };
  }

  const supabase = await createClient();
  await supabase.rpc("log_security_event", {
    target_staff_id: staffId.data,
    security_event: "mfa.reset",
  });
  revalidateInternal();
  return { status: "success", message: "Tweestapsverificatie is gereset." };
}
