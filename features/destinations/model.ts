export const DESTINATION_FORM_FIELDS = [
  "category_id",
  "name",
  "summary",
  "description",
  "history",
  "latitude",
  "longitude",
  "google_maps_url",
  "opening_hours",
  "entrance_fee",
  "price_note",
  "facilities",
  "contact_name",
  "contact_phone",
  "contact_consent_confirmed",
  "is_featured",
  "display_order",
  "status",
] as const;

export const DESTINATION_STATUSES = ["draft", "published", "archived"] as const;

export type DestinationFormField = (typeof DESTINATION_FORM_FIELDS)[number];
export type DestinationStatus = (typeof DESTINATION_STATUSES)[number];
export type DestinationMutationMode = "create" | "update";

export type DestinationCategoryOption = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
};

export type DestinationRecord = {
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
  contact_consent_confirmed: boolean;
  thumbnail_path: string | null;
  thumbnail_bucket: string | null;
  is_featured: boolean;
  display_order: number;
  status: DestinationStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DestinationListItem = {
  id: string;
  name: string;
  status: DestinationStatus;
  displayOrder: number;
  updatedAt: string;
  categoryName: string;
};

export type DestinationFormValues = {
  category_id: string;
  name: string;
  summary: string;
  description: string;
  history: string;
  latitude: string;
  longitude: string;
  google_maps_url: string;
  opening_hours: string;
  entrance_fee: string;
  price_note: string;
  facilities: string;
  contact_name: string;
  contact_phone: string;
  contact_consent_confirmed: boolean;
  is_featured: boolean;
  display_order: string;
  status: string;
};

export type DestinationMutationValues = {
  category_id: string;
  name: string;
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
  contact_consent_confirmed: boolean;
  is_featured: boolean;
  display_order: number;
  status: DestinationStatus;
};

export type DestinationInsertPayload = DestinationMutationValues & {
  slug: string;
  created_by: string;
  updated_by: string;
};

export type DestinationUpdatePayload = DestinationMutationValues & {
  updated_by: string;
};

export type DestinationFieldErrors = Partial<
  Record<DestinationFormField, string>
>;

export type DestinationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "category-error"
    | "duplicate-error"
    | "not-found"
    | "database-error";
  values: DestinationFormValues;
  fieldErrors: DestinationFieldErrors;
  formErrors: string[];
  message: string | null;
  revision: number;
};

export type DestinationValidationContext = {
  mode: DestinationMutationMode;
  currentStatus?: DestinationStatus;
  allowedCategoryIds?: readonly string[];
  hasThumbnail?: boolean;
};

export type DestinationValidationResult =
  | {
      success: true;
      data: DestinationMutationValues;
      values: DestinationFormValues;
    }
  | {
      success: false;
      values: DestinationFormValues;
      fieldErrors: DestinationFieldErrors;
      formErrors: string[];
    };

const EMPTY_DESTINATION_VALUES: DestinationFormValues = {
  category_id: "",
  name: "",
  summary: "",
  description: "",
  history: "",
  latitude: "",
  longitude: "",
  google_maps_url: "",
  opening_hours: "",
  entrance_fee: "",
  price_note: "",
  facilities: "",
  contact_name: "",
  contact_phone: "",
  contact_consent_confirmed: false,
  is_featured: false,
  display_order: "0",
  status: "draft",
};

type DestinationBooleanField = "contact_consent_confirmed" | "is_featured";

const FIELD_LABELS: Record<DestinationFormField, string> = {
  category_id: "Kategori",
  name: "Nama destinasi",
  summary: "Ringkasan",
  description: "Deskripsi",
  history: "Sejarah",
  latitude: "Latitude",
  longitude: "Longitude",
  google_maps_url: "Tautan Google Maps",
  opening_hours: "Jam kunjungan",
  entrance_fee: "Biaya masuk",
  price_note: "Catatan harga",
  facilities: "Fasilitas",
  contact_name: "Nama kontak",
  contact_phone: "Nomor kontak",
  contact_consent_confirmed: "Persetujuan publikasi kontak",
  is_featured: "Destinasi unggulan",
  display_order: "Urutan tampilan",
  status: "Status publikasi",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const INTEGER_PATTERN = /^[+-]?\d+$/;
const PUBLICATION_PLACEHOLDER_PATTERN =
  /\b(?:lorem ipsum|tbd|todo|isi nanti|belum diisi)\b/i;
const DESTINATION_DUPLICATE_CONSTRAINTS = [
  "destinations_slug_key",
  "destinations_active_name_idx",
] as const;

function isDestinationFormField(value: string): value is DestinationFormField {
  return DESTINATION_FORM_FIELDS.some((field) => field === value);
}

function isDestinationBooleanField(
  value: DestinationFormField,
): value is DestinationBooleanField {
  return value === "contact_consent_confirmed" || value === "is_featured";
}

function isDestinationStatus(value: string): value is DestinationStatus {
  return DESTINATION_STATUSES.some((status) => status === value);
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

function parseRequiredCoordinate(
  field: "latitude" | "longitude",
  values: DestinationFormValues,
  fieldErrors: DestinationFieldErrors,
) {
  const rawValue = values[field].trim();

  if (fieldErrors[field]) {
    return null;
  }

  if (rawValue === "") {
    fieldErrors[field] = `${FIELD_LABELS[field]} wajib diisi.`;
    return null;
  }

  if (!DECIMAL_PATTERN.test(rawValue)) {
    fieldErrors[field] =
      `${FIELD_LABELS[field]} harus berupa angka yang valid.`;
    return null;
  }

  const parsedValue = Number(rawValue);
  const minimum = field === "latitude" ? -90 : -180;
  const maximum = field === "latitude" ? 90 : 180;

  if (!Number.isFinite(parsedValue)) {
    fieldErrors[field] =
      `${FIELD_LABELS[field]} harus berupa angka yang valid.`;
    return null;
  }

  if (parsedValue < minimum || parsedValue > maximum) {
    fieldErrors[field] =
      `${FIELD_LABELS[field]} harus berada di antara ${minimum} dan ${maximum}.`;
    return null;
  }

  return parsedValue;
}

function parseNullablePrice(
  values: DestinationFormValues,
  fieldErrors: DestinationFieldErrors,
) {
  const rawValue = values.entrance_fee.trim();

  if (fieldErrors.entrance_fee) {
    return null;
  }

  if (rawValue === "") {
    return null;
  }

  if (!DECIMAL_PATTERN.test(rawValue)) {
    fieldErrors.entrance_fee = "Biaya masuk harus berupa angka yang valid.";
    return null;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    fieldErrors.entrance_fee = "Biaya masuk harus berupa angka yang valid.";
    return null;
  }

  if (parsedValue < 0) {
    fieldErrors.entrance_fee = "Biaya masuk tidak boleh bernilai negatif.";
    return null;
  }

  return parsedValue;
}

function parseDisplayOrder(
  values: DestinationFormValues,
  fieldErrors: DestinationFieldErrors,
) {
  const rawValue = values.display_order.trim();
  if (fieldErrors.display_order) {
    return null;
  }

  if (!INTEGER_PATTERN.test(rawValue)) {
    fieldErrors.display_order = "Urutan tampilan harus berupa bilangan bulat.";
    return null;
  }

  const parsedValue = Number(rawValue);

  if (
    rawValue === "" ||
    !Number.isFinite(parsedValue) ||
    !Number.isSafeInteger(parsedValue)
  ) {
    fieldErrors.display_order = "Urutan tampilan harus berupa bilangan bulat.";
    return null;
  }

  if (parsedValue < 0) {
    fieldErrors.display_order = "Urutan tampilan tidak boleh bernilai negatif.";
    return null;
  }

  if (parsedValue > 2_147_483_647) {
    fieldErrors.display_order = "Urutan tampilan terlalu besar.";
    return null;
  }

  return parsedValue;
}

function validatePublicationText(
  field: Extract<
    DestinationFormField,
    | "name"
    | "summary"
    | "description"
    | "history"
    | "opening_hours"
    | "price_note"
    | "facilities"
    | "contact_name"
    | "contact_phone"
  >,
  value: string,
  fieldErrors: DestinationFieldErrors,
) {
  if (PUBLICATION_PLACEHOLDER_PATTERN.test(value)) {
    fieldErrors[field] =
      `${FIELD_LABELS[field]} masih memuat teks placeholder dan belum dapat diterbitkan.`;
  }
}

export function isValidDestinationId(value: string) {
  return UUID_PATTERN.test(value);
}

export function normalizeDestinationSlug(name: string) {
  return name
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidDestinationSlug(value: string) {
  return SLUG_PATTERN.test(value);
}

export function isDestinationDuplicateConstraintError(
  code: string,
  diagnosticText: string,
) {
  return (
    code === "23505" &&
    DESTINATION_DUPLICATE_CONSTRAINTS.some((constraint) =>
      diagnosticText.includes(constraint),
    )
  );
}

export function getAllowedDestinationStatuses(
  currentStatus: DestinationStatus | null,
): readonly DestinationStatus[] {
  if (currentStatus === null) {
    return ["draft"];
  }

  if (currentStatus === "published") {
    return ["published", "archived"];
  }

  if (currentStatus === "archived") {
    return ["archived", "draft"];
  }

  return ["draft", "published", "archived"];
}

export function getDestinationStatusLabel(status: DestinationStatus) {
  const labels: Record<DestinationStatus, string> = {
    draft: "Draf",
    published: "Diterbitkan",
    archived: "Diarsipkan",
  };

  return labels[status];
}

export function getDestinationMutationMode(
  destination: Pick<DestinationRecord, "id"> | null,
): DestinationMutationMode {
  return destination === null ? "create" : "update";
}

export function emptyDestinationFormValues(
  defaultCategoryId = "",
): DestinationFormValues {
  return { ...EMPTY_DESTINATION_VALUES, category_id: defaultCategoryId };
}

export function destinationToFormValues(
  destination: DestinationRecord,
): DestinationFormValues {
  return {
    category_id: destination.category_id,
    name: destination.name,
    summary: destination.summary,
    description: destination.description,
    history: destination.history ?? "",
    latitude: String(destination.latitude),
    longitude: String(destination.longitude),
    google_maps_url: destination.google_maps_url ?? "",
    opening_hours: destination.opening_hours ?? "",
    entrance_fee:
      destination.entrance_fee === null ? "" : String(destination.entrance_fee),
    price_note: destination.price_note ?? "",
    facilities: destination.facilities.join("\n"),
    contact_name: destination.contact_name ?? "",
    contact_phone: destination.contact_phone ?? "",
    contact_consent_confirmed: destination.contact_consent_confirmed,
    is_featured: destination.is_featured,
    display_order: String(destination.display_order),
    status: destination.status,
  };
}

export function createDestinationInitialState(
  destination: DestinationRecord | null,
  defaultCategoryId = "",
): DestinationActionState {
  return {
    kind: "idle",
    values: destination
      ? destinationToFormValues(destination)
      : emptyDestinationFormValues(defaultCategoryId),
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

export function validateDestinationInput(
  input: Record<string, unknown>,
  context: DestinationValidationContext,
): DestinationValidationResult {
  const values = emptyDestinationFormValues();
  const fieldErrors: DestinationFieldErrors = {};
  const formErrors: string[] = [];
  const providedFields = new Set<string>();

  for (const [field, rawValue] of Object.entries(input)) {
    if (field.startsWith("$ACTION_")) {
      continue;
    }

    if (!isDestinationFormField(field)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
      continue;
    }

    providedFields.add(field);

    if (isDestinationBooleanField(field)) {
      const booleanValue = rawValue === "on" || rawValue === true;
      const isValidBoolean =
        rawValue === "on" || rawValue === true || rawValue === false;

      if (!isValidBoolean) {
        fieldErrors[field] =
          `${FIELD_LABELS[field]} memiliki nilai yang tidak valid.`;
        continue;
      }

      if (field === "contact_consent_confirmed") {
        values.contact_consent_confirmed = booleanValue;
      } else {
        values.is_featured = booleanValue;
      }
      continue;
    }

    if (typeof rawValue !== "string") {
      fieldErrors[field] =
        `${FIELD_LABELS[field]} memiliki nilai yang tidak valid.`;
      continue;
    }

    values[field] = rawValue;
  }

  if (context.mode === "update" && !providedFields.has("status")) {
    fieldErrors.status = "Status publikasi wajib dikirim saat memperbarui.";
  }

  const name = values.name.trim();
  const summary = values.summary.trim();
  const description = values.description.trim();

  if (name === "" && !fieldErrors.name) {
    fieldErrors.name = "Nama destinasi wajib diisi.";
  }
  if (summary === "" && !fieldErrors.summary) {
    fieldErrors.summary = "Ringkasan wajib diisi.";
  }
  if (description === "" && !fieldErrors.description) {
    fieldErrors.description = "Deskripsi wajib diisi.";
  }

  const categoryId = values.category_id.trim();
  if (!fieldErrors.category_id) {
    if (categoryId === "") {
      fieldErrors.category_id = "Kategori wajib dipilih.";
    } else if (!isValidDestinationId(categoryId)) {
      fieldErrors.category_id = "Kategori yang dipilih tidak valid.";
    } else if (
      context.allowedCategoryIds &&
      !context.allowedCategoryIds.includes(categoryId)
    ) {
      fieldErrors.category_id = "Kategori yang dipilih tidak tersedia.";
    }
  }

  const latitude = parseRequiredCoordinate("latitude", values, fieldErrors);
  const longitude = parseRequiredCoordinate("longitude", values, fieldErrors);
  const entranceFee = parseNullablePrice(values, fieldErrors);
  const displayOrder = parseDisplayOrder(values, fieldErrors);

  const googleMapsUrl = normalizeOptionalText(values.google_maps_url);
  if (googleMapsUrl) {
    try {
      const parsedUrl = new URL(googleMapsUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        fieldErrors.google_maps_url =
          "Tautan Google Maps harus menggunakan protokol http atau https.";
      }
    } catch {
      fieldErrors.google_maps_url = "Tautan Google Maps tidak valid.";
    }
  }

  const statusValue = values.status.trim();
  let status: DestinationStatus | null = null;
  if (fieldErrors.status) {
    status = null;
  } else if (!isDestinationStatus(statusValue)) {
    fieldErrors.status = "Status publikasi tidak valid.";
  } else {
    status = statusValue;
    if (context.mode === "create") {
      const allowedStatuses = getAllowedDestinationStatuses(null);
      if (!allowedStatuses.includes(status)) {
        fieldErrors.status = "Perubahan status publikasi tidak diizinkan.";
      }
    } else if (context.currentStatus !== undefined) {
      const allowedStatuses = getAllowedDestinationStatuses(
        context.currentStatus,
      );
      if (!allowedStatuses.includes(status)) {
        fieldErrors.status = "Perubahan status publikasi tidak diizinkan.";
      }
    }
  }

  const facilities = values.facilities
    .split(/\r?\n/)
    .map((facility) => facility.trim())
    .filter((facility) => facility !== "");
  const history = normalizeOptionalText(values.history);
  const openingHours = normalizeOptionalText(values.opening_hours);
  const priceNote = normalizeOptionalText(values.price_note);
  const contactName = normalizeOptionalText(values.contact_name);
  const contactPhone = normalizeOptionalText(values.contact_phone);

  if (status === "published") {
    if (context.hasThumbnail === false) {
      formErrors.push(
        "Destinasi belum dapat diterbitkan karena gambar utama belum tersedia.",
      );
    }

    if (
      (contactName !== null || contactPhone !== null) &&
      !values.contact_consent_confirmed
    ) {
      fieldErrors.contact_consent_confirmed =
        "Konfirmasi persetujuan wajib dicatat sebelum kontak diterbitkan.";
    }

    validatePublicationText("name", values.name, fieldErrors);
    validatePublicationText("summary", values.summary, fieldErrors);
    validatePublicationText("description", values.description, fieldErrors);
    validatePublicationText("history", values.history, fieldErrors);
    validatePublicationText("opening_hours", values.opening_hours, fieldErrors);
    validatePublicationText("price_note", values.price_note, fieldErrors);
    validatePublicationText("facilities", values.facilities, fieldErrors);
    validatePublicationText("contact_name", values.contact_name, fieldErrors);
    validatePublicationText("contact_phone", values.contact_phone, fieldErrors);
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    formErrors.length > 0 ||
    latitude === null ||
    longitude === null ||
    displayOrder === null ||
    status === null
  ) {
    return {
      success: false,
      values,
      fieldErrors,
      formErrors: [...new Set(formErrors)],
    };
  }

  return {
    success: true,
    values,
    data: {
      category_id: categoryId,
      name,
      summary,
      description,
      history,
      latitude,
      longitude,
      google_maps_url: googleMapsUrl,
      opening_hours: openingHours,
      entrance_fee: entranceFee,
      price_note: priceNote,
      facilities,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_consent_confirmed: values.contact_consent_confirmed,
      is_featured: values.is_featured,
      display_order: displayOrder,
      status,
    },
  };
}

export function validateDestinationFormData(
  formData: FormData,
  context: DestinationValidationContext,
): DestinationValidationResult {
  const input: Record<string, unknown> = {};

  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }

  return validateDestinationInput(input, context);
}
