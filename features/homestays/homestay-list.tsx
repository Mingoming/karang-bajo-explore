import Link from "next/link";

import {
  getHomestayStatusLabel,
  type HomestayListItem,
  type HomestayStatus,
} from "./model";

type HomestayListProps = {
  homestays: HomestayListItem[];
};

const STATUS_CLASSES: Record<HomestayStatus, string> = {
  draft: "border-amber-200 bg-amber-50 text-amber-900",
  published: "border-emerald-200 bg-emerald-50 text-emerald-900",
  archived: "border-slate-300 bg-slate-100 text-slate-700",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Makassar",
});

const PRICE_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

function formatPrice(price: number | null) {
  if (price === null) return "Belum tersedia";
  if (price === 0) return "Gratis";
  return `${PRICE_FORMATTER.format(price)} / malam`;
}

export function HomestayList({ homestays }: HomestayListProps) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-225 border-collapse text-left text-sm">
        <caption className="sr-only">
          Daftar homestay menurut urutan tampilan
        </caption>
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Homestay
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Harga
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Alamat
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
          {homestays.map((homestay) => (
            <tr key={homestay.id} className="text-slate-700">
              <th
                scope="row"
                className="px-4 py-4 font-semibold text-slate-950"
              >
                {homestay.name}
              </th>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[homestay.status]}`}
                >
                  {getHomestayStatusLabel(homestay.status)}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {formatPrice(homestay.pricePerNight)}
              </td>
              <td className="max-w-70 px-4 py-4">
                {homestay.address ?? "Belum tersedia"}
              </td>
              <td className="px-4 py-4 text-center tabular-nums">
                {homestay.displayOrder}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {DATE_FORMATTER.format(new Date(homestay.updatedAt))}
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/admin/homestay/${homestay.id}/edit`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-700 px-3 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Edit
                  <span className="sr-only"> {homestay.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
