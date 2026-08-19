import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LeafletMouseEvent } from "leaflet";
import { markerColor, type Severity, type Status } from "@/lib/civic";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  status: Status;
  severity: Severity;
  title: string;
  displayId: string;
  priority: number;
};

export type Hotspot = { lat: number; lng: number; count: number; label: string };

function ClickHandler({ onPick }: { onPick?: ((lat: number, lng: number) => void) | undefined }) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onPick?.(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom ?? map.getZoom());
  }, [lat, lng, zoom, map]);
  return null;
}

export default function MapCanvas({
  center,
  zoom = 13,
  points = [],
  hotspots = [],
  picked,
  onPick,
  onSelect,
  className = "h-[420px] w-full rounded-lg border",
  recenter = false,
}: {
  center: [number, number];
  zoom?: number;
  points?: MapPoint[];
  hotspots?: Hotspot[];
  picked?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  onSelect?: (id: string) => void;
  className?: string;
  recenter?: boolean;
}) {
  const key = useMemo(() => `${center[0].toFixed(3)}:${center[1].toFixed(3)}`, [center]);

  return (
    <div className={className}>
      <MapContainer
        key={recenter ? "static" : key}
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {recenter ? <Recenter lat={center[0]} lng={center[1]} zoom={zoom} /> : null}
        <ClickHandler onPick={onPick} />

        {hotspots.map((spot, index) => (
          <CircleMarker
            key={`hot-${index}`}
            center={[spot.lat, spot.lng]}
            radius={Math.min(18 + spot.count * 3, 42)}
            pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.12, weight: 1 }}
          >
            <Popup>
              <strong>Civic hotspot</strong>
              <br />
              {spot.count} open reports · {spot.label}
            </Popup>
          </CircleMarker>
        ))}

        {points.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={8}
            eventHandlers={{ click: () => onSelect?.(point.id) }}
            pathOptions={{
              color: markerColor(point.status, point.severity),
              fillColor: markerColor(point.status, point.severity),
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{point.displayId}</strong>
              <br />
              {point.title}
              <br />
              Priority {point.priority}
            </Popup>
          </CircleMarker>
        ))}

        {picked ? (
          <CircleMarker
            center={[picked.lat, picked.lng]}
            radius={10}
            pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.9, weight: 3 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
