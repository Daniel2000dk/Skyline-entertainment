// Map coordinates are stored relative to the map image: x and y from 0 to 1,
// measured from the top-left corner. Leaflet (CRS.Simple) works in image
// pixels with the y axis pointing up, so lat = (1 - y) * height, lng = x * width.

export type MapPoint = { x: number; y: number; checkpoint?: boolean };
export type MapSize = { width: number; height: number };

/** Canvas used when no map image is set yet (the GTA V map is roughly 2:3). */
export const GRID_SIZE: MapSize = { width: 1000, height: 1500 };

export const ROUTE_COLORS = {
  gold: { label: "Goud", hex: "#d4af37" },
  blue: { label: "Blauw", hex: "#60a5fa" },
  green: { label: "Groen", hex: "#4ade80" },
  red: { label: "Rood", hex: "#f87171" },
  white: { label: "Wit", hex: "#f5f5f5" },
} as const;

export type RouteColor = keyof typeof ROUTE_COLORS;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const round = (value: number) => Math.round(value * 100_000) / 100_000;

export function toLatLng(point: { x: number; y: number }, size: MapSize): [number, number] {
  return [(1 - point.y) * size.height, point.x * size.width];
}

export function fromLatLng(lat: number, lng: number, size: MapSize): { x: number; y: number } {
  return { x: round(clamp(lng / size.width)), y: round(clamp(1 - lat / size.height)) };
}

/** Start, numbered checkpoints, plain points and the finish, in route order. */
export function pointLabels(points: MapPoint[], isLoop: boolean): string[] {
  let checkpoint = 0;
  return points.map((point, index) => {
    if (index === 0) return isLoop ? "Start/finish" : "Start";
    if (!isLoop && index === points.length - 1) return "Finish";
    if (point.checkpoint) return `Checkpoint ${++checkpoint}`;
    return `Punt ${index + 1}`;
  });
}
