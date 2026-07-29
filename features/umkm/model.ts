export const UMKM_FORM_FIELDS = [
  "business_name",
  "owner_name",
  "category",
  "description",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "contact_name",
  "contact_phone",
  "contact_whatsapp",
  "contact_consent_confirmed",
  "is_featured",
  "display_order",
  "status",
] as const;

export const UMKM_STATUSES = ["draft", "published", "archived"] as const;

export type UmkmFormField = (typeof UMKM_FORM_FIELDS)[number];
export type UmkmStatus = (typeof UMKM_STATUSES)[number];
export type UmkmMutationMode = "create" | "update";

export type UmkmRecord = {
  id: string;
  business_name: string;
  slug: string;
  owner_name: string | null;
  category: string;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_consent_confirmed: boolean;
  thumbnail_path: string | null;
  thumbnail_bucket: string | null;
  status: UmkmStatus;
  published_at: string | null;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type UmkmListItem = {
  id: string;
  businessName: string;
  category: string;
  status: UmkmStatus;
  address: string | null;
  displayOrder: number;
  updatedAt: string;
};

export type UmkmFormValues = {
  business_name: string;
  owner_name: string;
  category: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  google_maps_url: string;
  contact_name: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_consent_confirmed: boolean;
  is_featured: boolean;
  display_order: string;
  status: string;
};

export type UmkmMutationValues = {
  business_name: string;
  owner_name: string | null;
  category: string;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_consent_confirmed: boolean;
  is_featured: boolean;
  display_order: number;
  status: UmkmStatus;
};

export type UmkmInsertPayload = UmkmMutationValues & {
  slug: string;
  created_by: string;
  updated_by: string;
};

export type UmkmUpdatePayload = UmkmMutationValues & { updated_by: string };
export type UmkmFieldErrors = Partial<Record<UmkmFormField, string>>;

export type UmkmActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "duplicate-error"
    | "not-found"
    | "database-error";
  values: UmkmFormValues;
  fieldErrors: UmkmFieldErrors;
  formErrors: string[];
  message: string | null;
  revision: number;
};

export type UmkmValidationContext = {
  mode: UmkmMutationMode;
  currentStatus?: UmkmStatus;
  hasThumbnail?: boolean;
};

export type UmkmValidationResult =
  | { success: true; data: UmkmMutationValues; values: UmkmFormValues }
  | {
      success: false;
      values: UmkmFormValues;
      fieldErrors: UmkmFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: UmkmFormValues = {
  business_name: "",
  owner_name: "",
  category: "",
  description: "",
  address: "",
  latitude: "",
  longitude: "",
  google_maps_url: "",
  contact_name: "",
  contact_phone: "",
  contact_whatsapp: "",
  contact_consent_confirmed: false,
  is_featured: false,
  display_order: "0",
  status: "draft",
};

type BooleanField = "contact_consent_confirmed" | "is_featured";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const INTEGER_PATTERN = /^[+-]?\d+$/;
const PLACEHOLDER_PATTERN =
  /\b(?:lorem ipsum|tbd|todo|isi nanti|belum diisi)\b/i;
const DUPLICATE_CONSTRAINTS = [
  "umkms_slug_key",
  "umkms_active_name_idx",
] as const;

const FIELD_LABELS: Record<UmkmFormField, string> = {
  business_name: "Nama usaha",
  owner_name: "Nama pemilik atau pengelola",
  category: "Kategori",
  description: "Deskripsi",
  address: "Alamat",
  latitude: "Latitude",
  longitude: "Longitude",
  google_maps_url: "Tautan Google Maps",
  contact_name: "Nama kontak",
  contact_phone: "Nomor telepon",
  contact_whatsapp: "Nomor WhatsApp",
  contact_consent_confirmed: "Persetujuan publikasi kontak",
  is_featured: "UMKM unggulan",
  display_order: "Urutan tampilan",
  status: "Status publikasi",
};

function isFormField(value: string): value is UmkmFormField {
  return UMKM_FORM_FIELDS.some((field) => field === value);
}

function isBooleanField(value: UmkmFormField): value is BooleanField {
  return value === "contact_consent_confirmed" || value === "is_featured";
}

function isStatus(value: string): value is UmkmStatus {
  return UMKM_STATUSES.some((status) => status === value);
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseCoordinate(
  field: "latitude" | "longitude",
  values: UmkmFormValues,
  errors: UmkmFieldErrors,
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

function parseDisplayOrder(values: UmkmFormValues, errors: UmkmFieldErrors) {
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

export function isValidUmkmId(value: string) {
  return UUID_PATTERN.test(value);
}

export function normalizeUmkmSlug(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidUmkmSlug(value: string) {
  return SLUG_PATTERN.test(value);
}

export function isUmkmDuplicateConstraintError(
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

export function getAllowedUmkmStatuses(
  currentStatus: UmkmStatus | null,
): readonly UmkmStatus[] {
  if (currentStatus === null) return ["draft"];
  if (currentStatus === "published") return ["published", "archived"];
  if (currentStatus === "archived") return ["archived", "draft"];
  return ["draft", "published", "archived"];
}

export function getUmkmStatusLabel(status: UmkmStatus) {
  return { draft: "Draf", published: "Diterbitkan", archived: "Diarsipkan" }[
    status
  ];
}

export function getUmkmMutationMode(
  umkm: Pick<UmkmRecord, "id"> | null,
): UmkmMutationMode {
  return umkm === null ? "create" : "update";
}

export function emptyUmkmFormValues(): UmkmFormValues {
  return { ...EMPTY_VALUES };
}

export function umkmToFormValues(umkm: UmkmRecord): UmkmFormValues {
  return {
    business_name: umkm.business_name,
    owner_name: umkm.owner_name ?? "",
    category: umkm.category,
    description: umkm.description,
    address: umkm.address ?? "",
    latitude: umkm.latitude === null ? "" : String(umkm.latitude),
    longitude: umkm.longitude === null ? "" : String(umkm.longitude),
    google_maps_url: umkm.google_maps_url ?? "",
    contact_name: umkm.contact_name ?? "",
    contact_phone: umkm.contact_phone ?? "",
    contact_whatsapp: umkm.contact_whatsapp ?? "",
    contact_consent_confirmed: umkm.contact_consent_confirmed,
    is_featured: umkm.is_featured,
    display_order: String(umkm.display_order),
    status: umkm.status,
  };
}

export function createUmkmInitialState(
  umkm: UmkmRecord | null,
): UmkmActionState {
  return {
    kind: "idle",
    values: umkm ? umkmToFormValues(umkm) : emptyUmkmFormValues(),
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

export function validateUmkmInput(
  input: Record<string, unknown>,
  context: UmkmValidationContext,
): UmkmValidationResult {
  const values = emptyUmkmFormValues();
  const fieldErrors: UmkmFieldErrors = {};
  const formErrors: string[] = [];
  const provided = new Set<string>();

  for (const [field, rawValue] of Object.entries(input)) {
    if (field.startsWith("$ACTION_")) continue;
    if (!isFormField(field)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
      continue;
    }
    provided.add(field);
    if (isBooleanField(field)) {
      if (rawValue !== "on" && rawValue !== true && rawValue !== false) {
        fieldErrors[field] =
          `${FIELD_LABELS[field]} memiliki nilai yang tidak valid.`;
      } else if (field === "contact_consent_confirmed") {
        values.contact_consent_confirmed =
          rawValue === "on" || rawValue === true;
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

  const businessName = values.business_name.trim();
  const category = values.category.trim();
  const description = values.description.trim();
  if (!businessName && !fieldErrors.business_name)
    fieldErrors.business_name = "Nama usaha wajib diisi.";
  if (!category && !fieldErrors.category)
    fieldErrors.category = "Kategori wajib diisi.";
  if (!description && !fieldErrors.description)
    fieldErrors.description = "Deskripsi wajib diisi.";

  const latitude = parseCoordinate("latitude", values, fieldErrors);
  const longitude = parseCoordinate("longitude", values, fieldErrors);
  const hasLatitude = values.latitude.trim() !== "";
  const hasLongitude = values.longitude.trim() !== "";
  if (hasLatitude !== hasLongitude) {
    if (!hasLatitude)
      fieldErrors.latitude = "Latitude wajib diisi jika longitude dicantumkan.";
    if (!hasLongitude)
      fieldErrors.longitude =
        "Longitude wajib diisi jika latitude dicantumkan.";
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
  let status: UmkmStatus | null = null;
  if (!fieldErrors.status && isStatus(statusValue)) {
    status = statusValue;
    const allowed =
      context.mode === "create"
        ? getAllowedUmkmStatuses(null)
        : context.currentStatus === undefined
          ? null
          : getAllowedUmkmStatuses(context.currentStatus);
    if (allowed && !allowed.includes(status)) {
      fieldErrors.status = "Perubahan status publikasi tidak diizinkan.";
    }
  } else if (!fieldErrors.status) {
    fieldErrors.status = "Status publikasi tidak valid.";
  }

  const ownerName = optionalText(values.owner_name);
  const address = optionalText(values.address);
  const contactName = optionalText(values.contact_name);
  const contactPhone = optionalText(values.contact_phone);
  const contactWhatsapp = optionalText(values.contact_whatsapp);

  if (status === "published") {
    if (context.hasThumbnail === false) {
      formErrors.push(
        "UMKM belum dapat diterbitkan karena gambar utama belum tersedia.",
      );
    }
    if (
      latitude === null &&
      contactPhone === null &&
      contactWhatsapp === null
    ) {
      formErrors.push(
        "Publikasi memerlukan lokasi berkoordinat, nomor telepon, atau nomor WhatsApp.",
      );
    }
    if (
      (ownerName || contactName || contactPhone || contactWhatsapp) &&
      !values.contact_consent_confirmed
    ) {
      fieldErrors.contact_consent_confirmed =
        "Konfirmasi persetujuan wajib dicatat sebelum data pemilik atau kontak diterbitkan.";
    }
    for (const [field, value] of [
      ["business_name", values.business_name],
      ["owner_name", values.owner_name],
      ["category", values.category],
      ["description", values.description],
      ["address", values.address],
      ["contact_name", values.contact_name],
      ["contact_phone", values.contact_phone],
      ["contact_whatsapp", values.contact_whatsapp],
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
      business_name: businessName,
      owner_name: ownerName,
      category,
      description,
      address,
      latitude,
      longitude,
      google_maps_url: googleMapsUrl,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_whatsapp: contactWhatsapp,
      contact_consent_confirmed: values.contact_consent_confirmed,
      is_featured: values.is_featured,
      display_order: displayOrder,
      status,
    },
  };
}

export function validateUmkmFormData(
  formData: FormData,
  context: UmkmValidationContext,
) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  return validateUmkmInput(input, context);
}
