import {
  getPublicEnglishCulturalEventPath,
  getPublicEnglishDestinationPath,
  getPublicEnglishHomestayPath,
  getPublicEnglishTraditionalHousePath,
} from "../../config/public-routes.ts";
import type { PublicEnglishCulturalEvent } from "../public-cultural-events/english-model.ts";
import type { PublicDestination } from "../public-destinations/model.ts";
import type { PublicEnglishHomestay } from "../public-homestays/english-model.ts";
import type { PublicEnglishTraditionalHouse } from "../public-traditional-houses/english-model.ts";

import { createPublicMapItem, type PublicMapItem } from "./model.ts";

export type EnglishTourismMapSources = Readonly<{
  destinations: readonly PublicDestination[];
  traditionalHouses: readonly PublicEnglishTraditionalHouse[];
  culturalEvents: readonly PublicEnglishCulturalEvent[];
  homestays: readonly PublicEnglishHomestay[];
}>;

function mapDestination(destination: PublicDestination) {
  return createPublicMapItem({
    id: destination.id,
    entityType: "destination",
    title: destination.name,
    slug: destination.slug,
    href: getPublicEnglishDestinationPath(destination.slug),
    categorySlug: null,
    categoryName: destination.categoryName,
    summary: destination.summary,
    latitude: destination.latitude,
    longitude: destination.longitude,
    googleMapsUrl: destination.googleMapsUrl,
    thumbnailUrl: destination.primaryImage?.signedUrl ?? null,
  });
}

function mapTraditionalHouse(house: PublicEnglishTraditionalHouse) {
  return createPublicMapItem({
    id: house.id,
    entityType: "traditional-house",
    title: house.name,
    slug: house.slug,
    href: getPublicEnglishTraditionalHousePath(house.slug),
    categorySlug: null,
    categoryName: null,
    summary: house.summary,
    latitude: house.latitude,
    longitude: house.longitude,
    googleMapsUrl: house.googleMapsUrl,
    thumbnailUrl: house.primaryImage?.signedUrl ?? null,
  });
}

function mapCulturalEvent(event: PublicEnglishCulturalEvent) {
  return createPublicMapItem({
    id: event.id,
    entityType: "cultural-event",
    title: event.title,
    slug: event.slug,
    href: getPublicEnglishCulturalEventPath(event.slug),
    categorySlug: null,
    categoryName: null,
    summary: event.summary,
    latitude: event.latitude,
    longitude: event.longitude,
    googleMapsUrl: event.googleMapsUrl,
    thumbnailUrl: event.primaryImage?.signedUrl ?? null,
  });
}

function mapHomestay(homestay: PublicEnglishHomestay) {
  return createPublicMapItem({
    id: homestay.id,
    entityType: "homestay",
    title: homestay.name,
    slug: homestay.slug,
    href: getPublicEnglishHomestayPath(homestay.slug),
    categorySlug: null,
    categoryName: null,
    summary: homestay.description,
    latitude: homestay.latitude,
    longitude: homestay.longitude,
    googleMapsUrl: homestay.googleMapsUrl,
    thumbnailUrl: homestay.primaryImage?.signedUrl ?? null,
  });
}

export function buildEnglishTourismMapItems(
  sources: EnglishTourismMapSources,
): PublicMapItem[] {
  return [
    ...sources.destinations.map(mapDestination),
    ...sources.traditionalHouses.map(mapTraditionalHouse),
    ...sources.culturalEvents.map(mapCulturalEvent),
    ...sources.homestays.map(mapHomestay),
  ].filter((item): item is PublicMapItem => item !== null);
}
