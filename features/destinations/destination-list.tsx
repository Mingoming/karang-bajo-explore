import Link from "next/link";

import {
  getDestinationStatusLabel,
  type DestinationListItem,
  type DestinationStatus,
} from "./model";

type DestinationListProps = {
  destinations: DestinationListItem[];
};

const STATUS_CLASSES: Record<DestinationStatus, string> = {
  draft: "border-amber-200 bg-amber-50 text-amber-900",
  published: "border-emerald-200 bg-emerald-50 text-emerald-900",
  archived: "border-slate-300 bg-slate-100 text-slate-700",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Makassar",
});

export function DestinationList({ destinations }: DestinationListProps) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-180 border-collapse text-left text-sm">
        <caption className="sr-only">
          Daftar destinasi menurut urutan tampilan
        </caption>
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Destinasi
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Kategori
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-center font-semibold">
              Urutan
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
          {destinations.map((destination) => (
            <tr key={destination.id} className="text-slate-700">
              <th
                scope="row"
                className="px-4 py-4 font-semibold text-slate-950"
              >
                {destination.name}
              </th>
              <td className="px-4 py-4">{destination.categoryName}</td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[destination.status]}`}
                >
                  {getDestinationStatusLabel(destination.status)}
                </span>
              </td>
              <td className="px-4 py-4 text-center tabular-nums">
                {destination.displayOrder}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {DATE_FORMATTER.format(new Date(destination.updatedAt))}
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/admin/destinasi/${destination.id}/edit`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-700 px-3 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Edit
                  <span className="sr-only"> {destination.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
