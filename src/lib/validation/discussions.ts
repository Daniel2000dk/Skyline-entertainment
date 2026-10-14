import { z } from "zod";
import { localInputToIso } from "@/lib/datetime";

export const commentSchema = z.object({
  body: z
    .string({ error: "Schrijf een bericht." })
    .trim()
    .min(1, "Schrijf een bericht.")
    .max(5000, "Gebruik maximaal 5000 tekens."),
});

export type SuggestionField =
  | "title"
  | "description"
  | "budget_gta"
  | "summary"
  | "rules"
  | "location"
  | "starts_at"
  | "ends_at"
  | "capacity"
  | "entry_fee_gta";

type FieldSpec = {
  label: string;
  kind: "text" | "textarea" | "datetime" | "gta" | "capacity";
  max?: number;
};

export const SUGGESTION_FIELDS: Record<SuggestionField, FieldSpec> = {
  title: { label: "Naam", kind: "text", max: 120 },
  location: { label: "Locatie", kind: "text", max: 120 },
  starts_at: { label: "Start", kind: "datetime" },
  ends_at: { label: "Einde", kind: "datetime" },
  capacity: { label: "Max. deelnemers", kind: "capacity" },
  entry_fee_gta: { label: "Inschrijfgeld", kind: "gta" },
  budget_gta: { label: "Budget", kind: "gta" },
  summary: { label: "Korte publieke tekst", kind: "textarea", max: 300 },
  description: { label: "Omschrijving", kind: "textarea", max: 5000 },
  rules: { label: "Spelregels", kind: "textarea", max: 5000 },
};

export const SUGGESTION_FIELD_KEYS = Object.keys(SUGGESTION_FIELDS) as SuggestionField[];

/**
 * A suggestion is either free-form (no field) or a concrete new value for one
 * field. The value is validated per field and normalized (UTC dates, whole
 * GTA dollars) so accepting it can never write something invalid.
 */
export const suggestionSchema = z
  .object({
    field: z.union(
      [z.literal(""), z.enum(SUGGESTION_FIELD_KEYS as [SuggestionField, ...SuggestionField[]])],
      {
        error: "Kies een onderdeel.",
      },
    ),
    proposedValue: z.string().trim().max(5000, "Gebruik maximaal 5000 tekens."),
    message: z
      .string({ error: "Licht je voorstel toe." })
      .trim()
      .min(1, "Licht je voorstel toe.")
      .max(2000, "Gebruik maximaal 2000 tekens."),
  })
  .transform((data, ctx) => {
    if (data.field === "") return { field: null, proposedValue: null, message: data.message };

    const spec = SUGGESTION_FIELDS[data.field];
    const raw = data.proposedValue;
    const fail = (message: string) => {
      ctx.addIssue({ code: "custom", path: ["proposedValue"], message });
      return z.NEVER;
    };

    let value: string;
    switch (spec.kind) {
      case "text":
      case "textarea":
        if (!raw) return fail("Vul de nieuwe waarde in.");
        if (spec.max && raw.length > spec.max) return fail(`Gebruik maximaal ${spec.max} tekens.`);
        value = raw;
        break;
      case "datetime": {
        const iso = localInputToIso(raw);
        if (!iso) return fail("Vul een geldige datum en tijd in.");
        value = iso;
        break;
      }
      case "capacity":
        if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 1000) {
          return fail("Kies een aantal tussen 1 en 1000.");
        }
        value = String(Number(raw));
        break;
      case "gta":
        if (!/^\d+$/.test(raw) || Number(raw) > 1_000_000_000) {
          return fail("Gebruik een heel, positief aantal GTA-dollars.");
        }
        value = String(Number(raw));
        break;
    }
    return { field: data.field, proposedValue: value, message: data.message };
  });
