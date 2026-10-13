"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { generateAuthLink } from "@/lib/auth/links";
import { requireRole } from "@/lib/auth/staff";
import { formValue, type FormState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, inviteSchema, roleSchema } from "@/lib/validation/auth";

export type LinkFormState = FormState & { link?: string };

const staffIdSchema = z.uuid();

export async function inviteStaff(
  _prev: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  await requireRole(["admin"]);

  const values = {
    email: formValue(formData, "email"),
    displayName: formValue(formData, "displayName"),
    role: formValue(formData, "role"),
  };
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  // Insert as the admin (RLS + audit), then create the Auth user; the
  // database trigger turns the matching invitation into a staff profile.
  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from("staff_invitations")
    .insert({
      email: parsed.data.email,
      display_name: parsed.data.displayName,
      role: parsed.data.role,
    })
    .select("id")
    .single();

  if (error || !invitation) {
    return {
      status: "error",
      message:
        error?.code === "23505"
          ? "Voor dit e-mailadres staat al een uitnodiging open."
          : "Uitnodigen is mislukt. Probeer het opnieuw.",
      values,
    };
  }

  const link = await generateAuthLink("invite", parsed.data.email);
  if (!link.ok) {
    await supabase
      .from("staff_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", invitation.id);
    return {
      status: "error",
      message:
        link.reason === "exists"
          ? "Er bestaat al een account met dit e-mailadres. Heractiveer de medewerker of maak een nieuwe inloglink."
          : "Uitnodigen is mislukt. Probeer het opnieuw.",
      values,
    };
  }

  refresh();
  return {
    status: "success",
    message: `${parsed.data.displayName} is uitgenodigd als medewerker.`,
    link: link.url,
  };
}

/** New one-time link to (re)set the password, e.g. when an invite expired. */
export async function createLoginLink(
  _prev: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  await requireRole(["admin"]);
  const staffId = staffIdSchema.safeParse(formValue(formData, "staffId"));
  if (!staffId.success) return { status: "error", message: "Onbekende medewerker." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(staffId.data);
  const email = data.user?.email;
  if (error || !email) return { status: "error", message: "Onbekende medewerker." };

  const link = await generateAuthLink("recovery", email);
  if (!link.ok) return { status: "error", message: "Link maken is mislukt. Probeer het opnieuw." };
  return { status: "success", link: link.url };
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

  refresh();
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

  refresh();
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
  await supabase.rpc("log_mfa_event", { target_staff_id: staffId.data, mfa_event: "reset" });
  refresh();
  return { status: "success", message: "Tweestapsverificatie is gereset." };
}
