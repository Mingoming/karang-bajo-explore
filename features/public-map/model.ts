export const PUBLIC_MAP_ENTITY_TYPES = [
  "destination",
  "traditional-house",
  "homestay",
  "umkm",
] as const;

export type PublicMapEntityType = (typeof PUBLIC_MAP_ENTITY_TYPES)[number];

export type PublicMapItem = Readonly<{
  id: string;
  entityType: PublicMapEntityType;
  title: string;
  slug: string;
  href: `/${string}`;
  categorySlug: string | null;
  categoryName: string | null;
  summary: string | null;
  latitude: number;
  longitude: number;
  googleMapsUrl: string | null;
  thumbnailUrl: string | null;
}>;

export type PublicMapMarker = Readonly<{
  key: string;
  latitude: number;
  longitude: number;
  items: readonly PublicMapItem[];
}>;

export type PublicMapItemInput = Readonly<
  Omit<PublicMapItem, "latitude" | "longitude"> & {
    latitude: number | null;
    longitude: number | null;
  }
>;

const ENTITY_ORDER: Record<PublicMapEntityType, number> = {
  destination: 0,
  "traditional-house": 1,
  homestay: 2,
  umkm: 3,
};

export function isValidPublicMapCoordinate(
  latitude: number,
  longitude: number,
) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function normalizeZero(value: number) {
  return Object.is(value, -0) ? 0 : value;
}

export function createPublicMapItem(
  input: PublicMapItemInput,
): PublicMapItem | null {
  if (
    input.latitude === null ||
    input.longitude === null ||
    !isValidPublicMapCoordinate(input.latitude, input.longitude)
  ) {
    return null;
  }

  return {
    ...input,
    latitude: normalizeZero(input.latitude),
    longitude: normalizeZero(input.longitude),
  };
}

export function createPublicMapCoordinateKey(
  latitude: number,
  longitude: number,
) {
  const normalizedLatitude = normalizeZero(latitude);
  const normalizedLongitude = normalizeZero(longitude);

  return `${normalizedLatitude}|${normalizedLongitude}`;
}

export function filterPublicMapMarkersByDestinationCategory(
  markers: readonly PublicMapMarker[],
  categorySlug: string | null,
): PublicMapMarker[] {
  if (categorySlug === null) {
    return markers.map((marker) => ({
      ...marker,
      items: [...marker.items],
    }));
  }

  return markers.flatMap((marker) => {
    const items = marker.items.filter(
      (item) =>
        item.entityType === "destination" && item.categorySlug === categorySlug,
    );

    return items.length > 0
      ? [
          {
            ...marker,
            items,
          },
        ]
      : [];
  });
}

export function getPublicMapNavigationUrl(item: PublicMapItem) {
  return (
    item.googleMapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
  );
}

function comparePublicMapItems(left: PublicMapItem, right: PublicMapItem) {
  return (
    ENTITY_ORDER[left.entityType] - ENTITY_ORDER[right.entityType] ||
    left.title.localeCompare(right.title, "id-ID") ||
    left.id.localeCompare(right.id)
  );
}

export function buildPublicMapMarkers(
  items: readonly PublicMapItem[],
): PublicMapMarker[] {
  const grouped = new Map<
    string,
    {
      latitude: number;
      longitude: number;
      items: PublicMapItem[];
    }
  >();

  for (const item of items) {
    if (!isValidPublicMapCoordinate(item.latitude, item.longitude)) {
      continue;
    }

    const latitude = normalizeZero(item.latitude);
    const longitude = normalizeZero(item.longitude);
    const key = createPublicMapCoordinateKey(latitude, longitude);
    const existing = grouped.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    grouped.set(key, {
      latitude,
      longitude,
      items: [item],
    });
  }

  return [...grouped.entries()]
    .map(([key, marker]) => ({
      key,
      latitude: marker.latitude,
      longitude: marker.longitude,
      items: [...marker.items].sort(comparePublicMapItems),
    }))
    .sort(
      (left, right) =>
        left.latitude - right.latitude ||
        left.longitude - right.longitude ||
        left.key.localeCompare(right.key),
    );
}
