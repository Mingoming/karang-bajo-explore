import type { SignedPublicMedia } from "@/features/public-media/model";

export type PublicContentMedia = SignedPublicMedia;

export type PublicContentBase = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  eyebrow: string;
  isFeatured: boolean;
  displayOrder: number;
  publishedAt: string | null;
  primaryImage: PublicContentMedia | null;
  gallery: PublicContentMedia[];
};

export type PublicListResult<T> =
  { kind: "ready"; items: T[] } | { kind: "error" };

export type PublicDetailResult<T> =
  { kind: "ready"; item: T } | { kind: "not-found" } | { kind: "error" };

export const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function orderPublicMedia(images: readonly PublicContentMedia[]) {
  return [...images].sort(
    (left, right) =>
      left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
  );
}

export function attachPublicMedia<T extends PublicContentBase>(
  item: Omit<T, "primaryImage" | "gallery">,
  images: readonly PublicContentMedia[],
): T {
  const gallery = orderPublicMedia(images);
  return {
    ...item,
    gallery,
    primaryImage:
      gallery.find((image) => image.isPrimary) ?? gallery[0] ?? null,
  } as T;
}

export function formatRupiah(value: number | null) {
  if (value === null) return "Harga tidak tersedia";
  if (value === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
