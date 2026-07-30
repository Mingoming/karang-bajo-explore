import type { SignedPublicMedia } from "@/features/public-media/model";

export type PublishedDestinationRow = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  history: string | null;
  latitude: number;
  longitude: number;
  google_maps_url: string | null;
  opening_hours: string | null;
  entrance_fee: number | null;
  price_note: string | null;
  facilities: string[];
  contact_name: string | null;
  contact_phone: string | null;
  thumbnail_path: string | null;
  thumbnail_bucket: string | null;
  is_featured: boolean;
  display_order: number;
  published_at: string | null;
};

export type PublishedDestinationImageRow = {
  id: string;
  destination_id: string;
  storage_bucket: string;
  storage_path: string;
  caption: string | null;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
};

export type PublicDestinationImage = SignedPublicMedia;

export type PublicDestination = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  history: string | null;
  latitude: number;
  longitude: number;
  googleMapsUrl: string | null;
  openingHours: string | null;
  entranceFee: number | null;
  priceNote: string | null;
  facilities: string[];
  contactName: string | null;
  contactPhone: string | null;
  isFeatured: boolean;
  displayOrder: number;
  publishedAt: string | null;
  primaryImage: PublicDestinationImage | null;
  gallery: PublicDestinationImage[];
};

export type PublicDestinationCategory = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
};

export const PUBLIC_DESTINATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function orderPublishedDestinationImages(
  images: readonly PublishedDestinationImageRow[],
) {
  return [...images].sort(
    (left, right) =>
      left.display_order - right.display_order ||
      left.id.localeCompare(right.id),
  );
}

export function selectPrimaryDestinationImage(
  images: readonly PublishedDestinationImageRow[],
) {
  const ordered = orderPublishedDestinationImages(images);
  return ordered.find((image) => image.is_primary) ?? ordered[0] ?? null;
}

export function formatDestinationPrice(price: number | null) {
  if (price === null) return null;
  if (price === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}
