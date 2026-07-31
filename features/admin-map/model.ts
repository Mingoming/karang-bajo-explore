export type AdminCoordinatePair = Readonly<{
  latitude: number;
  longitude: number;
}>;

export const ADMIN_MAP_DEFAULT_CENTER: AdminCoordinatePair = {
  latitude: -8.35,
  longitude: 116.27,
};

export function parseAdminCoordinate(
  value: string,
  minimum: number,
  maximum: number,
) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

export function getAdminCoordinatePair(
  latitudeValue: string,
  longitudeValue: string,
): AdminCoordinatePair | null {
  const latitude = parseAdminCoordinate(latitudeValue, -90, 90);
  const longitude = parseAdminCoordinate(longitudeValue, -180, 180);

  return latitude === null || longitude === null
    ? null
    : {
        latitude,
        longitude,
      };
}

export function formatAdminCoordinate(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(6)).toString() : "";
}
