export const VILLAGE_PROFILE_EDITABLE_FIELDS = [
  "name",
  "summary",
  "description",
  "history",
  "vision",
  "mission",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "status",
] as const;

export type VillageProfileEditableField =
  (typeof VILLAGE_PROFILE_EDITABLE_FIELDS)[number];

export type VillageProfileStatus = "draft" | "published" | "archived";

export type VillageProfileRecord = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string | null;
  history: string | null;
  vision: string | null;
  mission: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  status: VillageProfileStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
};

export type VillageProfileFormValues = Record<
  VillageProfileEditableField,
  string
>;

export type VillageProfileMutationValues = {
  name: string;
  summary: string | null;
  description: string | null;
  history: string | null;
  vision: string | null;
  mission: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  status: VillageProfileStatus;
};

export type VillageProfileInsertPayload = VillageProfileMutationValues & {
  slug: string;
  created_by: string;
  updated_by: string;
};

export type VillageProfileUpdatePayload = VillageProfileMutationValues & {
  updated_by: string;
};

export type VillageProfileFieldErrors = Partial<
  Record<VillageProfileEditableField, string>
>;

export type VillageProfileActionState = {
  kind: "idle" | "validation-error" | "database-error" | "success";
  values: VillageProfileFormValues;
  fieldErrors: VillageProfileFieldErrors;
  formErrors: string[];
  message: string | null;
  revision: number;
};

export type VillageProfileValidationResult =
  | {
      success: true;
      data: VillageProfileMutationValues;
      values: VillageProfileFormValues;
    }
  | {
      success: false;
      values: VillageProfileFormValues;
      fieldErrors: VillageProfileFieldErrors;
      formErrors: string[];
    };

type VillageProfileValidationContext = {
  currentStatus?: VillageProfileStatus | null;
};

const EMPTY_VALUES: VillageProfileFormValues = {
  name: "",
  summary: "",
  description: "",
  history: "",
  vision: "",
  mission: "",
  address: "",
  latitude: "",
  longitude: "",
  google_maps_url: "",
  status: "draft",
};

const FIELD_LABELS: Record<VillageProfileEditableField, string> = {
  name: "Nama desa",
  summary: "Ringkasan",
  description: "Deskripsi",
  history: "Sejarah",
  vision: "Visi",
  mission: "Misi",
  address: "Alamat",
  latitude: "Latitude",
  longitude: "Longitude",
  google_maps_url: "Tautan Google Maps",
  status: "Status publikasi",
};

function isEditableField(value: string): value is VillageProfileEditableField {
  return VILLAGE_PROFILE_EDITABLE_FIELDS.some((field) => field === value);
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

function parseCoordinate(
  field: "latitude" | "longitude",
  values: VillageProfileFormValues,
  fieldErrors: VillageProfileFieldErrors,
) {
  const rawValue = values[field].trim();

  if (rawValue === "") {
    return null;
  }

  const parsedValue = Number(rawValue);
  const minimum = field === "latitude" ? -90 : -180;
  const maximum = field === "latitude" ? 90 : 180;

  if (!Number.isFinite(parsedValue)) {
    fieldErrors[field] = `${FIELD_LABELS[field]} harus berupa angka.`;
    return null;
  }

  if (parsedValue < minimum || parsedValue > maximum) {
    fieldErrors[field] =
      `${FIELD_LABELS[field]} harus berada di antara ${minimum} dan ${maximum}.`;
    return null;
  }

  return parsedValue;
}

export function emptyVillageProfileFormValues(): VillageProfileFormValues {
  return { ...EMPTY_VALUES };
}

export function villageProfileToFormValues(
  profile: VillageProfileRecord | null,
): VillageProfileFormValues {
  if (!profile) {
    return emptyVillageProfileFormValues();
  }

  return {
    name: profile.name,
    summary: profile.summary ?? "",
    description: profile.description ?? "",
    history: profile.history ?? "",
    vision: profile.vision ?? "",
    mission: profile.mission ?? "",
    address: profile.address ?? "",
    latitude: profile.latitude === null ? "" : String(profile.latitude),
    longitude: profile.longitude === null ? "" : String(profile.longitude),
    google_maps_url: profile.google_maps_url ?? "",
    status: profile.status,
  };
}

export function getAllowedVillageProfileStatuses(
  currentStatus: VillageProfileStatus | null,
): readonly VillageProfileStatus[] {
  if (currentStatus === null) return ["draft"];
  if (currentStatus === "published") return ["published", "archived"];
  if (currentStatus === "archived") return ["archived", "draft"];
  return ["draft", "published", "archived"];
}

export function getVillageProfileStatusLabel(status: VillageProfileStatus) {
  const labels: Record<VillageProfileStatus, string> = {
    draft: "Draf",
    published: "Diterbitkan",
    archived: "Diarsipkan",
  };
  return labels[status];
}

function isVillageProfileStatus(value: string): value is VillageProfileStatus {
  return value === "draft" || value === "published" || value === "archived";
}

export function createVillageProfileInitialState(
  profile: VillageProfileRecord | null,
): VillageProfileActionState {
  return {
    kind: "idle",
    values: villageProfileToFormValues(profile),
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

export function validateVillageProfileInput(
  input: Record<string, unknown>,
  context: VillageProfileValidationContext = {},
): VillageProfileValidationResult {
  const values = emptyVillageProfileFormValues();
  const fieldErrors: VillageProfileFieldErrors = {};
  const formErrors: string[] = [];

  for (const [field, rawValue] of Object.entries(input)) {
    if (field.startsWith("$ACTION_")) {
      continue;
    }

    if (!isEditableField(field)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
      continue;
    }

    if (typeof rawValue !== "string") {
      fieldErrors[field] =
        `${FIELD_LABELS[field]} memiliki nilai yang tidak valid.`;
      continue;
    }

    values[field] = rawValue;
  }

  const name = values.name.trim();

  if (name === "" && !fieldErrors.name) {
    fieldErrors.name = "Nama desa wajib diisi.";
  }

  const latitude = parseCoordinate("latitude", values, fieldErrors);
  const longitude = parseCoordinate("longitude", values, fieldErrors);

  if ((latitude === null) !== (longitude === null)) {
    if (latitude === null && !fieldErrors.latitude) {
      fieldErrors.latitude = "Latitude wajib diisi jika longitude dicantumkan.";
    }

    if (longitude === null && !fieldErrors.longitude) {
      fieldErrors.longitude =
        "Longitude wajib diisi jika latitude dicantumkan.";
    }
  }

  const googleMapsUrl = normalizeOptionalText(values.google_maps_url);
  const description = normalizeOptionalText(values.description);
  const statusValue = values.status.trim();
  let status: VillageProfileStatus | null = null;

  if (!isVillageProfileStatus(statusValue)) {
    fieldErrors.status = "Status publikasi tidak valid.";
  } else {
    status = statusValue;
    if (
      context.currentStatus !== undefined &&
      !getAllowedVillageProfileStatuses(context.currentStatus).includes(status)
    ) {
      fieldErrors.status = "Perubahan status publikasi tidak diizinkan.";
    }
  }

  if (status === "published" && description === null) {
    fieldErrors.description =
      "Deskripsi wajib diisi sebelum profil diterbitkan.";
  }

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

  if (
    status === null ||
    Object.keys(fieldErrors).length > 0 ||
    formErrors.length > 0
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
      summary: normalizeOptionalText(values.summary),
      description,
      history: normalizeOptionalText(values.history),
      vision: normalizeOptionalText(values.vision),
      mission: normalizeOptionalText(values.mission),
      address: normalizeOptionalText(values.address),
      latitude,
      longitude,
      google_maps_url: googleMapsUrl,
      status,
    },
  };
}

export function validateVillageProfileFormData(
  formData: FormData,
  context: VillageProfileValidationContext = {},
): VillageProfileValidationResult {
  const input: Record<string, unknown> = {};

  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }

  return validateVillageProfileInput(input, context);
}

export function getVillageProfileMutationMode(
  existingProfile: Pick<VillageProfileRecord, "id"> | null,
) {
  return existingProfile === null ? "create" : "update";
}

export function createVillageProfileSlug(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "profil-desa";
}
