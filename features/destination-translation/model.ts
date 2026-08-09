import type {
  DestinationRecord,
  DestinationStatus,
} from "../destinations/model";

export const DESTINATION_TRANSLATION_FIELDS = [
  "name",
  "summary",
  "description",
  "history",
  "opening_hours",
  "price_note",
  "facilities",
  "thumbnail_alt_text",
] as const;

export type DestinationTranslationField =
  (typeof DESTINATION_TRANSLATION_FIELDS)[number];

export type DestinationTranslationStatus = "draft" | "published" | "archived";

export type DestinationTranslationReviewState =
  "pending" | "reviewed" | "rejected";

export type DestinationTranslationPublicEligibility =
  "eligible" | "blocked" | "unknown";

export type DestinationTranslationLifecycleStatus =
  "draft" | "awaiting-review" | "reviewed" | "published" | "stale" | "archived";

export type DestinationTranslationSource = Pick<
  DestinationRecord,
  | "id"
  | "name"
  | "summary"
  | "description"
  | "history"
  | "opening_hours"
  | "price_note"
  | "facilities"
  | "status"
  | "updated_at"
> & {
  hasThumbnail: boolean;
};

export type DestinationTranslationRecord = {
  id: string;
  destination_id: string;
  locale: "en";
  name: string;
  summary: string;
  description: string;
  history: string | null;
  opening_hours: string | null;
  price_note: string | null;
  facilities: string[];
  thumbnail_alt_text: string;
  translation_status: DestinationTranslationStatus;
  review_state: DestinationTranslationReviewState;
  review_reason: string | null;
  rejected_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
  edit_revision: number;
};

export type DestinationTranslationRpcRow = Pick<
  DestinationTranslationRecord,
  | "id"
  | "destination_id"
  | "translation_status"
  | "review_state"
  | "review_reason"
  | "rejected_at"
  | "published_at"
  | "archived_at"
  | "reviewed_at"
  | "edit_revision"
  | "updated_at"
>;

export type DestinationTranslationReviewEvent = {
  id: string;
  event_type:
    | "draft_saved"
    | "reviewed"
    | "rejected"
    | "published"
    | "republished"
    | "unpublished"
    | "archived"
    | "restored"
    | "source_changed"
    | "source_blocked";
  previous_translation_status: DestinationTranslationStatus;
  new_translation_status: DestinationTranslationStatus;
  previous_review_state: DestinationTranslationReviewState;
  new_review_state: DestinationTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type DestinationTranslationFormValues = Record<
  DestinationTranslationField,
  string
>;

export type DestinationTranslationMutationValues = {
  name: string | null;
  summary: string | null;
  description: string | null;
  history: string | null;
  opening_hours: string | null;
  price_note: string | null;
  facilities: string[];
  thumbnail_alt_text: string | null;
};

export type DestinationTranslationFieldErrors = Partial<
  Record<DestinationTranslationField, string>
>;

export type DestinationTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: DestinationTranslationFormValues;
  fieldErrors: DestinationTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: DestinationTranslationStatus | null;
  reviewState: DestinationTranslationReviewState | null;
  sourceStatus: DestinationStatus | null;
  publicEligibility: DestinationTranslationPublicEligibility;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: DestinationTranslationReviewEvent[];
};

export type DestinationTranslationValidationResult =
  | {
      success: true;
      values: DestinationTranslationFormValues;
      data: DestinationTranslationMutationValues;
    }
  | {
      success: false;
      values: DestinationTranslationFormValues;
      fieldErrors: DestinationTranslationFieldErrors;
      formErrors: string[];
    };

export type DestinationTranslationEligibilityValidationResult =
  | { success: true }
  | {
      success: false;
      fieldErrors: DestinationTranslationFieldErrors;
      formErrors: string[];
    };

type ActionStateOptions = {
  kind?: DestinationTranslationActionState["kind"];
  values?: DestinationTranslationFormValues;
  fieldErrors?: DestinationTranslationFieldErrors;
  formErrors?: string[];
  message?: string | null;
  rejectionReason?: string;
  revision?: number;
};

const EMPTY_VALUES: DestinationTranslationFormValues = {
  name: "",
  summary: "",
  description: "",
  history: "",
  opening_hours: "",
  price_note: "",
  facilities: "",
  thumbnail_alt_text: "",
};

const FIELD_LABELS: Record<DestinationTranslationField, string> = {
  name: "Nama destinasi dalam bahasa Inggris",
  summary: "Ringkasan bahasa Inggris",
  description: "Deskripsi bahasa Inggris",
  history: "Sejarah bahasa Inggris",
  opening_hours: "Jam kunjungan bahasa Inggris",
  price_note: "Catatan harga bahasa Inggris",
  facilities: "Fasilitas bahasa Inggris",
  thumbnail_alt_text: "Alt text gambar utama bahasa Inggris",
};

const ALWAYS_REQUIRED_FIELDS = [
  "name",
  "summary",
  "description",
  "thumbnail_alt_text",
] as const satisfies readonly DestinationTranslationField[];

const SOURCE_PARITY_FIELDS = [
  "history",
  "opening_hours",
  "price_note",
] as const satisfies readonly DestinationTranslationField[];

function isTranslationField(
  value: string,
): value is DestinationTranslationField {
  return DESTINATION_TRANSLATION_FIELDS.some((field) => field === value);
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim() !== "";
}

function fieldIsRequiredForPublication(
  source: DestinationTranslationSource,
  field: DestinationTranslationField,
) {
  if (field === "facilities") {
    return source.facilities.length > 0;
  }

  if (ALWAYS_REQUIRED_FIELDS.some((candidate) => candidate === field)) {
    return true;
  }

  const sourceField = field as Exclude<
    DestinationTranslationField,
    "facilities" | "thumbnail_alt_text"
  >;
  return hasText(source[sourceField]);
}

function appendMissingFieldError(
  field: DestinationTranslationField,
  fieldErrors: DestinationTranslationFieldErrors,
  reason = "wajib diisi.",
) {
  fieldErrors[field] = `${FIELD_LABELS[field]} ${reason}`;
}

export function emptyDestinationTranslationFormValues(): DestinationTranslationFormValues {
  return { ...EMPTY_VALUES };
}

export function destinationTranslationToFormValues(
  translation: DestinationTranslationRecord | null,
): DestinationTranslationFormValues {
  if (!translation) {
    return emptyDestinationTranslationFormValues();
  }

  return {
    name: translation.name ?? "",
    summary: translation.summary ?? "",
    description: translation.description ?? "",
    history: translation.history ?? "",
    opening_hours: translation.opening_hours ?? "",
    price_note: translation.price_note ?? "",
    facilities: translation.facilities.join("\n"),
    thumbnail_alt_text: translation.thumbnail_alt_text ?? "",
  };
}

export function destinationTranslationToMutationValues(
  translation: DestinationTranslationRecord,
): DestinationTranslationMutationValues {
  return {
    name: normalizeOptionalText(translation.name),
    summary: normalizeOptionalText(translation.summary),
    description: normalizeOptionalText(translation.description),
    history: normalizeOptionalText(translation.history ?? ""),
    opening_hours: normalizeOptionalText(translation.opening_hours ?? ""),
    price_note: normalizeOptionalText(translation.price_note ?? ""),
    facilities: translation.facilities.map((facility) => facility.trim()),
    thumbnail_alt_text: normalizeOptionalText(translation.thumbnail_alt_text),
  };
}

export function toDestinationTranslationSource(
  destination: DestinationRecord,
): DestinationTranslationSource {
  return {
    id: destination.id,
    name: destination.name,
    summary: destination.summary,
    description: destination.description,
    history: destination.history,
    opening_hours: destination.opening_hours,
    price_note: destination.price_note,
    facilities: destination.facilities,
    status: destination.status,
    updated_at: destination.updated_at,
    hasThumbnail: Boolean(
      destination.thumbnail_bucket && destination.thumbnail_path,
    ),
  };
}

export function validateDestinationTranslationInput(
  input: Record<string, unknown>,
): DestinationTranslationValidationResult {
  const values = emptyDestinationTranslationFormValues();
  const fieldErrors: DestinationTranslationFieldErrors = {};
  const formErrors: string[] = [];

  for (const [field, rawValue] of Object.entries(input)) {
    if (
      field.startsWith("$ACTION_") ||
      field === "intent" ||
      field === "translation_id" ||
      field === "edit_revision" ||
      field === "rejection_reason"
    ) {
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

  for (const field of ALWAYS_REQUIRED_FIELDS) {
    if (!hasText(values[field])) {
      appendMissingFieldError(field, fieldErrors);
    }
  }

  const facilityLines = values.facilities
    .split(/\r?\n/)
    .map((facility) => facility.trim());
  const facilities = facilityLines.filter((facility) => facility !== "");

  if (
    values.facilities.trim() !== "" &&
    facilityLines.some((facility) => facility === "")
  ) {
    fieldErrors.facilities = `${FIELD_LABELS.facilities} memiliki baris yang tidak valid.`;
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
      opening_hours: normalizeOptionalText(values.opening_hours),
      price_note: normalizeOptionalText(values.price_note),
      facilities,
      thumbnail_alt_text: normalizeOptionalText(values.thumbnail_alt_text),
    },
  };
}

export function validateDestinationTranslationFormData(
  formData: FormData,
): DestinationTranslationValidationResult {
  const input: Record<string, unknown> = {};

  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }

  return validateDestinationTranslationInput(input);
}

export function validateDestinationTranslationForEligibility(
  source: DestinationTranslationSource,
  values: DestinationTranslationMutationValues,
): DestinationTranslationEligibilityValidationResult {
  const fieldErrors: DestinationTranslationFieldErrors = {};
  const formErrors: string[] = [];

  if (source.status !== "published") {
    formErrors.push(
      "Destinasi Indonesia harus diterbitkan sebelum terjemahan Inggris dapat ditinjau atau diterbitkan.",
    );
  }

  for (const field of ALWAYS_REQUIRED_FIELDS) {
    if (!hasText(values[field])) {
      appendMissingFieldError(
        field,
        fieldErrors,
        "wajib diisi sebelum terjemahan ditinjau atau diterbitkan.",
      );
    }
  }

  for (const field of SOURCE_PARITY_FIELDS) {
    const sourceValue = source[field];
    const translationValue = values[field];
    const sourceHasValue = hasText(sourceValue);
    const translationHasValue = hasText(translationValue);

    if (sourceHasValue !== translationHasValue) {
      fieldErrors[field] = sourceHasValue
        ? `${FIELD_LABELS[field]} wajib diisi karena sumber Indonesia memiliki konten pada bagian ini.`
        : `${FIELD_LABELS[field]} harus dikosongkan karena sumber Indonesia tidak memiliki konten pada bagian ini.`;
    }
  }

  if (values.facilities.length !== source.facilities.length) {
    fieldErrors.facilities =
      "Jumlah fasilitas bahasa Inggris harus sama dengan jumlah fasilitas Indonesia dan setiap baris harus diterjemahkan secara eksplisit.";
  } else if (values.facilities.some((facility) => !hasText(facility))) {
    fieldErrors.facilities =
      "Setiap fasilitas bahasa Inggris harus diisi tanpa fallback bahasa Indonesia.";
  }

  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
    return { success: false, fieldErrors, formErrors };
  }

  return { success: true };
}

export function isDestinationTranslationEditable(
  status: DestinationTranslationStatus | null,
  reviewState: DestinationTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}

export function getDestinationTranslationLifecycleStatus(
  status: DestinationTranslationStatus | null,
  reviewState: DestinationTranslationReviewState | null,
  publicEligibility: DestinationTranslationPublicEligibility,
): DestinationTranslationLifecycleStatus {
  if (status === "archived") return "archived";

  if (status === "published") {
    return publicEligibility === "blocked" ? "stale" : "published";
  }

  if (reviewState === "reviewed") return "reviewed";
  if (reviewState === "pending") return "awaiting-review";
  return "draft";
}

export function getDestinationTranslationLifecycleLabel(
  lifecycleStatus: DestinationTranslationLifecycleStatus,
) {
  const labels: Record<DestinationTranslationLifecycleStatus, string> = {
    draft: "Draft",
    "awaiting-review": "Awaiting review",
    reviewed: "Reviewed",
    published: "Published",
    stale: "Stale",
    archived: "Archived",
  };

  return labels[lifecycleStatus];
}

export function getDestinationTranslationStatusLabel(
  status: DestinationTranslationStatus | null,
  reviewState: DestinationTranslationReviewState | null,
  publicEligibility: DestinationTranslationPublicEligibility,
) {
  if (status === null) return "Belum ada terjemahan";
  if (status === "archived") return "Diarsipkan";
  if (status === "published") {
    if (publicEligibility === "eligible")
      return "Diterbitkan - tampil di publik";
    if (publicEligibility === "unknown") {
      return "Diterbitkan - kelayakan belum terbukti";
    }
    return "Diterbitkan - perlu ditinjau ulang";
  }
  if (reviewState === "reviewed") return "Siap diterbitkan";
  if (reviewState === "rejected") return "Draf - ditolak";
  return "Draf";
}

export function createDestinationTranslationActionState(
  source: DestinationTranslationSource | null,
  translation: DestinationTranslationRecord | null,
  publicEligibility: DestinationTranslationPublicEligibility,
  history: DestinationTranslationReviewEvent[] = [],
  options: ActionStateOptions = {},
): DestinationTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values: options.values ?? destinationTranslationToFormValues(translation),
    fieldErrors: options.fieldErrors ?? {},
    formErrors: options.formErrors ?? [],
    message: options.message ?? null,
    rejectionReason:
      options.rejectionReason ?? translation?.review_reason ?? "",
    revision: options.revision ?? 0,
    translationId: translation?.id ?? null,
    editRevision: translation?.edit_revision ?? null,
    status: translation?.translation_status ?? null,
    reviewState: translation?.review_state ?? null,
    sourceStatus: source?.status ?? null,
    publicEligibility,
    publishedAt: translation?.published_at ?? null,
    hasPublishedBefore:
      translation !== null && translation.published_at !== null,
    history,
  };
}

export function isDestinationTranslationFieldRequiredForPublication(
  source: DestinationTranslationSource,
  field: DestinationTranslationField,
) {
  return fieldIsRequiredForPublication(source, field);
}
