import { z } from "zod";
import { localInputToIso } from "@/lib/datetime";
import {
  PERMISSIONS,
  PROJECT_STATUSES,
  REGISTRATION_MODES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/projects/labels";

/** Optional trimmed text; empty input becomes null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

const requiredText = (max: number, emptyMessage: string, maxMessage: string) =>
  z.string({ error: emptyMessage }).trim().min(1, emptyMessage).max(max, maxMessage);

/** datetime-local value in Amsterdam time → ISO UTC (or null when empty). */
const optionalDateTime = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || localInputToIso(value) !== null,
    "Vul een geldige datum en tijd in.",
  )
  .transform((value) => localInputToIso(value));

const optionalUuid = z
  .string()
  .trim()
  .refine((value) => value === "" || z.uuid().safeParse(value).success, "Ongeldige keuze.")
  .transform((value) => (value === "" ? null : value));

const gtaAmount = z.coerce
  .number({ error: "Vul een bedrag in." })
  .int("Gebruik hele GTA-dollars.")
  .min(0, "Het bedrag kan niet negatief zijn.")
  .max(1_000_000_000, "Dit bedrag is te hoog.");

const optionalCapacity = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 1000),
    "Kies een aantal tussen 1 en 1000.",
  )
  .transform((value) => (value === "" ? null : Number(value)));

export const projectTitle = requiredText(120, "Vul een naam in.", "Gebruik maximaal 120 tekens.");

export const createProjectSchema = z.object({
  title: projectTitle,
  eventTypeId: optionalUuid,
  startsAt: optionalDateTime,
  description: optionalText(5000, "Gebruik maximaal 5000 tekens."),
});

export const updateProjectSchema = z
  .object({
    title: projectTitle,
    eventTypeId: optionalUuid,
    description: optionalText(5000, "Gebruik maximaal 5000 tekens."),
    budget: gtaAmount,
    summary: optionalText(300, "Gebruik maximaal 300 tekens."),
    location: optionalText(120, "Gebruik maximaal 120 tekens."),
    startsAt: optionalDateTime,
    endsAt: optionalDateTime,
    capacity: optionalCapacity,
    entryFee: gtaAmount,
    rules: optionalText(5000, "Gebruik maximaal 5000 tekens."),
    registrationMode: z.enum(REGISTRATION_MODES, { error: "Kies een geldige optie." }),
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt, {
    path: ["endsAt"],
    message: "Het einde moet na de start liggen.",
  });

export const projectStatusSchema = z.enum(PROJECT_STATUSES, { error: "Kies een geldige status." });

export const memberSchema = z.object({
  staffId: z.uuid({ error: "Kies een medewerker." }),
  permission: z.enum(PERMISSIONS, { error: "Kies een geldig recht." }),
});

export const checklistItemSchema = z.object({
  title: requiredText(200, "Vul een punt in.", "Gebruik maximaal 200 tekens."),
});

export const runbookItemSchema = z.object({
  title: requiredText(160, "Vul een onderdeel in.", "Gebruik maximaal 160 tekens."),
  startsAt: optionalDateTime,
  details: optionalText(2000, "Gebruik maximaal 2000 tekens."),
  responsibleId: optionalUuid,
});

export const taskSchema = z.object({
  title: requiredText(160, "Vul een titel in.", "Gebruik maximaal 160 tekens."),
  description: optionalText(5000, "Gebruik maximaal 5000 tekens."),
  assigneeId: optionalUuid,
  dueAt: optionalDateTime,
  priority: z.enum(TASK_PRIORITIES, { error: "Kies een geldige prioriteit." }),
});

export const taskStatusSchema = z.enum(TASK_STATUSES, { error: "Kies een geldige status." });

export const uuidSchema = z.uuid();
