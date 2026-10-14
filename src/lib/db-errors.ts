type DbError = { code?: string; message?: string } | null | undefined;

/** Friendly Dutch message for a failed database call (never leaks details). */
export function dbErrorMessage(
  error: DbError,
  fallback = "Opslaan is mislukt. Probeer het opnieuw.",
): string {
  switch (error?.code) {
    case "42501":
      return "Je hebt geen rechten om dit te wijzigen.";
    case "23505":
      return "Dit bestaat al.";
    case "23503":
      return "Een gekozen onderdeel bestaat niet (meer).";
    case "23514":
      if (error.message?.includes("published")) {
        return "Publiceren kan pas als het evenement een starttijd heeft.";
      }
      return "Deze waarde is niet toegestaan.";
    default:
      return fallback;
  }
}
