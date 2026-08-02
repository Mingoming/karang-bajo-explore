export const PUBLIC_MEDIA_BUCKET = "tourism-media" as const;
export const PUBLIC_MEDIA_TTL_SECONDS = 600;

export const PUBLIC_MEDIA_ENTITY_CONFIG = {
  destination: {
    pathPrefix: "destination",
    parentTable: "destinations",
    imageTable: "destination_images",
    parentForeignKey: "destination_id",
    publishedView: "published_destination_images",
  },
  "tourism-package": {
    pathPrefix: "tourism-package",
    parentTable: "tourism_packages",
    imageTable: "package_images",
    parentForeignKey: "package_id",
    publishedView: "published_package_images",
  },
  homestay: {
    pathPrefix: "homestay",
    parentTable: "homestays",
    imageTable: "homestay_images",
    parentForeignKey: "homestay_id",
    publishedView: "published_homestay_images",
  },
  umkm: {
    pathPrefix: "umkm",
    parentTable: "umkms",
    imageTable: "umkm_images",
    parentForeignKey: "umkm_id",
    publishedView: "published_umkm_images",
  },
  "traditional-house": {
    pathPrefix: "traditional-house",
    parentTable: "traditional_houses",
    imageTable: "traditional_house_images",
    parentForeignKey: "traditional_house_id",
    publishedView: "published_traditional_house_images",
  },
  "cultural-event": {
    pathPrefix: "cultural-event",
    parentTable: "cultural_events",
    imageTable: "cultural_event_images",
    parentForeignKey: "cultural_event_id",
    publishedView: "published_cultural_event_images",
  },
} as const;

export type PublicMediaEntityType = keyof typeof PUBLIC_MEDIA_ENTITY_CONFIG;

export type PublicMediaReference = {
  id: string;
  entityType: PublicMediaEntityType;
  parentId: string;
  bucket: typeof PUBLIC_MEDIA_BUCKET;
  storagePath: string;
  altText: string;
  caption: string | null;
  displayOrder: number;
  isPrimary: boolean;
};

export type SignedPublicMedia = PublicMediaReference & {
  signedUrl: string | null;
};

export type PublicMediaSigningResult = {
  path: string | null;
  signedUrl?: string | null;
  error?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SUPPORTED_IMAGE_EXTENSION_PATTERN = /^(jpg|png|webp)$/;

export function isPublicMediaEntityType(
  value: string,
): value is PublicMediaEntityType {
  return Object.hasOwn(PUBLIC_MEDIA_ENTITY_CONFIG, value);
}

export function isTrustedPublicMediaReference(reference: PublicMediaReference) {
  if (
    !isPublicMediaEntityType(reference.entityType) ||
    reference.bucket !== PUBLIC_MEDIA_BUCKET ||
    !UUID_PATTERN.test(reference.parentId) ||
    !UUID_PATTERN.test(reference.id)
  ) {
    return false;
  }

  const prefix = PUBLIC_MEDIA_ENTITY_CONFIG[reference.entityType].pathPrefix;
  const expectedPrefix = `${prefix}/${reference.parentId}/`;
  if (!reference.storagePath.startsWith(expectedPrefix)) return false;

  const filename = reference.storagePath.slice(expectedPrefix.length);
  const [storageObjectId, extension, extra] = filename.split(".");
  return (
    !reference.storagePath.includes("\\") &&
    !reference.storagePath.includes("%") &&
    !reference.storagePath.includes("..") &&
    extra === undefined &&
    UUID_PATTERN.test(storageObjectId ?? "") &&
    SUPPORTED_IMAGE_EXTENSION_PATTERN.test(extension ?? "")
  );
}

export function mapPublicMediaSigningResults(
  references: readonly PublicMediaReference[],
  results: readonly PublicMediaSigningResult[],
): SignedPublicMedia[] {
  const signedUrls = new Map(
    results
      .filter(
        (
          result,
        ): result is PublicMediaSigningResult & {
          path: string;
          signedUrl: string;
        } =>
          typeof result.path === "string" &&
          typeof result.signedUrl === "string" &&
          !result.error,
      )
      .map((result) => [result.path, result.signedUrl]),
  );

  return references.map((reference) => ({
    ...reference,
    signedUrl: signedUrls.get(reference.storagePath) ?? null,
  }));
}
