import Link from "next/link";

import {
  getCulturalEventStatusLabel,
  type CulturalEventListItem,
  type CulturalEventStatus,
} from "./model";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Makassar",
});
const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "Asia/Makassar",
});
const STATUS_CLASSES: Record<CulturalEventStatus, string> = {
  draft: "border-amber-200 bg-amber-50 text-amber-900",
  published: "border-emerald-200 bg-emerald-50 text-emerald-900",
  archived: "border-slate-300 bg-slate-100 text-slate-700",
};

function eventSchedule(event: CulturalEventListItem) {
  if (!event.start_at) {
    return event.date_note
      ? `Belum dikonfirmasi — ${event.date_note}`
      : "Jadwal belum diisi";
  }
  const date = new Date(event.start_at);
  return event.all_day
    ? `${DATE_FORMATTER.format(date)} — sepanjang hari`
    : `${DATE_TIME_FORMATTER.format(date)} WITA`;
}

export function CulturalEventList({
  events,
}: {
  events: CulturalEventListItem[];
}) {
  return (
    <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-225 border-collapse text-left text-sm">
        <caption className="sr-only">
          Daftar acara budaya menurut tanggal mulai
        </caption>
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Acara
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Jadwal
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Lokasi
            </th>
            <th scope="col" className="px-4 py-3 text-center font-semibold">
              Unggulan
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Diperbarui
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {events.map((event) => (
            <tr key={event.id} className="text-slate-700">
              <th
                scope="row"
                className="px-4 py-4 font-semibold text-slate-950"
              >
                {event.title}
              </th>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[event.status]}`}
                >
                  {getCulturalEventStatusLabel(event.status)}
                </span>
              </td>
              <td className="max-w-80 px-4 py-4">{eventSchedule(event)}</td>
              <td className="max-w-60 px-4 py-4">
                {event.location_name ?? "Belum tersedia"}
              </td>
              <td className="px-4 py-4 text-center">
                {event.is_featured ? "Ya" : "Tidak"}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {DATE_TIME_FORMATTER.format(new Date(event.updated_at))} WITA
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/admin/acara-budaya/${event.id}/edit`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-700 px-3 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Edit<span className="sr-only"> {event.title}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
