import "server-only";

import { cache } from "react";

import { getPublishedEnglishCulturalEvents } from "@/features/public-cultural-events/english-data";
import { getPublishedEnglishDestinations } from "@/features/public-destinations/english-data";
import { getPublishedEnglishHomestays } from "@/features/public-homestays/english-data";
import { getPublishedEnglishTraditionalHouses } from "@/features/public-traditional-houses/english-data";

import { buildPublicMapMarkers } from "./model";
import type { PublicMapDataResult } from "./data";
import { buildEnglishTourismMapItems } from "./english-model";

export const getPublishedEnglishTourismMapData = cache(
  async (): Promise<PublicMapDataResult> => {
    const [
      destinationResult,
      traditionalHouseResult,
      culturalEventResult,
      homestayResult,
    ] = await Promise.all([
      getPublishedEnglishDestinations(),
      getPublishedEnglishTraditionalHouses(),
      getPublishedEnglishCulturalEvents(),
      getPublishedEnglishHomestays(),
    ]);

    if (
      destinationResult.kind === "error" ||
      traditionalHouseResult.kind === "error" ||
      culturalEventResult.kind === "error" ||
      homestayResult.kind === "error"
    ) {
      return { kind: "error" };
    }

    const items = buildEnglishTourismMapItems({
      destinations: destinationResult.destinations,
      traditionalHouses: traditionalHouseResult.houses,
      culturalEvents: culturalEventResult.events,
      homestays: homestayResult.homestays,
    });
    const markers = buildPublicMapMarkers(items);

    return {
      kind: "ready",
      markers,
      items: markers.flatMap((marker) => marker.items),
      destinationCategories: [],
    };
  },
);
