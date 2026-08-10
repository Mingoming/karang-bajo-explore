export const TRADITIONAL_HOUSE_FORM_FIELDS = [
  "name",
  "summary",
  "description",
  "history",
  "cultural_significance",
  "location_name",
  "latitude",
  "longitude",
  "google_maps_url",
  "visitor_information",
  "is_featured",
  "display_order",
  "status",
] as const;

export const TRADITIONAL_HOUSE_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export type TraditionalHouseFormField =
  (typeof TRADITIONAL_HOUSE_FORM_FIELDS)[number];
export type TraditionalHouseStatus =
  (typeof TRADITIONAL_HOUSE_STATUSES)[number];
export type TraditionalHouseMutationMode = "create" | "update";

export type TraditionalHouseRecord = {
  id: string;
  name: string;
  slug: string;
  source_revision: number;
  summary: string | null;
  description: string;
  history: string | null;
  cultural_significance: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  visitor_information: string | null;
  thumbnail_path: string | null;
  thumbnail_bucket: string | null;
  status: TraditionalHouseStatus;
  published_at: string | null;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type TraditionalHouseListItem = {
  id: string;
  name: string;
  status: TraditionalHouseStatus;
  locationName: string | null;
  isFeatured: boolean;
  displayOrder: number;
  updatedAt: string;
};

export type TraditionalHouseFormValues = {
  name: string;
  summary: string;
  description: string;
  history: string;
  cultural_significance: string;
  location_name: string;
  latitude: string;
  longitude: string;
  google_maps_url: string;
  visitor_information: string;
  is_featured: boolean;
  display_order: string;
  status: string;
};

export type TraditionalHouseMutationValues = {
  name: string;
  summary: string | null;
  description: string;
  history: string | null;
  cultural_significance: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  visitor_information: string | null;
  is_featured: boolean;
  display_order: number;
  status: TraditionalHouseStatus;
};

export type TraditionalHouseInsertPayload = TraditionalHouseMutationValues & {
  slug: string;
  created_by: string;
  updated_by: string;
};

export type TraditionalHouseUpdatePayload = TraditionalHouseMutationValues & {
  updated_by: string;
};

export type TraditionalHouseFieldErrors = Partial<
  Record<TraditionalHouseFormField, string>
>;

export type TraditionalHouseActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "duplicate-error"
    | "not-found"
    | "database-error";
  values: TraditionalHouseFormValues;
  fieldErrors: TraditionalHouseFieldErrors;
  formErrors: string[];
  message: string | null;
  revision: number;
};

export type TraditionalHouseValidationContext = {
  mode: TraditionalHouseMutationMode;
  currentStatus?: TraditionalHouseStatus;
  hasThumbnail?: boolean;
};

export type TraditionalHouseValidationResult =
  | {
      success: true;
      data: TraditionalHouseMutationValues;
      values: TraditionalHouseFormValues;
    }
  | {
      success: false;
      values: TraditionalHouseFormValues;
      fieldErrors: TraditionalHouseFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: TraditionalHouseFormValues = {
  name: "",
  summary: "",
  description: "",
  history: "",
  cultural_significance: "",
  location_name: "",
  latitude: "",
  longitude: "",
  google_maps_url: "",
  visitor_information: "",
  is_featured: false,
  display_order: "0",
  status: "draft",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const INTEGER_PATTERN = /^[+-]?\d+$/;
const PLACEHOLDER_PATTERN =
  /\b(?:lorem ipsum|tbd|todo|isi nanti|belum diisi)\b/i;
const DUPLICATE_CONSTRAINTS = [
  "traditional_houses_slug_key",
  "traditional_houses_active_name_idx",
] as const;

const FIELD_LABELS: Record<TraditionalHouseFormField, string> = {
  name: "Nama rumah adat",
  summary: "Ringkasan",
  description: "Deskripsi",
  history: "Sejarah rumah",
  cultural_significance: "Makna budaya",
  location_name: "Nama lokasi",
  latitude: "Latitude",
  longitude: "Longitude",
  google_maps_url: "Tautan Google Maps",
  visitor_information: "Informasi kunjungan",
  is_featured: "Rumah adat unggulan",
  display_order: "Urutan tampilan",
  status: "Status publikasi",
};

function isFormField(value: string): value is TraditionalHouseFormField {
  return TRADITIONAL_HOUSE_FORM_FIELDS.some((field) => field === value);
}

function isStatus(value: string): value is TraditionalHouseStatus {
  return TRADITIONAL_HOUSE_STATUSES.some((status) => status === value);
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseCoordinate(
  field: "latitude" | "longitude",
  values: TraditionalHouseFormValues,
  errors: TraditionalHouseFieldErrors,
) {
  const raw = values[field].trim();
  if (errors[field] || raw === "") return null;
  if (!DECIMAL_PATTERN.test(raw)) {
    errors[field] = `${FIELD_LABELS[field]} harus berupa angka yang valid.`;
    return null;
  }
  const parsed = Number(raw);
  const minimum = field === "latitude" ? -90 : -180;
  const maximum = field === "latitude" ? 90 : 180;
  if (!Number.isFinite(parsed)) {
    errors[field] = `${FIELD_LABELS[field]} harus berupa angka yang valid.`;
    return null;
  }
  if (parsed < minimum || parsed > maximum) {
    errors[field] =
      `${FIELD_LABELS[field]} harus berada di antara ${minimum} dan ${maximum}.`;
    return null;
  }
  return parsed;
}

function parseDisplayOrder(
  values: TraditionalHouseFormValues,
  errors: TraditionalHouseFieldErrors,
) {
  const raw = values.display_order.trim();
  if (errors.display_order || !INTEGER_PATTERN.test(raw)) {
    errors.display_order = "Urutan tampilan harus berupa bilangan bulat.";
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    errors.display_order = "Urutan tampilan harus berupa bilangan bulat.";
    return null;
  }
  if (parsed < 0) {
    errors.display_order = "Urutan tampilan tidak boleh bernilai negatif.";
    return null;
  }
  if (parsed > 2_147_483_647) {
    errors.display_order = "Urutan tampilan terlalu besar.";
    return null;
  }
  return parsed;
}

export function isValidTraditionalHouseId(value: string) {
  return UUID_PATTERN.test(value);
}

export function normalizeTraditionalHouseSlug(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidTraditionalHouseSlug(value: string) {
  return SLUG_PATTERN.test(value);
}

export function isTraditionalHouseDuplicateConstraintError(
  code: string,
  diagnosticText: string,
) {
  return (
    code === "23505" &&
    DUPLICATE_CONSTRAINTS.some((constraint) =>
      diagnosticText.includes(constraint),
    )
  );
}

export function getAllowedTraditionalHouseStatuses(
  currentStatus: TraditionalHouseStatus | null,
): readonly TraditionalHouseStatus[] {
  if (currentStatus === null) return ["draft"];
  if (currentStatus === "published") return ["published", "archived"];
  if (currentStatus === "archived") return ["archived", "draft"];
  return ["draft", "published", "archived"];
}

export function getTraditionalHouseStatusLabel(status: TraditionalHouseStatus) {
  return {
    draft: "Draf",
    published: "Diterbitkan",
    archived: "Diarsipkan",
  }[status];
}

export function getTraditionalHouseMutationMode(
  house: Pick<TraditionalHouseRecord, "id"> | null,
): TraditionalHouseMutationMode {
  return house === null ? "create" : "update";
}

export function emptyTraditionalHouseFormValues(): TraditionalHouseFormValues {
  return { ...EMPTY_VALUES };
}

export function traditionalHouseToFormValues(
  house: TraditionalHouseRecord,
): TraditionalHouseFormValues {
  return {
    name: house.name,
    summary: house.summary ?? "",
    description: house.description,
    history: house.history ?? "",
    cultural_significance: house.cultural_significance ?? "",
    location_name: house.location_name ?? "",
    latitude: house.latitude === null ? "" : String(house.latitude),
    longitude: house.longitude === null ? "" : String(house.longitude),
    google_maps_url: house.google_maps_url ?? "",
    visitor_information: house.visitor_information ?? "",
    is_featured: house.is_featured,
    display_order: String(house.display_order),
    status: house.status,
  };
}

export function createTraditionalHouseInitialState(
  house: TraditionalHouseRecord | null,
): TraditionalHouseActionState {
  return {
    kind: "idle",
    values: house
      ? traditionalHouseToFormValues(house)
      : emptyTraditionalHouseFormValues(),
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

export function validateTraditionalHouseInput(
  input: Record<string, unknown>,
  context: TraditionalHouseValidationContext,
): TraditionalHouseValidationResult {
  const values = emptyTraditionalHouseFormValues();
  const fieldErrors: TraditionalHouseFieldErrors = {};
  const formErrors: string[] = [];
  const provided = new Set<string>();

  for (const [field, rawValue] of Object.entries(input)) {
    if (field.startsWith("$ACTION_")) continue;
    if (!isFormField(field)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
      continue;
    }
    provided.add(field);
    if (field === "is_featured") {
      if (rawValue !== "on" && rawValue !== true && rawValue !== false) {
        fieldErrors.is_featured =
          "Rumah adat unggulan memiliki nilai yang tidak valid.";
      } else {
        values.is_featured = rawValue === "on" || rawValue === true;
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

  if (context.mode === "update" && !provided.has("status")) {
    fieldErrors.status = "Status publikasi wajib dikirim saat memperbarui.";
  }

  const name = values.name.trim();
  const description = values.description.trim();
  if (!name && !fieldErrors.name) {
    fieldErrors.name = "Nama rumah adat wajib diisi.";
  }
  if (!description && !fieldErrors.description) {
    fieldErrors.description = "Deskripsi wajib diisi.";
  }

  const latitude = parseCoordinate("latitude", values, fieldErrors);
  const longitude = parseCoordinate("longitude", values, fieldErrors);
  const hasLatitude = values.latitude.trim() !== "";
  const hasLongitude = values.longitude.trim() !== "";
  if (hasLatitude !== hasLongitude) {
    if (!hasLatitude) {
      fieldErrors.latitude = "Latitude wajib diisi jika longitude dicantumkan.";
    }
    if (!hasLongitude) {
      fieldErrors.longitude =
        "Longitude wajib diisi jika latitude dicantumkan.";
    }
  }

  const displayOrder = parseDisplayOrder(values, fieldErrors);
  const googleMapsUrl = optionalText(values.google_maps_url);
  if (googleMapsUrl) {
    try {
      const parsedUrl = new URL(googleMapsUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        fieldErrors.google_maps_url =
          "Tautan Google Maps harus menggunakan protokol http atau https.";
      }
    } catch {
      fieldErrors.google_maps_url = "Tautan Google Maps tidak valid.";
    }
  }

  const statusValue = values.status.trim();
  let status: TraditionalHouseStatus | null = null;
  if (!fieldErrors.status && isStatus(statusValue)) {
    status = statusValue;
    const allowed =
      context.mode === "create"
        ? getAllowedTraditionalHouseStatuses(null)
        : context.currentStatus === undefined
          ? null
          : getAllowedTraditionalHouseStatuses(context.currentStatus);
    if (allowed && !allowed.includes(status)) {
      fieldErrors.status = "Perubahan status publikasi tidak diizinkan.";
    }
  } else if (!fieldErrors.status) {
    fieldErrors.status = "Status publikasi tidak valid.";
  }

  if (status === "published") {
    if (context.hasThumbnail === false) {
      formErrors.push(
        "Rumah adat belum dapat diterbitkan karena gambar utama belum tersedia.",
      );
    }
    for (const [field, value] of [
      ["name", values.name],
      ["summary", values.summary],
      ["description", values.description],
      ["history", values.history],
      ["cultural_significance", values.cultural_significance],
      ["location_name", values.location_name],
      ["visitor_information", values.visitor_information],
    ] as const) {
      if (PLACEHOLDER_PATTERN.test(value)) {
        fieldErrors[field] =
          `${FIELD_LABELS[field]} masih memuat teks placeholder dan belum dapat diterbitkan.`;
      }
    }
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    formErrors.length > 0 ||
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
      name,
      summary: optionalText(values.summary),
      description,
      history: optionalText(values.history),
      cultural_significance: optionalText(values.cultural_significance),
      location_name: optionalText(values.location_name),
      latitude,
      longitude,
      google_maps_url: googleMapsUrl,
      visitor_information: optionalText(values.visitor_information),
      is_featured: values.is_featured,
      display_order: displayOrder,
      status,
    },
  };
}

export function validateTraditionalHouseFormData(
  formData: FormData,
  context: TraditionalHouseValidationContext,
) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  return validateTraditionalHouseInput(input, context);
}
