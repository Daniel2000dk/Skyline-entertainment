import { describe, expect, it } from "vitest";
import { describeActivity } from "./activity";

describe("describeActivity", () => {
  it.each([
    [{ action: "projects.insert", details: {} }, "Project aangemaakt"],
    [
      {
        action: "projects.update",
        details: { diff: { status: { from: "idea", to: "approved" } } },
      },
      "Status naar Goedgekeurd",
    ],
    [
      { action: "projects.update", details: { changed: ["description"] } },
      "Projectdetails bijgewerkt",
    ],
    [
      { action: "tasks.update", details: { diff: { status: { from: "todo", to: "done" } } } },
      'Taak naar "Klaar"',
    ],
    [
      { action: "tasks.update", details: { diff: { assignee_id: { from: null, to: "x" } } } },
      "Taak toegewezen",
    ],
    [
      {
        action: "suggestions.update",
        details: { diff: { status: { from: "open", to: "accepted" } } },
      },
      "Suggestie geaccepteerd",
    ],
    [{ action: "map_routes.update", details: { changed: ["points"] } }, "Route bijgewerkt"],
    [{ action: "map_markers.insert", details: null }, "Marker geplaatst"],
    [{ action: "something.else", details: null }, "Wijziging"],
  ])("describes %j", (entry, expected) => {
    expect(describeActivity(entry)).toBe(expected);
  });
});
