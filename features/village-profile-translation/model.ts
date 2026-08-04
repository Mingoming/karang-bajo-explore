import type {
  VillageProfileRecord,
  VillageProfileStatus,
} from "../village-profile/model";

export const ENGLISH_VILLAGE_PROFILE_TRANSLATION_FIELDS = [
  "name",
  "summary",
  "description",
  "history",
  "vision",
  "mission",
  "address",
] as const;

export type EnglishVillageProfileTranslationField =
  (typeof ENGLISH_VILLAGE_PROFILE_TRANSLATION_FIELDS)[number];

export type EnglishVillageProfileTranslationStatus =
  "draft" | "published" | "archived";

export type EnglishVillageProfileTranslationFreshness =
  "not-applicable" | "current" | "stale";

export type EnglishVillageProfileTranslationSource = Pick<
  VillageProfileRecord,
  | "id"
  | "name"
  | "summary"
  | "description"
  | "history"
  | "vision"
  | "mission"
  | "address"
  | "status"
  | "updated_at"
>;

export function toEnglishVillageProfileTranslationSource(
  profile: VillageProfileRecord,
): EnglishVillageProfileTranslationSource {
  return {
    id: profile.id,
    name: profile.name,
    summary: profile.summary,
    description: profile.description,
    history: profile.history,
    vision: profile.vision,
    mission: profile.mission,
    address: profile.address,
    status: profile.status,
    updated_at: profile.updated_at,
  };
}
export type EnglishVillageProfileTranslationRecord = {
  id: string;
  village_profile_id: string;
  locale: "en";
  name: string | null;
  summary: string | null;
  description: string | null;
  history: string | null;
  vision: string | null;
  mission: string | null;
  address: string | null;
  status: EnglishVillageProfileTranslationStatus;
  source_updated_at_at_publish: string | null;
  published_at: string | null;
  updated_at: string;
};

export type EnglishVillageProfileTranslationFormValues = Record<
  EnglishVillageProfileTranslationField,
  string
>;

export type EnglishVillageProfileTranslationMutationValues = Record<
  EnglishVillageProfileTranslationField,
  string | null
>;

export type EnglishVillageProfileTranslationFieldErrors = Partial<
  Record<EnglishVillageProfileTranslationField, string>
>;

export type EnglishVillageProfileTranslationActionState = {
  kind: "idle" | "validation-error" | "database-error" | "success";
  values: EnglishVillageProfileTranslationFormValues;
  fieldErrors: EnglishVillageProfileTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  revision: number;
  status: EnglishVillageProfileTranslationStatus | null;
  freshness: EnglishVillageProfileTranslationFreshness;
  sourceStatus: VillageProfileStatus | null;
  publishedAt: string | null;
};

export type EnglishVillageProfileTranslationValidationResult =
  | {
      success: true;
      values: EnglishVillageProfileTranslationFormValues;
      data: EnglishVillageProfileTranslationMutationValues;
    }
  | {
      success: false;
      values: EnglishVillageProfileTranslationFormValues;
      fieldErrors: EnglishVillageProfileTranslationFieldErrors;
      formErrors: string[];
    };

export type EnglishVillageProfileTranslationPublishValidationResult =
  | { success: true }
  | {
      success: false;
      fieldErrors: EnglishVillageProfileTranslationFieldErrors;
      formErrors: string[];
    };

type ActionStateOptions = {
  kind?: EnglishVillageProfileTranslationActionState["kind"];
  values?: EnglishVillageProfileTranslationFormValues;
  fieldErrors?: EnglishVillageProfileTranslationFieldErrors;
  formErrors?: string[];
  message?: string | null;
  revision?: number;
};

const EMPTY_VALUES: EnglishVillageProfileTranslationFormValues = {
  name: "",
  summary: "",
  description: "",
  history: "",
  vision: "",
  mission: "",
  address: "",
};

const FIELD_LABELS: Record<EnglishVillageProfileTranslationField, string> = {
  name: "Nama desa dalam bahasa Inggris",
  summary: "Ringkasan bahasa Inggris",
  description: "Deskripsi bahasa Inggris",
  history: "Sejarah bahasa Inggris",
  vision: "Visi bahasa Inggris",
  mission: "Misi bahasa Inggris",
  address: "Alamat bahasa Inggris",
};

const CONDITIONAL_PUBLISH_FIELDS = [
  "summary",
  "history",
  "vision",
  "mission",
  "address",
] as const;

function isTranslationField(
  value: string,
): value is EnglishVillageProfileTranslationField {
  return ENGLISH_VILLAGE_PROFILE_TRANSLATION_FIELDS.some(
    (field) => field === value,
  );
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

function hasText(value: string | null) {
  return value !== null && value.trim() !== "";
}

export function emptyEnglishVillageProfileTranslationFormValues(): EnglishVillageProfileTranslationFormValues {
  return { ...EMPTY_VALUES };
}

export function englishVillageProfileTranslationToFormValues(
  translation: EnglishVillageProfileTranslationRecord | null,
): EnglishVillageProfileTranslationFormValues {
  if (!translation) {
    return emptyEnglishVillageProfileTranslationFormValues();
  }

  return {
    name: translation.name ?? "",
    summary: translation.summary ?? "",
    description: translation.description ?? "",
    history: translation.history ?? "",
    vision: translation.vision ?? "",
    mission: translation.mission ?? "",
    address: translation.address ?? "",
  };
}

export function validateEnglishVillageProfileTranslationInput(
  input: Record<string, unknown>,
): EnglishVillageProfileTranslationValidationResult {
  const values = emptyEnglishVillageProfileTranslationFormValues();
  const fieldErrors: EnglishVillageProfileTranslationFieldErrors = {};
  const formErrors: string[] = [];

  for (const [field, rawValue] of Object.entries(input)) {
    if (field.startsWith("$ACTION_") || field === "intent") {
      continue;
    }

    if (!isTranslationField(field)) {
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

  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
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
      name: normalizeOptionalText(values.name),
      summary: normalizeOptionalText(values.summary),
      description: normalizeOptionalText(values.description),
      history: normalizeOptionalText(values.history),
      vision: normalizeOptionalText(values.vision),
      mission: normalizeOptionalText(values.mission),
      address: normalizeOptionalText(values.address),
    },
  };
}

export function validateEnglishVillageProfileTranslationFormData(
  formData: FormData,
): EnglishVillageProfileTranslationValidationResult {
  const input: Record<string, unknown> = {};

  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }

  return validateEnglishVillageProfileTranslationInput(input);
}

export function validateEnglishVillageProfileTranslationForPublish(
  source: EnglishVillageProfileTranslationSource,
  values: EnglishVillageProfileTranslationMutationValues,
): EnglishVillageProfileTranslationPublishValidationResult {
  const fieldErrors: EnglishVillageProfileTranslationFieldErrors = {};
  const formErrors: string[] = [];

  if (source.status !== "published") {
    formErrors.push(
      "Profil desa Indonesia harus diterbitkan sebelum terjemahan Inggris dapat diterbitkan.",
    );
  }

  if (!hasText(values.name)) {
    fieldErrors.name =
      "Nama desa dalam bahasa Inggris wajib diisi sebelum publikasi.";
  }

  if (!hasText(values.description)) {
    fieldErrors.description =
      "Deskripsi bahasa Inggris wajib diisi sebelum publikasi.";
  }

  for (const field of CONDITIONAL_PUBLISH_FIELDS) {
    if (hasText(source[field]) && !hasText(values[field])) {
      fieldErrors[field] =
        `${FIELD_LABELS[field]} wajib diisi karena sumber Indonesia memiliki konten pada bagian ini.`;
    }
  }

  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
    return {
      success: false,
      fieldErrors,
      formErrors,
    };
  }

  return { success: true };
}

export function getEnglishVillageProfileTranslationFreshness(
  source: EnglishVillageProfileTranslationSource | null,
  translation: EnglishVillageProfileTranslationRecord | null,
): EnglishVillageProfileTranslationFreshness {
  if (
    !source ||
    !translation ||
    translation.status !== "published" ||
    translation.source_updated_at_at_publish === null
  ) {
    return "not-applicable";
  }

  return translation.source_updated_at_at_publish === source.updated_at
    ? "current"
    : "stale";
}

export function isEnglishVillageProfileTranslationEditable(
  status: EnglishVillageProfileTranslationStatus | null,
) {
  return status === null || status === "draft";
}

export function getEnglishVillageProfileTranslationStatusLabel(
  status: EnglishVillageProfileTranslationStatus | null,
  freshness: EnglishVillageProfileTranslationFreshness,
) {
  if (status === null) return "Belum ada terjemahan";
  if (status === "draft") return "Draf";
  if (status === "archived") return "Diarsipkan";
  return freshness === "current"
    ? "Diterbitkan - terkini"
    : "Diterbitkan - perlu ditinjau ulang";
}

export function createEnglishVillageProfileTranslationActionState(
  source: EnglishVillageProfileTranslationSource | null,
  translation: EnglishVillageProfileTranslationRecord | null,
  options: ActionStateOptions = {},
): EnglishVillageProfileTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values:
      options.values ??
      englishVillageProfileTranslationToFormValues(translation),
    fieldErrors: options.fieldErrors ?? {},
    formErrors: options.formErrors ?? [],
    message: options.message ?? null,
    revision: options.revision ?? 0,
    status: translation?.status ?? null,
    freshness: getEnglishVillageProfileTranslationFreshness(
      source,
      translation,
    ),
    sourceStatus: source?.status ?? null,
    publishedAt: translation?.published_at ?? null,
  };
}
