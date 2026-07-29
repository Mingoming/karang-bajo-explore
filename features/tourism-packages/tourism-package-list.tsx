import Link from "next/link";
import {
  getTourismPackageStatusLabel,
  getTourismPackageTypeLabel,
  type TourismPackageListItem,
  type TourismPackageStatus,
} from "./model";

const DATE = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Makassar",
});
const STATUS: Record<TourismPackageStatus, string> = {
  draft: "border-amber-200 bg-amber-50 text-amber-900",
  published: "border-emerald-200 bg-emerald-50 text-emerald-900",
  archived: "border-slate-300 bg-slate-100 text-slate-700",
};
const PRICE = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function TourismPackageList({
  packages,
}: {
  packages: TourismPackageListItem[];
}) {
  return (
    <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-225 border-collapse text-left text-sm">
        <caption className="sr-only">
          Daftar paket wisata menurut urutan tampilan
        </caption>
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            {[
              "Nama paket",
              "Jenis",
              "Durasi",
              "Harga",
              "Status",
              "Urutan",
              "Diperbarui",
              "Aksi",
            ].map((heading) => (
              <th key={heading} scope="col" className="px-4 py-3 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {packages.map((item) => (
            <tr key={item.id}>
              <th
                scope="row"
                className="px-4 py-4 font-semibold text-slate-950"
              >
                {item.name}
                {item.is_featured ? (
                  <span className="ml-2 text-xs text-emerald-800">
                    Unggulan
                  </span>
                ) : null}
              </th>
              <td className="px-4 py-4">
                {getTourismPackageTypeLabel(item.package_type)}
              </td>
              <td className="px-4 py-4">
                {item.duration_value} {item.duration_unit}
              </td>
              <td className="px-4 py-4">
                {item.price === null
                  ? "Belum tersedia"
                  : item.price === 0
                    ? "Gratis"
                    : PRICE.format(item.price)}
              </td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS[item.status]}`}
                >
                  {getTourismPackageStatusLabel(item.status)}
                </span>
              </td>
              <td className="px-4 py-4 text-center tabular-nums">
                {item.display_order}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {DATE.format(new Date(item.updated_at))}
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/admin/paket-wisata/${item.id}/edit`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-emerald-700 px-3 font-semibold text-emerald-800"
                >
                  Edit<span className="sr-only"> {item.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
