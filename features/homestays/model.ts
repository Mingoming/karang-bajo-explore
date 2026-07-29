export const HOMESTAY_FORM_FIELDS = [
  "name",
  "owner_name",
  "phone",
  "contact_consent_confirmed",
  "description",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "price_per_night",
  "price_note",
  "facilities",
  "is_featured",
  "display_order",
  "status",
] as const;

export const HOMESTAY_STATUSES = ["draft", "published", "archived"] as const;

export type HomestayFormField = (typeof HOMESTAY_FORM_FIELDS)[number];
export type HomestayStatus = (typeof HOMESTAY_STATUSES)[number];
export type HomestayMutationMode = "create" | "update";

export type HomestayRecord = {
  id: string;
  name: string;
  slug: string;
  owner_name: string | null;
  phone: string | null;
  contact_consent_confirmed: boolean;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  price_per_night: number | null;
  price_note: string | null;
  facilities: string[];
  thumbnail_path: string | null;
  thumbnail_bucket: string | null;
  status: HomestayStatus;
  published_at: string | null;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type HomestayListItem = {
  id: string;
  name: string;
  status: HomestayStatus;
  pricePerNight: number | null;
  address: string | null;
  displayOrder: number;
  updatedAt: string;
};

export type HomestayFormValues = {
  name: string;
  owner_name: string;
  phone: string;
  contact_consent_confirmed: boolean;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  google_maps_url: string;
  price_per_night: string;
  price_note: string;
  facilities: string;
  is_featured: boolean;
  display_order: string;
  status: string;
};

export type HomestayMutationValues = {
  name: string;
  owner_name: string | null;
  phone: string | null;
  contact_consent_confirmed: boolean;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  price_per_night: number | null;
  price_note: string | null;
  facilities: string[];
  is_featured: boolean;
  display_order: number;
  status: HomestayStatus;
};

export type HomestayInsertPayload = HomestayMutationValues & {
  slug: string;
  created_by: string;
  updated_by: string;
};

export type HomestayUpdatePayload = HomestayMutationValues & {
  updated_by: string;
};

export type HomestayFieldErrors = Partial<Record<HomestayFormField, string>>;

export type HomestayActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "duplicate-error"
    | "not-found"
    | "database-error";
  values: HomestayFormValues;
  fieldErrors: HomestayFieldErrors;
  formErrors: string[];
  message: string | null;
  revision: number;
};

export type HomestayValidationContext = {
  mode: HomestayMutationMode;
  currentStatus?: HomestayStatus;
  hasThumbnail?: boolean;
};

export type HomestayValidationResult =
  | {
      success: true;
      data: HomestayMutationValues;
      values: HomestayFormValues;
    }
  | {
      success: false;
      values: HomestayFormValues;
      fieldErrors: HomestayFieldErrors;
      formErrors: string[];
    };

const EMPTY_HOMESTAY_VALUES: HomestayFormValues = {
  name: "",
  owner_name: "",
  phone: "",
  contact_consent_confirmed: false,
  description: "",
  address: "",
  latitude: "",
  longitude: "",
  google_maps_url: "",
  price_per_night: "",
  price_note: "",
  facilities: "",
  is_featured: false,
  display_order: "0",
  status: "draft",
};

type HomestayBooleanField = "contact_consent_confirmed" | "is_featured";

const FIELD_LABELS: Record<HomestayFormField, string> = {
  name: "Nama homestay",
  owner_name: "Nama pemilik atau pengelola",
  phone: "Nomor telepon",
  contact_consent_confirmed: "Persetujuan publikasi kontak",
  description: "Deskripsi",
  address: "Alamat",
  latitude: "Latitude",
  longitude: "Longitude",
  google_maps_url: "Tautan Google Maps",
  price_per_night: "Harga per malam",
  price_note: "Catatan harga",
  facilities: "Fasilitas",
  is_featured: "Homestay unggulan",
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
const HOMESTAY_DUPLICATE_CONSTRAINTS = [
  "homestays_slug_key",
  "homestays_active_name_idx",
] as const;

function isHomestayFormField(value: string): value is HomestayFormField {
  return HOMESTAY_FORM_FIELDS.some((field) => field === value);
}

function isHomestayBooleanField(
  value: HomestayFormField,
): value is HomestayBooleanField {
  return value === "contact_consent_confirmed" || value === "is_featured";
}

function isHomestayStatus(value: string): value is HomestayStatus {
  return HOMESTAY_STATUSES.some((status) => status === value);
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

function parseOptionalCoordinate(
  field: "latitude" | "longitude",
  values: HomestayFormValues,
  fieldErrors: HomestayFieldErrors,
) {
  const rawValue = values[field].trim();

  if (fieldErrors[field] || rawValue === "") {
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
  values: HomestayFormValues,
  fieldErrors: HomestayFieldErrors,
) {
  const rawValue = values.price_per_night.trim();

  if (fieldErrors.price_per_night || rawValue === "") {
    return null;
  }

  if (!DECIMAL_PATTERN.test(rawValue)) {
    fieldErrors.price_per_night =
      "Harga per malam harus berupa angka yang valid.";
    return null;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    fieldErrors.price_per_night =
      "Harga per malam harus berupa angka yang valid.";
    return null;
  }

  if (parsedValue < 0) {
    fieldErrors.price_per_night =
      "Harga per malam tidak boleh bernilai negatif.";
    return null;
  }

  return parsedValue;
}

function parseDisplayOrder(
  values: HomestayFormValues,
  fieldErrors: HomestayFieldErrors,
) {
  const rawValue = values.display_order.trim();

  if (fieldErrors.display_order || !INTEGER_PATTERN.test(rawValue)) {
    fieldErrors.display_order = "Urutan tampilan harus berupa bilangan bulat.";
    return null;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || !Number.isSafeInteger(parsedValue)) {
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
    HomestayFormField,
    | "name"
    | "owner_name"
    | "phone"
    | "description"
    | "address"
    | "price_note"
    | "facilities"
  >,
  value: string,
  fieldErrors: HomestayFieldErrors,
) {
  if (PUBLICATION_PLACEHOLDER_PATTERN.test(value)) {
    fieldErrors[field] =
      `${FIELD_LABELS[field]} masih memuat teks placeholder dan belum dapat diterbitkan.`;
  }
}

export function isValidHomestayId(value: string) {
  return UUID_PATTERN.test(value);
}

export function normalizeHomestaySlug(name: string) {
  return name
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidHomestaySlug(value: string) {
  return SLUG_PATTERN.test(value);
}

export function isHomestayDuplicateConstraintError(
  code: string,
  diagnosticText: string,
) {
  return (
    code === "23505" &&
    HOMESTAY_DUPLICATE_CONSTRAINTS.some((constraint) =>
      diagnosticText.includes(constraint),
    )
  );
}

export function getAllowedHomestayStatuses(
  currentStatus: HomestayStatus | null,
): readonly HomestayStatus[] {
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

export function getHomestayStatusLabel(status: HomestayStatus) {
  const labels: Record<HomestayStatus, string> = {
    draft: "Draf",
    published: "Diterbitkan",
    archived: "Diarsipkan",
  };

  return labels[status];
}

export function getHomestayMutationMode(
  homestay: Pick<HomestayRecord, "id"> | null,
): HomestayMutationMode {
  return homestay === null ? "create" : "update";
}

export function emptyHomestayFormValues(): HomestayFormValues {
  return { ...EMPTY_HOMESTAY_VALUES };
}

export function homestayToFormValues(
  homestay: HomestayRecord,
): HomestayFormValues {
  return {
    name: homestay.name,
    owner_name: homestay.owner_name ?? "",
    phone: homestay.phone ?? "",
    contact_consent_confirmed: homestay.contact_consent_confirmed,
    description: homestay.description,
    address: homestay.address ?? "",
    latitude: homestay.latitude === null ? "" : String(homestay.latitude),
    longitude: homestay.longitude === null ? "" : String(homestay.longitude),
    google_maps_url: homestay.google_maps_url ?? "",
    price_per_night:
      homestay.price_per_night === null ? "" : String(homestay.price_per_night),
    price_note: homestay.price_note ?? "",
    facilities: homestay.facilities.join("\n"),
    is_featured: homestay.is_featured,
    display_order: String(homestay.display_order),
    status: homestay.status,
  };
}

export function createHomestayInitialState(
  homestay: HomestayRecord | null,
): HomestayActionState {
  return {
    kind: "idle",
    values: homestay
      ? homestayToFormValues(homestay)
      : emptyHomestayFormValues(),
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

export function validateHomestayInput(
  input: Record<string, unknown>,
  context: HomestayValidationContext,
): HomestayValidationResult {
  const values = emptyHomestayFormValues();
  const fieldErrors: HomestayFieldErrors = {};
  const formErrors: string[] = [];
  const providedFields = new Set<string>();

  for (const [field, rawValue] of Object.entries(input)) {
    if (field.startsWith("$ACTION_")) {
      continue;
    }

    if (!isHomestayFormField(field)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
      continue;
    }

    providedFields.add(field);

    if (isHomestayBooleanField(field)) {
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
  const description = values.description.trim();

  if (name === "" && !fieldErrors.name) {
    fieldErrors.name = "Nama homestay wajib diisi.";
  }
  if (description === "" && !fieldErrors.description) {
    fieldErrors.description = "Deskripsi wajib diisi.";
  }

  const latitude = parseOptionalCoordinate("latitude", values, fieldErrors);
  const longitude = parseOptionalCoordinate("longitude", values, fieldErrors);
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

  const pricePerNight = parseNullablePrice(values, fieldErrors);
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
  let status: HomestayStatus | null = null;

  if (fieldErrors.status) {
    status = null;
  } else if (!isHomestayStatus(statusValue)) {
    fieldErrors.status = "Status publikasi tidak valid.";
  } else {
    status = statusValue;
    const allowedStatuses =
      context.mode === "create"
        ? getAllowedHomestayStatuses(null)
        : context.currentStatus === undefined
          ? null
          : getAllowedHomestayStatuses(context.currentStatus);

    if (allowedStatuses && !allowedStatuses.includes(status)) {
      fieldErrors.status = "Perubahan status publikasi tidak diizinkan.";
    }
  }

  const ownerName = normalizeOptionalText(values.owner_name);
  const phone = normalizeOptionalText(values.phone);
  const address = normalizeOptionalText(values.address);
  const priceNote = normalizeOptionalText(values.price_note);
  const facilities = values.facilities
    .split(/\r?\n/)
    .map((facility) => facility.trim())
    .filter((facility) => facility !== "");

  if (status === "published") {
    if (context.hasThumbnail === false) {
      formErrors.push(
        "Homestay belum dapat diterbitkan karena gambar utama belum tersedia.",
      );
    }

    if (
      (ownerName !== null || phone !== null) &&
      !values.contact_consent_confirmed
    ) {
      fieldErrors.contact_consent_confirmed =
        "Konfirmasi persetujuan wajib dicatat sebelum kontak diterbitkan.";
    }

    validatePublicationText("name", values.name, fieldErrors);
    validatePublicationText("owner_name", values.owner_name, fieldErrors);
    validatePublicationText("phone", values.phone, fieldErrors);
    validatePublicationText("description", values.description, fieldErrors);
    validatePublicationText("address", values.address, fieldErrors);
    validatePublicationText("price_note", values.price_note, fieldErrors);
    validatePublicationText("facilities", values.facilities, fieldErrors);
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
      owner_name: ownerName,
      phone,
      contact_consent_confirmed: values.contact_consent_confirmed,
      description,
      address,
      latitude,
      longitude,
      google_maps_url: googleMapsUrl,
      price_per_night: pricePerNight,
      price_note: priceNote,
      facilities,
      is_featured: values.is_featured,
      display_order: displayOrder,
      status,
    },
  };
}

export function validateHomestayFormData(
  formData: FormData,
  context: HomestayValidationContext,
): HomestayValidationResult {
  const input: Record<string, unknown> = {};

  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }

  return validateHomestayInput(input, context);
}
