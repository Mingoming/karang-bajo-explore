import { getPublishedDestinations } from "@/features/public-destinations/data";
import type { PublicDestination } from "@/features/public-destinations/model";
import {
  getPublishedHomestays,
  getPublishedTraditionalHouses,
  getPublishedUmkms,
  type PublicHomestay,
  type PublicTraditionalHouse,
  type PublicUmkm,
} from "@/features/public-domains/data";

import {
  buildPublicMapMarkers,
  createPublicMapItem,
  type PublicMapItem,
  type PublicMapMarker,
} from "./model";

export type PublicMapDestinationCategory = Readonly<{
  slug: string;
  name: string;
}>;

export type PublicMapDataResult =
  | {
      kind: "ready";
      items: PublicMapItem[];
      markers: PublicMapMarker[];
      destinationCategories: PublicMapDestinationCategory[];
    }
  | {
      kind: "error";
    };

function mapDestination(
  destination: PublicDestination,
  categorySlug: string | null,
) {
  return createPublicMapItem({
    id: destination.id,
    entityType: "destination",
    title: destination.name,
    slug: destination.slug,
    href: `/destinasi/${destination.slug}`,
    categorySlug,
    categoryName: destination.categoryName,
    summary: destination.summary,
    latitude: destination.latitude,
    longitude: destination.longitude,
    googleMapsUrl: destination.googleMapsUrl,
    thumbnailUrl: destination.primaryImage?.signedUrl ?? null,
  });
}

function mapHomestay(homestay: PublicHomestay) {
  return createPublicMapItem({
    id: homestay.id,
    entityType: "homestay",
    title: homestay.title,
    slug: homestay.slug,
    href: `/homestay/${homestay.slug}`,
    categorySlug: null,
    categoryName: null,
    summary: homestay.summary,
    latitude: homestay.latitude,
    longitude: homestay.longitude,
    googleMapsUrl: homestay.googleMapsUrl,
    thumbnailUrl: homestay.primaryImage?.signedUrl ?? null,
  });
}

function mapUmkm(umkm: PublicUmkm) {
  return createPublicMapItem({
    id: umkm.id,
    entityType: "umkm",
    title: umkm.title,
    slug: umkm.slug,
    href: `/umkm/${umkm.slug}`,
    categorySlug: null,
    categoryName: umkm.category,
    summary: umkm.summary,
    latitude: umkm.latitude,
    longitude: umkm.longitude,
    googleMapsUrl: umkm.googleMapsUrl,
    thumbnailUrl: umkm.primaryImage?.signedUrl ?? null,
  });
}

function mapTraditionalHouse(house: PublicTraditionalHouse) {
  return createPublicMapItem({
    id: house.id,
    entityType: "traditional-house",
    title: house.title,
    slug: house.slug,
    href: `/rumah-adat/${house.slug}`,
    categorySlug: null,
    categoryName: null,
    summary: house.summary,
    latitude: house.latitude,
    longitude: house.longitude,
    googleMapsUrl: house.googleMapsUrl,
    thumbnailUrl: house.primaryImage?.signedUrl ?? null,
  });
}

function isPublicMapItem(item: PublicMapItem | null): item is PublicMapItem {
  return item !== null;
}

export async function getPublishedPublicMapData(): Promise<PublicMapDataResult> {
  const [
    destinationResult,
    homestayResult,
    umkmResult,
    traditionalHouseResult,
  ] = await Promise.all([
    getPublishedDestinations(),
    getPublishedHomestays(),
    getPublishedUmkms(),
    getPublishedTraditionalHouses(),
  ]);

  if (
    destinationResult.kind === "error" ||
    homestayResult.kind === "error" ||
    umkmResult.kind === "error" ||
    traditionalHouseResult.kind === "error"
  ) {
    return { kind: "error" };
  }

  const destinationCategorySlugs = new Map(
    destinationResult.categories.map((category) => [
      category.id,
      category.slug,
    ]),
  );

  const items = [
    ...destinationResult.destinations.map((destination) =>
      mapDestination(
        destination,
        destinationCategorySlugs.get(destination.categoryId) ?? null,
      ),
    ),
    ...homestayResult.items.map(mapHomestay),
    ...umkmResult.items.map(mapUmkm),
    ...traditionalHouseResult.items.map(mapTraditionalHouse),
  ].filter(isPublicMapItem);

  const markers = buildPublicMapMarkers(items);

  return {
    kind: "ready",
    markers,
    items: markers.flatMap((marker) => marker.items),
    destinationCategories: destinationResult.categories.map(
      ({ slug, name }) => ({
        slug,
        name,
      }),
    ),
  };
}
