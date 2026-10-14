import { describe, expect, it } from "vitest";
import { saveRouteSchema } from "@/lib/validation/map";
import { fromLatLng, pointLabels, toLatLng } from "./coords";

const size = { width: 533, height: 800 };

describe("map coordinates", () => {
  it("maps the top-left corner of the image to the top of the Leaflet canvas", () => {
    expect(toLatLng({ x: 0, y: 0 }, size)).toEqual([800, 0]);
    expect(toLatLng({ x: 1, y: 1 }, size)).toEqual([0, 533]);
  });

  it("converts back to the same relative point", () => {
    const [lat, lng] = toLatLng({ x: 0.25, y: 0.75 }, size);
    expect(fromLatLng(lat, lng, size)).toEqual({ x: 0.25, y: 0.75 });
  });

  it("keeps clicks next to the image on its edge", () => {
    expect(fromLatLng(900, -20, size)).toEqual({ x: 0, y: 0 });
    expect(fromLatLng(-5, 600, size)).toEqual({ x: 1, y: 1 });
  });

  it("is independent of the image resolution", () => {
    const sharper = { width: 5330, height: 8000 };
    const [lat, lng] = toLatLng({ x: 0.4, y: 0.6 }, sharper);
    expect(fromLatLng(lat, lng, sharper)).toEqual({ x: 0.4, y: 0.6 });
  });
});

describe("pointLabels", () => {
  const points = [
    { x: 0.1, y: 0.1 },
    { x: 0.2, y: 0.2, checkpoint: true },
    { x: 0.3, y: 0.3 },
    { x: 0.4, y: 0.4, checkpoint: true },
  ];

  it("names the start, numbered checkpoints, plain points and the finish", () => {
    expect(pointLabels(points, false)).toEqual(["Start", "Checkpoint 1", "Punt 3", "Finish"]);
  });

  it("has no separate finish on a loop", () => {
    expect(pointLabels(points, true)).toEqual([
      "Start/finish",
      "Checkpoint 1",
      "Punt 3",
      "Checkpoint 2",
    ]);
  });
});

describe("saveRouteSchema", () => {
  const base = {
    routeId: "6f1c5a7e-2b9d-4c3e-8f4a-1d2e3f4a5b6c",
    name: " Hoofdroute ",
    color: "gold",
    isLoop: false,
  };

  it("accepts a valid route and trims the name", () => {
    const parsed = saveRouteSchema.parse({ ...base, points: [{ x: 0.5, y: 0.5 }] });
    expect(parsed.name).toBe("Hoofdroute");
  });

  it("refuses points outside the map, unknown fields and unknown colours", () => {
    expect(saveRouteSchema.safeParse({ ...base, points: [{ x: 1.5, y: 0 }] }).success).toBe(false);
    expect(
      saveRouteSchema.safeParse({ ...base, points: [{ x: 0.1, y: 0.1, html: "<b>" }] }).success,
    ).toBe(false);
    expect(saveRouteSchema.safeParse({ ...base, color: "pink", points: [] }).success).toBe(false);
  });

  it("allows at most 300 points", () => {
    const points = Array.from({ length: 301 }, () => ({ x: 0.5, y: 0.5 }));
    expect(saveRouteSchema.safeParse({ ...base, points }).success).toBe(false);
  });
});
