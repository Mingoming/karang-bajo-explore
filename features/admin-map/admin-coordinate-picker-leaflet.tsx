"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { ADMIN_MAP_DEFAULT_CENTER, type AdminCoordinatePair } from "./model";

type AdminCoordinatePickerLeafletProps = {
  disabled: boolean;
  onPick: (latitude: number, longitude: number) => void;
  position: AdminCoordinatePair | null;
};

function AdminMapViewport({
  position,
}: {
  position: AdminCoordinatePair | null;
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize({ pan: false });

    const target = position ?? ADMIN_MAP_DEFAULT_CENTER;

    map.setView([target.latitude, target.longitude], position ? 17 : 14, {
      animate: false,
    });
  }, [map, position]);

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function AdminMapClickHandler({
  disabled,
  onPick,
}: Pick<AdminCoordinatePickerLeafletProps, "disabled" | "onPick">) {
  useMapEvents({
    click(event) {
      if (!disabled) {
        onPick(event.latlng.lat, event.latlng.lng);
      }
    },
  });

  return null;
}

export default function AdminCoordinatePickerLeaflet({
  disabled,
  onPick,
  position,
}: AdminCoordinatePickerLeafletProps) {
  const [tileFailed, setTileFailed] = useState(false);
  const center = position ?? ADMIN_MAP_DEFAULT_CENTER;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 ${
        disabled ? "pointer-events-none opacity-70" : ""
      }`}
    >
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={position ? 17 : 14}
        scrollWheelZoom={false}
        className="h-[22rem] w-full"
        aria-label="Pilih koordinat lokasi pada peta"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => {
              setTileFailed(true);
            },
          }}
        />

        <AdminMapViewport position={position} />

        <AdminMapClickHandler disabled={disabled} onPick={onPick} />

        {position ? (
          <CircleMarker
            center={[position.latitude, position.longitude]}
            radius={9}
            pathOptions={{
              color: "#064e3b",
              fillColor: "#10b981",
              fillOpacity: 0.9,
              weight: 3,
            }}
          />
        ) : null}
      </MapContainer>

      {tileFailed ? (
        <div
          role="alert"
          className="absolute inset-x-4 top-4 z-[1000] rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950 shadow-lg"
        >
          Peta dasar tidak dapat dimuat. Koordinat tetap dapat dimasukkan secara
          manual.
        </div>
      ) : null}
    </div>
  );
}
