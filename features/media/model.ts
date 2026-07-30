export const MEDIA_BUCKET = "tourism-media";
export const MEDIA_MAX_IMAGES_PER_PARENT = 10;

export const MEDIA_ENTITY_TYPES = [
  "destination",
  "tourism-package",
  "homestay",
  "umkm",
  "traditional-house",
  "cultural-event",
] as const;

export type MediaEntityType = (typeof MEDIA_ENTITY_TYPES)[number];
export type MediaMutationMode = "create" | "update";

export const MEDIA_ENTITY_LABELS: Record<MediaEntityType, string> = {
  destination: "Destinasi",
  "tourism-package": "Paket Wisata",
  homestay: "Homestay",
  umkm: "UMKM",
  "traditional-house": "Rumah Adat",
  "cultural-event": "Acara Budaya",
};

export type MediaParentOption = {
  entityType: MediaEntityType;
  id: string;
  label: string;
  status: "draft" | "published" | "archived";
  updatedAt: string;
  imageCount: number;
  primaryImageId: string | null;
  primaryPath: string | null;
  previewUrl: string | null;
};

export type MediaImageRecord = {
  id: string;
  parentId: string;
  storageBucket: string;
  storagePath: string;
  caption: string | null;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
  previewUrl: string | null;
};

export type MediaFormValues = {
  entity_type: string;
  parent_id: string;
  alt_text: string;
  caption: string;
  display_order: string;
  is_primary: boolean;
};

export type MediaFieldErrors = Partial<
  Record<keyof MediaFormValues | "file", string>
>;
export type MediaActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "not-found"
    | "database-error"
    | "storage-error";
  values: MediaFormValues;
  fieldErrors: MediaFieldErrors;
  formErrors: string[];
  message: string | null;
  revision: number;
};

export const EMPTY_MEDIA_VALUES: MediaFormValues = {
  entity_type: "",
  parent_id: "",
  alt_text: "",
  caption: "",
  display_order: "0",
  is_primary: false,
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER_PATTERN = /^\d+$/;
const ALLOWED_FIELDS = new Set([
  "entity_type",
  "parent_id",
  "alt_text",
  "caption",
  "display_order",
  "is_primary",
  "file",
]);

export function isMediaEntityType(value: string): value is MediaEntityType {
  return MEDIA_ENTITY_TYPES.some((type) => type === value);
}

export function isValidMediaUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function getMediaMutationMode(
  record: MediaImageRecord | null,
): MediaMutationMode {
  return record ? "update" : "create";
}

export function shouldMakeMediaPrimary(imageCount: number, requested: boolean) {
  return imageCount === 0 || requested;
}

export function canAddMediaImage(imageCount: number) {
  return (
    Number.isInteger(imageCount) &&
    imageCount >= 0 &&
    imageCount < MEDIA_MAX_IMAGES_PER_PARENT
  );
}

export function moveMediaImageToOrder(
  ids: string[],
  imageId: string,
  requestedOrder: number,
) {
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length || !unique.includes(imageId)) return null;
  const withoutTarget = unique.filter((id) => id !== imageId);
  const position = Math.min(Math.max(requestedOrder, 0), withoutTarget.length);
  withoutTarget.splice(position, 0, imageId);
  return withoutTarget;
}

export function createMediaInitialState(
  entityType: MediaEntityType | "" = "",
  parentId = "",
  record: MediaImageRecord | null = null,
): MediaActionState {
  return {
    kind: "idle",
    values: record
      ? {
          entity_type: entityType,
          parent_id: parentId,
          alt_text: record.altText,
          caption: record.caption ?? "",
          display_order: String(record.displayOrder),
          is_primary: record.isPrimary,
        }
      : { ...EMPTY_MEDIA_VALUES, entity_type: entityType, parent_id: parentId },
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

export function validateMediaMetadataInput(input: Record<string, unknown>) {
  const values = { ...EMPTY_MEDIA_VALUES };
  const fieldErrors: MediaFieldErrors = {};
  const formErrors: string[] = [];

  for (const [field, raw] of Object.entries(input)) {
    if (field.startsWith("$ACTION_") || field === "file") continue;
    if (!ALLOWED_FIELDS.has(field)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
      continue;
    }
    if (field === "is_primary") {
      if (raw !== "on" && raw !== true && raw !== false)
        fieldErrors.is_primary = "Pilihan gambar utama tidak valid.";
      else values.is_primary = raw === "on" || raw === true;
      continue;
    }
    if (typeof raw !== "string") {
      fieldErrors[field as keyof MediaFormValues] =
        "Nilai formulir tidak valid.";
      continue;
    }
    if (field === "entity_type") values.entity_type = raw;
    else if (field === "parent_id") values.parent_id = raw;
    else if (field === "alt_text") values.alt_text = raw;
    else if (field === "caption") values.caption = raw;
    else if (field === "display_order") values.display_order = raw;
  }

  const entityType = values.entity_type.trim();
  const parentId = values.parent_id.trim();
  const altText = values.alt_text.trim();
  const caption = values.caption.trim();
  if (!isMediaEntityType(entityType))
    fieldErrors.entity_type = "Jenis konten media tidak valid.";
  if (!isValidMediaUuid(parentId))
    fieldErrors.parent_id = "Induk konten tidak valid.";
  if (!altText) fieldErrors.alt_text = "Teks alternatif wajib diisi.";
  if (!INTEGER_PATTERN.test(values.display_order.trim()))
    fieldErrors.display_order =
      "Urutan tampilan harus berupa bilangan bulat mulai dari 0.";
  const displayOrder = Number(values.display_order);
  if (!Number.isSafeInteger(displayOrder) || displayOrder < 0)
    fieldErrors.display_order =
      "Urutan tampilan harus berupa bilangan bulat mulai dari 0.";

  if (
    Object.keys(fieldErrors).length ||
    formErrors.length ||
    !isMediaEntityType(entityType)
  ) {
    return {
      success: false as const,
      values,
      fieldErrors,
      formErrors: [...new Set(formErrors)],
    };
  }
  return {
    success: true as const,
    values,
    data: {
      entityType,
      parentId,
      altText,
      caption: caption || null,
      displayOrder,
      isPrimary: values.is_primary,
    },
  };
}

export const validateMediaInput = validateMediaMetadataInput;

export function validateMediaFormData(formData: FormData) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    if (field === "file") continue;
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  return validateMediaMetadataInput(input);
}

export function getUploadCompensationDecision(
  uploadSucceeded: boolean,
  metadataSucceeded: boolean,
) {
  return uploadSucceeded && !metadataSucceeded ? "remove-new-object" : "none";
}

export function getReplacementCompensationDecision(databaseSucceeded: boolean) {
  return databaseSucceeded ? "remove-old-object" : "remove-new-object";
}

export function classifyMediaDeletion(
  databaseSucceeded: boolean,
  storageSucceeded: boolean,
) {
  if (!databaseSucceeded) return "database-failure";
  return storageSucceeded ? "complete-success" : "orphaned-storage-object";
}
