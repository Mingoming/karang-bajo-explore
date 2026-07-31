"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

import { formatAdminCoordinate, getAdminCoordinatePair } from "./model";

const AdminCoordinatePickerLeaflet = dynamic(
  () => import("./admin-coordinate-picker-leaflet"),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 p-6 text-center text-sm text-slate-600"
      >
        Memuat pemilih lokasi…
      </div>
    ),
  },
);

type AdminCoordinatePickerProps = {
  disabled?: boolean;
  latitudeError?: string;
  latitudeValue: string;
  longitudeError?: string;
  longitudeValue: string;
  required?: boolean;
};

const inputClasses =
  "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100";

export function AdminCoordinatePicker({
  disabled = false,
  latitudeError,
  latitudeValue,
  longitudeError,
  longitudeValue,
  required = false,
}: AdminCoordinatePickerProps) {
  const [latitude, setLatitude] = useState(latitudeValue);
  const [longitude, setLongitude] = useState(longitudeValue);

  const position = useMemo(
    () => getAdminCoordinatePair(latitude, longitude),
    [latitude, longitude],
  );

  const handlePick = useCallback(
    (nextLatitude: number, nextLongitude: number) => {
      setLatitude(formatAdminCoordinate(nextLatitude));
      setLongitude(formatAdminCoordinate(nextLongitude));
    },
    [],
  );

  function clearCoordinates() {
    setLatitude("");
    setLongitude("");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm leading-6 text-slate-600">
          Klik titik pada peta atau isi latitude dan longitude secara manual.
          Perubahan pada salah satu metode akan disinkronkan dengan metode
          lainnya.
        </p>

        <p
          aria-live="polite"
          className="mt-2 text-sm font-medium text-emerald-800"
        >
          {position
            ? `Koordinat terpilih: ${position.latitude}, ${position.longitude}`
            : "Belum ada pasangan koordinat valid yang dipilih."}
        </p>
      </div>

      <AdminCoordinatePickerLeaflet
        disabled={disabled}
        position={position}
        onPick={handlePick}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="latitude"
            className="block text-sm font-semibold text-slate-800"
          >
            Latitude{" "}
            {required ? (
              <>
                <span aria-hidden="true" className="text-red-700">
                  *
                </span>
                <span className="sr-only"> (wajib)</span>
              </>
            ) : null}
          </label>

          <input
            id="latitude"
            name="latitude"
            type="number"
            inputMode="decimal"
            min={-90}
            max={90}
            step="any"
            required={required}
            disabled={disabled}
            value={latitude}
            onChange={(event) => {
              setLatitude(event.target.value);
            }}
            aria-invalid={Boolean(latitudeError)}
            aria-describedby="latitude-message"
            className={inputClasses}
          />

          <p
            id="latitude-message"
            className={`mt-2 text-sm leading-6 ${
              latitudeError ? "font-medium text-red-700" : "text-slate-500"
            }`}
          >
            {latitudeError ?? "Nilai antara -90 dan 90."}
          </p>
        </div>

        <div>
          <label
            htmlFor="longitude"
            className="block text-sm font-semibold text-slate-800"
          >
            Longitude{" "}
            {required ? (
              <>
                <span aria-hidden="true" className="text-red-700">
                  *
                </span>
                <span className="sr-only"> (wajib)</span>
              </>
            ) : null}
          </label>

          <input
            id="longitude"
            name="longitude"
            type="number"
            inputMode="decimal"
            min={-180}
            max={180}
            step="any"
            required={required}
            disabled={disabled}
            value={longitude}
            onChange={(event) => {
              setLongitude(event.target.value);
            }}
            aria-invalid={Boolean(longitudeError)}
            aria-describedby="longitude-message"
            className={inputClasses}
          />

          <p
            id="longitude-message"
            className={`mt-2 text-sm leading-6 ${
              longitudeError ? "font-medium text-red-700" : "text-slate-500"
            }`}
          >
            {longitudeError ?? "Nilai antara -180 dan 180."}
          </p>
        </div>
      </div>

      {!required ? (
        <button
          type="button"
          disabled={disabled || (!latitude && !longitude)}
          onClick={clearCoordinates}
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Kosongkan koordinat
        </button>
      ) : null}
    </div>
  );
}
