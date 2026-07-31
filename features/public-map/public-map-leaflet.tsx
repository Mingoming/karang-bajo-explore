"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import {
  getPublicMapNavigationUrl,
  type PublicMapItem,
  type PublicMapMarker,
} from "./model";

type PublicMapLeafletProps = {
  markers: PublicMapMarker[];
};

type MarkerStyle = {
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
};

const MARKER_STYLES = {
  alam: {
    color: "#14532d",
    fillColor: "#22c55e",
    fillOpacity: 0.85,
    weight: 2,
  },
  budaya: {
    color: "#78350f",
    fillColor: "#f59e0b",
    fillOpacity: 0.85,
    weight: 2,
  },
  religi: {
    color: "#581c87",
    fillColor: "#a855f7",
    fillOpacity: 0.85,
    weight: 2,
  },
  "traditional-house": {
    color: "#431407",
    fillColor: "#c2410c",
    fillOpacity: 0.85,
    weight: 2,
  },
  homestay: {
    color: "#1e3a8a",
    fillColor: "#3b82f6",
    fillOpacity: 0.85,
    weight: 2,
  },
  umkm: {
    color: "#7c2d12",
    fillColor: "#fb923c",
    fillOpacity: 0.85,
    weight: 2,
  },
  default: {
    color: "#064e3b",
    fillColor: "#10b981",
    fillOpacity: 0.85,
    weight: 2,
  },
} satisfies Record<string, MarkerStyle>;

function getMarkerStyle(marker: PublicMapMarker): MarkerStyle {
  const primaryItem = marker.items[0];

  if (!primaryItem) {
    return MARKER_STYLES.default;
  }

  if (primaryItem.entityType === "destination") {
    return (
      MARKER_STYLES[primaryItem.categorySlug as keyof typeof MARKER_STYLES] ??
      MARKER_STYLES.default
    );
  }

  return MARKER_STYLES[primaryItem.entityType] ?? MARKER_STYLES.default;
}

function getEntityLabel(item: PublicMapItem) {
  switch (item.entityType) {
    case "destination":
      return item.categoryName ?? "Destinasi";
    case "traditional-house":
      return "Rumah Adat";
    case "homestay":
      return "Homestay";
    case "umkm":
      return item.categoryName ?? "UMKM";
  }
}

function MapViewport({ markers }: PublicMapLeafletProps) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize({ pan: false });

    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 16, {
        animate: false,
      });

      return;
    }

    map.fitBounds(
      markers.map(
        (marker) => [marker.latitude, marker.longitude] as [number, number],
      ),
      {
        padding: [32, 32],
        maxZoom: 16,
        animate: false,
      },
    );
  }, [map, markers]);

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

export default function PublicMapLeaflet({ markers }: PublicMapLeafletProps) {
  const [tileFailed, setTileFailed] = useState(false);
  const initialMarker = markers[0];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
      <MapContainer
        center={[initialMarker.latitude, initialMarker.longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-[28rem] w-full sm:h-[36rem]"
        aria-label="Peta wisata interaktif Desa Karang Bajo"
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

        <MapViewport markers={markers} />

        {markers.map((marker) => (
          <CircleMarker
            key={marker.key}
            center={[marker.latitude, marker.longitude]}
            radius={marker.items.length > 1 ? 12 : 9}
            pathOptions={getMarkerStyle(marker)}
          >
            <Popup minWidth={260} maxWidth={320}>
              <div className="space-y-4">
                {marker.items.length > 1 ? (
                  <p className="font-bold text-slate-900">
                    {marker.items.length} lokasi pada titik ini
                  </p>
                ) : null}

                <div className="divide-y divide-slate-200">
                  {marker.items.map((item) => (
                    <article
                      key={`${item.entityType}:${item.id}`}
                      className="space-y-2 py-3 first:pt-0 last:pb-0"
                    >
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt=""
                          width={280}
                          height={158}
                          unoptimized
                          className="aspect-video w-full rounded-xl object-cover"
                        />
                      ) : null}

                      <p className="text-xs font-bold tracking-[0.12em] text-emerald-800 uppercase">
                        {getEntityLabel(item)}
                      </p>

                      <h2 className="text-base font-bold text-slate-950">
                        {item.title}
                      </h2>

                      {item.summary ? (
                        <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                          {item.summary}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                          href={item.href}
                          className="inline-flex min-h-10 items-center rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white"
                        >
                          Lihat detail
                        </Link>

                        <a
                          href={getPublicMapNavigationUrl(item)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-10 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
                        >
                          Buka Google Maps
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {tileFailed ? (
        <div
          role="alert"
          className="absolute inset-x-4 top-4 z-[1000] rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950 shadow-lg"
        >
          Peta dasar tidak dapat dimuat. Gunakan daftar lokasi di bawah untuk
          membuka detail atau navigasi.
        </div>
      ) : null}
    </div>
  );
}
