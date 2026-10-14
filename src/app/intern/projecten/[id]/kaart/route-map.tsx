"use client";

import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { MapPinIcon, PencilIcon, PlusIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { FormField, SelectField, TextareaField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import {
  GRID_SIZE,
  ROUTE_COLORS,
  fromLatLng,
  pointLabels,
  toLatLng,
  type MapSize,
  type RouteColor,
} from "@/lib/map/coords";
import type { MapMarker, MapRoute } from "@/lib/map/queries";
import { cn } from "@/lib/utils";
import {
  createMarker,
  createRoute,
  deleteMarker,
  deleteRoute,
  saveRoute,
  type MapActionResult,
} from "./actions";

type Leaflet = typeof import("leaflet");
type Draft = Omit<MapRoute, "id"> & { routeId: string };
type Message = { tone: "info" | "error"; text: string };

const MAX_POINTS = 300;
const COLOR_OPTIONS = Object.entries(ROUTE_COLORS).map(([value, { label }]) => ({ value, label }));

function imageSize(url: string): Promise<MapSize> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = url;
  });
}

/** Plain grid to draw on while no map image has been set. */
function gridImage({ width, height }: MapSize): string {
  const lines: string[] = [];
  for (let x = 0; x <= width; x += 100) lines.push(`<path d="M${x} 0V${height}"/>`);
  for (let y = 0; y <= height; y += 100) lines.push(`<path d="M0 ${y}H${width}"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#101820"/><g stroke="#24313d" stroke-width="2">${lines.join("")}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Text-only element (user input never becomes HTML). */
function textElement(tag: "p" | "strong" | "span", text: string, className?: string) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function icon(L: Leaflet, html: string, size: number) {
  return L.divIcon({ className: "map-icon", html, iconSize: [size, size] });
}

export function RouteMap({
  projectId,
  imageUrl,
  routes,
  markers,
  canEdit,
}: {
  projectId: string;
  imageUrl: string | null;
  routes: MapRoute[];
  markers: MapMarker[];
  canEdit: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{
    L: Leaflet;
    map: LeafletMap;
    layers: LayerGroup;
    size: MapSize;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(routes[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [placingMarker, setPlacingMarker] = useState(false);
  const [pendingMarker, setPendingMarker] = useState<{ x: number; y: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<RouteColor>("gold");
  const [markerLabel, setMarkerLabel] = useState("");
  const [markerNote, setMarkerNote] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = routes.find((route) => route.id === selectedId) ?? null;

  const handleMapClick = useEffectEvent((point: { x: number; y: number }) => {
    if (draft) {
      if (draft.points.length >= MAX_POINTS) {
        setMessage({ tone: "error", text: `Een route heeft maximaal ${MAX_POINTS} punten.` });
        return;
      }
      setDraft({ ...draft, points: [...draft.points, point] });
    } else if (placingMarker) {
      setPendingMarker(point);
      setPlacingMarker(false);
    }
  });

  // Create the map once (Leaflet needs the browser, so it is loaded here).
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    (async () => {
      const L = (await import("leaflet")).default;
      const size = imageUrl ? await imageSize(imageUrl).catch(() => null) : null;
      if (cancelled || !containerRef.current) return;
      if (imageUrl && !size) setImageFailed(true);
      const mapSize = size ?? GRID_SIZE;

      map = L.map(containerRef.current, {
        crs: L.CRS.Simple,
        attributionControl: false,
        zoomSnap: 0.25,
        minZoom: -4,
        maxZoom: 3,
      });
      const bounds = L.latLngBounds([0, 0], [mapSize.height, mapSize.width]);
      L.imageOverlay(size && imageUrl ? imageUrl : gridImage(mapSize), bounds).addTo(map);
      map.fitBounds(bounds);
      map.setMinZoom(map.getZoom() - 0.5);
      map.setMaxBounds(bounds.pad(0.25));
      map.on("click", (event) =>
        handleMapClick(fromLatLng(event.latlng.lat, event.latlng.lng, mapSize)),
      );
      leafletRef.current = { L, map, layers: L.layerGroup().addTo(map), size: mapSize };
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map?.remove();
      leafletRef.current = null;
    };
  }, [imageUrl]);

  // Redraw routes and markers whenever the data or the draft changes.
  useEffect(() => {
    const leaflet = leafletRef.current;
    if (!ready || !leaflet) return;
    const { L, layers, size } = leaflet;
    layers.clearLayers();

    const drawRoute = (route: Omit<MapRoute, "id">, routeId: string, editing: boolean) => {
      const hex = ROUTE_COLORS[route.color].hex;
      const latLngs = route.points.map((point) => toLatLng(point, size));
      if (route.isLoop && latLngs.length > 2) latLngs.push(latLngs[0]!);
      const dimmed = selectedId !== null && selectedId !== routeId && !editing;
      const line = L.polyline(latLngs, {
        color: hex,
        weight: editing || selectedId === routeId ? 5 : 3,
        opacity: dimmed ? 0.45 : 0.95,
        interactive: !editing && !draft,
        bubblingMouseEvents: false,
      }).addTo(layers);
      if (!editing && !draft) line.on("click", () => setSelectedId(routeId));

      const labels = pointLabels(route.points, route.isLoop);
      route.points.forEach((point, index) => {
        const last = index === route.points.length - 1;
        const kind =
          index === 0 ? "start" : !route.isLoop && last ? "finish" : point.checkpoint ? "cp" : "";
        if (!editing && !kind) return;
        const html =
          kind === "start"
            ? '<span class="map-dot map-dot--start">S</span>'
            : kind === "finish"
              ? '<span class="map-dot map-dot--finish">F</span>'
              : kind === "cp"
                ? `<span class="map-dot map-dot--checkpoint" style="background:${hex}"></span>`
                : `<span class="map-dot" style="background:${hex}"></span>`;
        const marker = L.marker(toLatLng(point, size), {
          icon: icon(L, html, kind ? 20 : 14),
          draggable: editing,
          keyboard: false,
          interactive: true,
          opacity: dimmed ? 0.6 : 1,
        }).addTo(layers);
        marker.bindTooltip(textElement("span", `${route.name}: ${labels[index]}`), {
          className: "map-tooltip",
          direction: "top",
        });
        if (!editing) return;

        marker.on("dragend", () => {
          const moved = marker.getLatLng();
          const next = fromLatLng(moved.lat, moved.lng, size);
          setDraft(
            (current) =>
              current && {
                ...current,
                points: current.points.map((p, i) => (i === index ? { ...p, ...next } : p)),
              },
          );
        });
        const box = document.createElement("div");
        box.className = "map-popup";
        box.append(textElement("strong", labels[index]!));
        if (index > 0 && !(last && !route.isLoop)) {
          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.textContent = point.checkpoint ? "Geen checkpoint" : "Maak checkpoint";
          toggle.onclick = () => {
            marker.closePopup();
            setDraft((current) => current && toggleCheckpoint(current, index));
          };
          box.append(toggle);
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Punt verwijderen";
        remove.onclick = () => {
          marker.closePopup();
          setDraft((current) => current && removePoint(current, index));
        };
        box.append(remove);
        marker.bindPopup(box);
      });
    };

    for (const route of routes) {
      if (route.id !== draft?.routeId) drawRoute(route, route.id, false);
    }
    if (draft) drawRoute(draft, draft.routeId, true);

    for (const item of markers) {
      const pin = L.marker(toLatLng(item, size), {
        icon: icon(L, '<span class="map-pin"></span>', 22),
        keyboard: false,
      }).addTo(layers);
      pin.bindTooltip(textElement("span", item.label), {
        className: "map-tooltip",
        direction: "top",
      });
      const box = document.createElement("div");
      box.className = "map-popup";
      box.append(textElement("strong", item.label));
      if (item.note) box.append(textElement("p", item.note));
      pin.bindPopup(box);
    }
    if (pendingMarker) {
      L.marker(toLatLng(pendingMarker, size), {
        icon: icon(L, '<span class="map-pin map-pin--pending"></span>', 22),
        interactive: false,
      }).addTo(layers);
    }
  }, [ready, routes, markers, draft, selectedId, pendingMarker]);

  function focusRoute(route: MapRoute) {
    setSelectedId(route.id);
    const leaflet = leafletRef.current;
    if (!leaflet || route.points.length < 2) return;
    const bounds = leaflet.L.latLngBounds(route.points.map((p) => toLatLng(p, leaflet.size)));
    leaflet.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 2 });
  }

  function run(
    action: () => Promise<MapActionResult>,
    onSuccess: (id?: string) => void,
    text: string,
  ) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      onSuccess(result.id);
      setMessage({ tone: "info", text });
    });
  }

  function addRoute(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    run(
      () => createRoute({ projectId, name, color: newColor }),
      (id) => {
        if (!id) return;
        setSelectedId(id);
        setDraft({ routeId: id, name, color: newColor, isLoop: false, points: [] });
        setNewName("");
        setPlacingMarker(false);
        setPendingMarker(null);
      },
      "Route toegevoegd. Klik op de kaart om punten te zetten.",
    );
  }

  function saveDraft() {
    if (!draft) return;
    const { routeId, name, color, isLoop, points } = draft;
    run(
      () => saveRoute({ routeId, name, color, isLoop, points }),
      () => setDraft(null),
      "Route opgeslagen.",
    );
  }

  function removeRoute() {
    if (!selected) return;
    run(
      () => deleteRoute({ id: selected.id }),
      () => {
        setDraft(null);
        setSelectedId(null);
        setConfirmDelete(false);
      },
      "Route verwijderd.",
    );
  }

  function saveMarker(event: React.FormEvent) {
    event.preventDefault();
    if (!pendingMarker) return;
    run(
      () => createMarker({ projectId, label: markerLabel, note: markerNote, ...pendingMarker }),
      () => {
        setPendingMarker(null);
        setMarkerLabel("");
        setMarkerNote("");
      },
      "Marker opgeslagen.",
    );
  }

  const labels = draft ? pointLabels(draft.points, draft.isLoop) : [];
  const drawing = Boolean(draft) || placingMarker;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-2">
        {(!imageUrl || imageFailed) && (
          <p className="text-sm text-muted-foreground">
            {imageFailed
              ? "De kaartafbeelding kon niet worden geladen; je ziet een raster."
              : "Er is nog geen kaartafbeelding ingesteld; je ziet een raster."}
          </p>
        )}
        {/* Leaflet adds its own classes to the inner element, so React must never
            re-render its className: the changing state lives on the wrapper. */}
        <div className={cn(drawing && "map-drawing")}>
          <div
            ref={containerRef}
            aria-label="GTA V-kaart"
            role="region"
            className="map-canvas h-[65vh] min-h-[22rem] w-full overflow-hidden rounded-xl border"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Scrollen of knijpen om te zoomen, slepen om te verschuiven.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <p role="status" aria-live="polite" className="sr-only">
          {message?.text}
        </p>
        {message && (
          <p
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              message.tone === "error"
                ? "border-destructive/50 text-destructive"
                : "text-foreground",
            )}
          >
            {message.text}
          </p>
        )}

        {draft ? (
          <section aria-labelledby="route-bewerken" className="flex flex-col gap-4">
            <h2 id="route-bewerken" className="text-lg font-semibold">
              Route bewerken
            </h2>
            <p className="text-sm text-muted-foreground">
              Klik op de kaart om een punt toe te voegen. Sleep een punt om het te verplaatsen of
              klik erop om het een checkpoint te maken of te verwijderen.
            </p>
            <FormField
              id="route-naam"
              label="Naam"
              value={draft.name}
              maxLength={80}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
            <SelectField
              id="route-kleur"
              label="Kleur"
              options={COLOR_OPTIONS}
              value={draft.color}
              onChange={(event) => setDraft({ ...draft, color: event.target.value as RouteColor })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={draft.isLoop}
                onChange={(event) => setDraft({ ...draft, isLoop: event.target.checked })}
              />
              Rondgang (de finish is de start)
            </label>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Punten ({draft.points.length})</h3>
              {draft.points.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nog geen punten.</p>
              ) : (
                <ol className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
                  {draft.points.map((point, index) => {
                    const label = labels[index]!;
                    const fixed =
                      index === 0 || (!draft.isLoop && index === draft.points.length - 1);
                    return (
                      <li
                        key={`${index}-${point.x}-${point.y}`}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1 text-sm"
                      >
                        <span>{label}</span>
                        <span className="flex items-center gap-2">
                          {!fixed && (
                            <label className="flex items-center gap-1 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                className="size-3.5 accent-primary"
                                checked={Boolean(point.checkpoint)}
                                onChange={() => setDraft(toggleCheckpoint(draft, index))}
                                aria-label={`${label}: checkpoint`}
                              />
                              Checkpoint
                            </label>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${label} verwijderen`}
                            onClick={() => setDraft(removePoint(draft, index))}
                          >
                            <Trash2Icon aria-hidden="true" />
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={saveDraft} disabled={pending}>
                Route opslaan
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={draft.points.length === 0}
                onClick={() => setDraft({ ...draft, points: draft.points.slice(0, -1) })}
              >
                <Undo2Icon aria-hidden="true" />
                Laatste punt weg
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                Annuleren
              </Button>
            </div>
          </section>
        ) : (
          <section aria-labelledby="routes" className="flex flex-col gap-3">
            <h2 id="routes" className="text-lg font-semibold">
              Routes
            </h2>
            {routes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen routes.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {routes.map((route) => (
                  <li key={route.id}>
                    <button
                      type="button"
                      aria-pressed={route.id === selectedId}
                      aria-label={`${route.name}, ${route.points.length} ${route.points.length === 1 ? "punt" : "punten"}`}
                      onClick={() => focusRoute(route)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                        route.id === selectedId && "bg-accent",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="size-3 shrink-0 rounded-full"
                        style={{ background: ROUTE_COLORS[route.color].hex }}
                      />
                      <span className="flex-1 font-medium">{route.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {route.points.length} {route.points.length === 1 ? "punt" : "punten"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {canEdit && selected && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPlacingMarker(false);
                    setPendingMarker(null);
                    setConfirmDelete(false);
                    setDraft({
                      routeId: selected.id,
                      name: selected.name,
                      color: selected.color,
                      isLoop: selected.isLoop,
                      points: selected.points,
                    });
                  }}
                >
                  <PencilIcon aria-hidden="true" />
                  {selected.name} bewerken
                </Button>
                {confirmDelete ? (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={removeRoute}
                      disabled={pending}
                    >
                      Ja, route verwijderen
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                      Nee
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
                    <Trash2Icon aria-hidden="true" />
                    Verwijderen
                  </Button>
                )}
              </div>
            )}

            {canEdit && (
              <form onSubmit={addRoute} className="flex flex-col gap-3 rounded-xl border p-3">
                <FormField
                  id="nieuwe-route"
                  label="Naam van de route"
                  value={newName}
                  maxLength={80}
                  required
                  onChange={(event) => setNewName(event.target.value)}
                />
                <SelectField
                  id="nieuwe-route-kleur"
                  label="Kleur"
                  options={COLOR_OPTIONS}
                  value={newColor}
                  onChange={(event) => setNewColor(event.target.value as RouteColor)}
                />
                <Button type="submit" disabled={pending}>
                  <PlusIcon aria-hidden="true" />
                  Route toevoegen
                </Button>
              </form>
            )}
          </section>
        )}

        <section aria-labelledby="markers" className="flex flex-col gap-3">
          <h2 id="markers" className="text-lg font-semibold">
            Markers
          </h2>
          {markers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen markers.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {markers.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium">{item.label}</span>
                    {item.note && <span className="block text-muted-foreground">{item.note}</span>}
                  </span>
                  {canEdit && !draft && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Marker ${item.label} verwijderen`}
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => deleteMarker({ id: item.id }),
                          () => {},
                          "Marker verwijderd.",
                        )
                      }
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canEdit && !draft && !pendingMarker && (
            <Button
              type="button"
              variant="outline"
              aria-pressed={placingMarker}
              onClick={() => setPlacingMarker(!placingMarker)}
            >
              <MapPinIcon aria-hidden="true" />
              {placingMarker ? "Klik op de kaart… (annuleren)" : "Marker plaatsen"}
            </Button>
          )}
          {pendingMarker && (
            <form onSubmit={saveMarker} className="flex flex-col gap-3 rounded-xl border p-3">
              <FormField
                id="marker-naam"
                label="Naam van de marker"
                value={markerLabel}
                maxLength={80}
                required
                onChange={(event) => setMarkerLabel(event.target.value)}
              />
              <TextareaField
                id="marker-notitie"
                label="Notitie (optioneel)"
                value={markerNote}
                maxLength={1000}
                onChange={(event) => setMarkerNote(event.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  Marker opslaan
                </Button>
                <Button type="button" variant="ghost" onClick={() => setPendingMarker(null)}>
                  Annuleren
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function toggleCheckpoint(draft: Draft, index: number): Draft {
  return {
    ...draft,
    points: draft.points.map((point, i) =>
      i === index
        ? { x: point.x, y: point.y, ...(point.checkpoint ? {} : { checkpoint: true }) }
        : point,
    ),
  };
}

function removePoint(draft: Draft, index: number): Draft {
  return { ...draft, points: draft.points.filter((_, i) => i !== index) };
}
