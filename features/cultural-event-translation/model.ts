import type {
  CulturalEventRecord,
  CulturalEventStatus,
} from "../cultural-events/model";

export const CULTURAL_EVENT_TRANSLATION_FIELDS = [
  "title",
  "summary",
  "description",
  "event_type",
  "date_note",
  "location_name",
  "address",
  "organizer",
  "visitor_information",
] as const;

export type CulturalEventTranslationField =
  (typeof CULTURAL_EVENT_TRANSLATION_FIELDS)[number];
export type CulturalEventTranslationStatus = "draft" | "published" | "archived";
export type CulturalEventTranslationReviewState =
  "pending" | "reviewed" | "rejected";
export type CulturalEventTranslationLifecycleState =
  "draft" | "reviewed" | "published" | "stale" | "archived" | "rejected";

export type CulturalEventTranslationSource = Pick<
  CulturalEventRecord,
  | "id"
  | "title"
  | "summary"
  | "description"
  | "event_type"
  | "start_at"
  | "end_at"
  | "all_day"
  | "date_note"
  | "location_name"
  | "address"
  | "latitude"
  | "longitude"
  | "google_maps_url"
  | "organizer"
  | "contact_phone"
  | "contact_consent_confirmed"
  | "visitor_information"
  | "thumbnail_path"
  | "thumbnail_bucket"
  | "status"
  | "is_featured"
  | "slug"
  | "updated_at"
>;

export type CulturalEventTranslationRecord = {
  id: string;
  cultural_event_id: string;
  locale: "en";
  title: string | null;
  summary: string | null;
  description: string | null;
  event_type: string | null;
  date_note: string | null;
  location_name: string | null;
  address: string | null;
  organizer: string | null;
  visitor_information: string | null;
  translation_status: CulturalEventTranslationStatus;
  review_state: CulturalEventTranslationReviewState;
  captured_source_revision: number | null;
  captured_source_fingerprint: string | null;
  captured_thumbnail_media_fingerprint: string | null;
  translation_fingerprint: string | null;
  contract_version: "cultural-event-v1";
  terminology_review_confirmed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  review_reason: string | null;
  published_at: string | null;
  published_by: string | null;
  archived_at: string | null;
  edit_revision: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  source_slug: string;
  source_revision: number;
  source_updated_at: string;
  source_status: CulturalEventStatus;
  lifecycle_state: CulturalEventTranslationLifecycleState;
  source_blocked: boolean;
  source_blocked_reason: string | null;
  stale_source_fingerprint: boolean;
  stale_thumbnail_media_fingerprint: boolean;
  stale_translation_fingerprint: boolean;
  public_eligibility: boolean;
  review_eligibility: boolean;
  publication_eligibility: boolean;
  eligibility_reason: string;
};

export type CulturalEventTranslationRpcRow = Pick<
  CulturalEventTranslationRecord,
  | "id"
  | "cultural_event_id"
  | "translation_status"
  | "review_state"
  | "review_reason"
  | "rejected_at"
  | "published_at"
  | "archived_at"
  | "reviewed_at"
  | "edit_revision"
  | "updated_at"
> & {
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  event_type?: string | null;
  date_note?: string | null;
  location_name?: string | null;
  address?: string | null;
  organizer?: string | null;
  visitor_information?: string | null;
};

export type CulturalEventTranslationReviewEvent = {
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
  previous_translation_status: CulturalEventTranslationStatus;
  new_translation_status: CulturalEventTranslationStatus;
  previous_review_state: CulturalEventTranslationReviewState;
  new_review_state: CulturalEventTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type CulturalEventTranslationFormValues = Record<
  CulturalEventTranslationField,
  string
>;
export type CulturalEventTranslationMutationValues = Record<
  CulturalEventTranslationField,
  string | null
>;
export type CulturalEventTranslationFieldErrors = Partial<
  Record<CulturalEventTranslationField, string>
>;

export type CulturalEventTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: CulturalEventTranslationFormValues;
  fieldErrors: CulturalEventTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: CulturalEventTranslationStatus | null;
  reviewState: CulturalEventTranslationReviewState | null;
  lifecycleState: CulturalEventTranslationLifecycleState;
  sourceStatus: CulturalEventStatus | null;
  sourceBlocked: boolean;
  sourceBlockedReason: string | null;
  publicEligibility: boolean;
  reviewEligibility: boolean;
  publicationEligibility: boolean;
  eligibilityReason: string | null;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: CulturalEventTranslationReviewEvent[];
};

export type CulturalEventTranslationValidationResult =
  | {
      success: true;
      values: CulturalEventTranslationFormValues;
      data: CulturalEventTranslationMutationValues;
    }
  | {
      success: false;
      values: CulturalEventTranslationFormValues;
      fieldErrors: CulturalEventTranslationFieldErrors;
      formErrors: string[];
    };

export type CulturalEventTranslationEligibilityResult =
  | { success: true }
  | {
      success: false;
      fieldErrors: CulturalEventTranslationFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: CulturalEventTranslationFormValues = {
  title: "",
  summary: "",
  description: "",
  event_type: "",
  date_note: "",
  location_name: "",
  address: "",
  organizer: "",
  visitor_information: "",
};

const FIELD_LABELS: Record<CulturalEventTranslationField, string> = {
  title: "Event title in English",
  summary: "English summary",
  description: "English description",
  event_type: "English event type",
  date_note: "English date note",
  location_name: "English location name",
  address: "English address",
  organizer: "English organizer",
  visitor_information: "English visitor information",
};

const OPTIONAL_FIELDS = CULTURAL_EVENT_TRANSLATION_FIELDS.filter(
  (field) => field !== "title" && field !== "description",
) as Exclude<CulturalEventTranslationField, "title" | "description">[];

function isTranslationField(
  value: string,
): value is CulturalEventTranslationField {
  return CULTURAL_EVENT_TRANSLATION_FIELDS.some((field) => field === value);
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim() !== "";
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function emptyCulturalEventTranslationFormValues() {
  return { ...EMPTY_VALUES };
}

export function culturalEventTranslationToFormValues(
  translation: CulturalEventTranslationRecord | null,
): CulturalEventTranslationFormValues {
  if (!translation) return emptyCulturalEventTranslationFormValues();
  return {
    title: translation.title ?? "",
    summary: translation.summary ?? "",
    description: translation.description ?? "",
    event_type: translation.event_type ?? "",
    date_note: translation.date_note ?? "",
    location_name: translation.location_name ?? "",
    address: translation.address ?? "",
    organizer: translation.organizer ?? "",
    visitor_information: translation.visitor_information ?? "",
  };
}

export function validateCulturalEventTranslationInput(
  input: Record<string, unknown>,
): CulturalEventTranslationValidationResult {
  const values = emptyCulturalEventTranslationFormValues();
  const fieldErrors: CulturalEventTranslationFieldErrors = {};
  const formErrors: string[] = [];

  for (const [field, rawValue] of Object.entries(input)) {
    if (
      field.startsWith("$ACTION_") ||
      field === "intent" ||
      field === "translation_id" ||
      field === "edit_revision" ||
      field === "rejection_reason" ||
      field === "terminology_review_confirmed" ||
      field === "slug"
    ) {
      continue;
    }
    if (!isTranslationField(field)) {
      formErrors.push("Form contains an unrecognized field.");
      continue;
    }
    if (typeof rawValue !== "string") {
      fieldErrors[field] = `${FIELD_LABELS[field]} is not valid.`;
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
      title: normalizeOptionalText(values.title),
      summary: normalizeOptionalText(values.summary),
      description: normalizeOptionalText(values.description),
      event_type: normalizeOptionalText(values.event_type),
      date_note: normalizeOptionalText(values.date_note),
      location_name: normalizeOptionalText(values.location_name),
      address: normalizeOptionalText(values.address),
      organizer: normalizeOptionalText(values.organizer),
      visitor_information: normalizeOptionalText(values.visitor_information),
    },
  };
}

export function validateCulturalEventTranslationFormData(formData: FormData) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  return validateCulturalEventTranslationInput(input);
}

export function validateCulturalEventTranslationForSource(
  source: CulturalEventTranslationSource,
  values: CulturalEventTranslationMutationValues,
): CulturalEventTranslationEligibilityResult {
  const fieldErrors: CulturalEventTranslationFieldErrors = {};
  for (const field of OPTIONAL_FIELDS) {
    if (!hasText(source[field]) && hasText(values[field])) {
      fieldErrors[field] =
        `${FIELD_LABELS[field]} must remain empty because the Indonesian source is empty.`;
    }
  }
  return Object.keys(fieldErrors).length > 0
    ? {
        success: false,
        fieldErrors,
        formErrors: [
          "English translation cannot add content that has no source meaning.",
        ],
      }
    : { success: true };
}

export function validateCulturalEventTranslationForEligibility(
  source: CulturalEventTranslationSource,
  values: CulturalEventTranslationMutationValues,
): CulturalEventTranslationEligibilityResult {
  const fieldErrors: CulturalEventTranslationFieldErrors = {};
  const formErrors: string[] = [];

  if (source.status !== "published") {
    formErrors.push(
      "The Indonesian source must be published before review or publication.",
    );
  }
  if (!source.start_at) {
    formErrors.push(
      "A confirmed event start time is required before review or publication.",
    );
  }
  if (!hasText(values.title)) {
    fieldErrors.title = `${FIELD_LABELS.title} is required before review or publication.`;
  }
  if (!hasText(values.description)) {
    fieldErrors.description = `${FIELD_LABELS.description} is required before review or publication.`;
  }
  if (
    source.contact_phone !== null &&
    source.contact_phone.trim() !== "" &&
    !source.contact_consent_confirmed
  ) {
    formErrors.push(
      "The source contact cannot be published until contact consent is confirmed.",
    );
  }
  for (const field of OPTIONAL_FIELDS) {
    const sourceHasValue = hasText(source[field]);
    const translationHasValue = hasText(values[field]);
    if (sourceHasValue !== translationHasValue) {
      fieldErrors[field] = sourceHasValue
        ? `${FIELD_LABELS[field]} is required because the source contains content.`
        : `${FIELD_LABELS[field]} must remain empty because the source is empty.`;
    }
  }

  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
    return { success: false, fieldErrors, formErrors };
  }
  return { success: true };
}

export function createCulturalEventTranslationActionState(
  source: CulturalEventTranslationSource | null,
  translation: CulturalEventTranslationRecord | null,
  history: CulturalEventTranslationReviewEvent[] = [],
  options: Partial<CulturalEventTranslationActionState> = {},
): CulturalEventTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values: options.values ?? culturalEventTranslationToFormValues(translation),
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
    lifecycleState: translation?.lifecycle_state ?? "draft",
    sourceStatus: source?.status ?? translation?.source_status ?? null,
    sourceBlocked: translation?.source_blocked ?? false,
    sourceBlockedReason: translation?.source_blocked_reason ?? null,
    publicEligibility: translation?.public_eligibility ?? false,
    reviewEligibility: translation?.review_eligibility ?? false,
    publicationEligibility: translation?.publication_eligibility ?? false,
    eligibilityReason: translation?.eligibility_reason ?? null,
    publishedAt: translation?.published_at ?? null,
    hasPublishedBefore:
      translation !== null && translation.published_at !== null,
    history,
  };
}

export function getCulturalEventTranslationLifecycleLabel(
  state: CulturalEventTranslationLifecycleState,
  reviewState: CulturalEventTranslationReviewState | null = null,
  sourceBlocked = false,
  hasTranslation = true,
) {
  if (sourceBlocked) return "Source blocked";
  if (state === "archived") return "Archived";
  if (state === "stale") return "Stale";
  if (state === "published") return "Published";
  if (state === "reviewed") return "Reviewed";
  if (state === "rejected" || reviewState === "rejected") return "Rejected";
  if (hasTranslation && reviewState === "pending") return "Awaiting review";
  return "Draft";
}

export function isCulturalEventTranslationEditable(
  status: CulturalEventTranslationStatus | null,
  reviewState: CulturalEventTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}
