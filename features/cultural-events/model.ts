const WITA_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1000;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function witaLocalToIso(value: string): string | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return null;
  }
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute) - WITA_OFFSET_MILLISECONDS,
  ).toISOString();
}

export function isoToWitaLocal(value: string | null): string {
  if (!value) return "";
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return "";
  const wita = new Date(instant.getTime() + WITA_OFFSET_MILLISECONDS);
  return `${wita.getUTCFullYear()}-${pad(wita.getUTCMonth() + 1)}-${pad(
    wita.getUTCDate(),
  )}T${pad(wita.getUTCHours())}:${pad(wita.getUTCMinutes())}`;
}

export const CULTURAL_EVENT_FORM_FIELDS = [
  "title",
  "summary",
  "description",
  "event_type",
  "start_at_local",
  "end_at_local",
  "all_day",
  "date_note",
  "location_name",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "organizer",
  "contact_phone",
  "contact_consent_confirmed",
  "visitor_information",
  "is_featured",
  "status",
] as const;

export const CULTURAL_EVENT_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export type CulturalEventFormField =
  (typeof CULTURAL_EVENT_FORM_FIELDS)[number];
export type CulturalEventStatus = (typeof CULTURAL_EVENT_STATUSES)[number];
export type CulturalEventMutationMode = "create" | "update";

export type CulturalEventRecord = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string;
  event_type: string | null;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  date_note: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  organizer: string | null;
  contact_phone: string | null;
  contact_consent_confirmed: boolean;
  visitor_information: string | null;
  thumbnail_path: string | null;
  thumbnail_bucket: string | null;
  status: CulturalEventStatus;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CulturalEventListItem = Pick<
  CulturalEventRecord,
  | "id"
  | "title"
  | "status"
  | "start_at"
  | "all_day"
  | "date_note"
  | "location_name"
  | "is_featured"
  | "updated_at"
>;

export type CulturalEventFormValues = {
  title: string;
  summary: string;
  description: string;
  event_type: string;
  start_at_local: string;
  end_at_local: string;
  all_day: boolean;
  date_note: string;
  location_name: string;
  address: string;
  latitude: string;
  longitude: string;
  google_maps_url: string;
  organizer: string;
  contact_phone: string;
  contact_consent_confirmed: boolean;
  visitor_information: string;
  is_featured: boolean;
  status: string;
};

export type CulturalEventMutationValues = {
  title: string;
  summary: string | null;
  description: string;
  event_type: string | null;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  date_note: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  organizer: string | null;
  contact_phone: string | null;
  contact_consent_confirmed: boolean;
  visitor_information: string | null;
  is_featured: boolean;
  status: CulturalEventStatus;
};

export type CulturalEventInsertPayload = CulturalEventMutationValues & {
  slug: string;
  created_by: string;
  updated_by: string;
};

export type CulturalEventUpdatePayload = CulturalEventMutationValues & {
  updated_by: string;
};

export type CulturalEventFieldErrors = Partial<
  Record<CulturalEventFormField, string>
>;

export type CulturalEventActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "duplicate-error"
    | "not-found"
    | "database-error";
  values: CulturalEventFormValues;
  fieldErrors: CulturalEventFieldErrors;
  formErrors: string[];
  message: string | null;
  revision: number;
};

export type CulturalEventValidationContext = {
  mode: CulturalEventMutationMode;
  currentStatus?: CulturalEventStatus;
  hasThumbnail?: boolean;
};

export type CulturalEventValidationResult =
  | {
      success: true;
      data: CulturalEventMutationValues;
      values: CulturalEventFormValues;
    }
  | {
      success: false;
      values: CulturalEventFormValues;
      fieldErrors: CulturalEventFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: CulturalEventFormValues = {
  title: "",
  summary: "",
  description: "",
  event_type: "",
  start_at_local: "",
  end_at_local: "",
  all_day: false,
  date_note: "",
  location_name: "",
  address: "",
  latitude: "",
  longitude: "",
  google_maps_url: "",
  organizer: "",
  contact_phone: "",
  contact_consent_confirmed: false,
  visitor_information: "",
  is_featured: false,
  status: "draft",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const PLACEHOLDER_PATTERN =
  /\b(?:lorem ipsum|tbd|todo|isi nanti|belum diisi)\b/i;
const DUPLICATE_CONSTRAINTS = ["cultural_events_slug_key"] as const;

const FIELD_LABELS: Record<CulturalEventFormField, string> = {
  title: "Judul acara",
  summary: "Ringkasan",
  description: "Deskripsi",
  event_type: "Jenis acara",
  start_at_local: "Waktu mulai",
  end_at_local: "Waktu selesai",
  all_day: "Acara sepanjang hari",
  date_note: "Catatan tanggal",
  location_name: "Nama lokasi",
  address: "Alamat",
  latitude: "Latitude",
  longitude: "Longitude",
  google_maps_url: "Tautan Google Maps",
  organizer: "Penyelenggara",
  contact_phone: "Nomor kontak",
  contact_consent_confirmed: "Persetujuan publikasi kontak",
  visitor_information: "Informasi pengunjung",
  is_featured: "Acara unggulan",
  status: "Status publikasi",
};

function isFormField(value: string): value is CulturalEventFormField {
  return CULTURAL_EVENT_FORM_FIELDS.some((field) => field === value);
}

function isStatus(value: string): value is CulturalEventStatus {
  return CULTURAL_EVENT_STATUSES.some((status) => status === value);
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseCoordinate(
  field: "latitude" | "longitude",
  values: CulturalEventFormValues,
  errors: CulturalEventFieldErrors,
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
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    errors[field] =
      `${FIELD_LABELS[field]} harus berada di antara ${minimum} dan ${maximum}.`;
    return null;
  }
  return parsed;
}

export function isValidCulturalEventId(value: string) {
  return UUID_PATTERN.test(value);
}

export function normalizeCulturalEventSlug(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidCulturalEventSlug(value: string) {
  return SLUG_PATTERN.test(value);
}

export function isCulturalEventDuplicateConstraintError(
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

export function getAllowedCulturalEventStatuses(
  currentStatus: CulturalEventStatus | null,
): readonly CulturalEventStatus[] {
  if (currentStatus === null) return ["draft"];
  if (currentStatus === "published") return ["published", "archived"];
  if (currentStatus === "archived") return ["archived", "draft"];
  return ["draft", "published", "archived"];
}

export function getCulturalEventStatusLabel(status: CulturalEventStatus) {
  return {
    draft: "Draf",
    published: "Diterbitkan",
    archived: "Diarsipkan",
  }[status];
}

export function getCulturalEventMutationMode(
  event: Pick<CulturalEventRecord, "id"> | null,
): CulturalEventMutationMode {
  return event === null ? "create" : "update";
}

export function emptyCulturalEventFormValues(): CulturalEventFormValues {
  return { ...EMPTY_VALUES };
}

export function culturalEventToFormValues(
  event: CulturalEventRecord,
): CulturalEventFormValues {
  return {
    title: event.title,
    summary: event.summary ?? "",
    description: event.description,
    event_type: event.event_type ?? "",
    start_at_local: isoToWitaLocal(event.start_at),
    end_at_local: isoToWitaLocal(event.end_at),
    all_day: event.all_day,
    date_note: event.date_note ?? "",
    location_name: event.location_name ?? "",
    address: event.address ?? "",
    latitude: event.latitude === null ? "" : String(event.latitude),
    longitude: event.longitude === null ? "" : String(event.longitude),
    google_maps_url: event.google_maps_url ?? "",
    organizer: event.organizer ?? "",
    contact_phone: event.contact_phone ?? "",
    contact_consent_confirmed: event.contact_consent_confirmed,
    visitor_information: event.visitor_information ?? "",
    is_featured: event.is_featured,
    status: event.status,
  };
}

export function createCulturalEventInitialState(
  event: CulturalEventRecord | null,
): CulturalEventActionState {
  return {
    kind: "idle",
    values: event
      ? culturalEventToFormValues(event)
      : emptyCulturalEventFormValues(),
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

export function validateCulturalEventInput(
  input: Record<string, unknown>,
  context: CulturalEventValidationContext,
): CulturalEventValidationResult {
  const values = emptyCulturalEventFormValues();
  const fieldErrors: CulturalEventFieldErrors = {};
  const formErrors: string[] = [];
  const provided = new Set<string>();

  for (const [field, rawValue] of Object.entries(input)) {
    if (field.startsWith("$ACTION_")) continue;
    if (!isFormField(field)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
      continue;
    }
    provided.add(field);
    if (
      field === "all_day" ||
      field === "contact_consent_confirmed" ||
      field === "is_featured"
    ) {
      if (rawValue !== "on" && rawValue !== true && rawValue !== false) {
        fieldErrors[field] =
          `${FIELD_LABELS[field]} memiliki nilai yang tidak valid.`;
      } else {
        values[field] = rawValue === "on" || rawValue === true;
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

  const title = values.title.trim();
  const description = values.description.trim();
  if (!title && !fieldErrors.title)
    fieldErrors.title = "Judul acara wajib diisi.";
  if (!description && !fieldErrors.description) {
    fieldErrors.description = "Deskripsi acara wajib diisi.";
  }

  const startRaw = values.start_at_local.trim();
  const endRaw = values.end_at_local.trim();
  const startAt = startRaw ? witaLocalToIso(startRaw) : null;
  const endAt = endRaw ? witaLocalToIso(endRaw) : null;
  if (startRaw && !startAt) {
    fieldErrors.start_at_local = "Waktu mulai tidak valid.";
  }
  if (endRaw && !endAt) {
    fieldErrors.end_at_local = "Waktu selesai tidak valid.";
  }
  if (endAt && !startAt) {
    fieldErrors.start_at_local =
      "Waktu mulai wajib diisi jika waktu selesai dicantumkan.";
  }
  if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
    fieldErrors.end_at_local =
      "Waktu selesai tidak boleh lebih awal dari waktu mulai.";
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
  let status: CulturalEventStatus | null = null;
  if (!fieldErrors.status && isStatus(statusValue)) {
    status = statusValue;
    const allowed =
      context.mode === "create"
        ? getAllowedCulturalEventStatuses(null)
        : context.currentStatus === undefined
          ? null
          : getAllowedCulturalEventStatuses(context.currentStatus);
    if (allowed && !allowed.includes(status)) {
      fieldErrors.status = "Perubahan status publikasi tidak diizinkan.";
    }
  } else if (!fieldErrors.status) {
    fieldErrors.status = "Status publikasi tidak valid.";
  }

  const contactPhone = optionalText(values.contact_phone);
  if (status === "published") {
    if (!startAt) {
      fieldErrors.start_at_local =
        "Tanggal dan waktu mulai yang pasti wajib tersedia sebelum publikasi.";
    }
    if (context.hasThumbnail === false) {
      formErrors.push(
        "Acara belum dapat diterbitkan karena gambar utama belum tersedia.",
      );
    }
    if (contactPhone && !values.contact_consent_confirmed) {
      fieldErrors.contact_consent_confirmed =
        "Persetujuan wajib dicatat sebelum nomor kontak diterbitkan.";
    }
    for (const [field, value] of [
      ["title", values.title],
      ["summary", values.summary],
      ["description", values.description],
      ["event_type", values.event_type],
      ["date_note", values.date_note],
      ["location_name", values.location_name],
      ["address", values.address],
      ["organizer", values.organizer],
      ["visitor_information", values.visitor_information],
    ] as const) {
      if (PLACEHOLDER_PATTERN.test(value)) {
        fieldErrors[field] =
          `${FIELD_LABELS[field]} masih memuat teks placeholder dan belum dapat diterbitkan.`;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0 || !status) {
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
      title,
      summary: optionalText(values.summary),
      description,
      event_type: optionalText(values.event_type),
      start_at: startAt,
      end_at: endAt,
      all_day: values.all_day,
      date_note: optionalText(values.date_note),
      location_name: optionalText(values.location_name),
      address: optionalText(values.address),
      latitude,
      longitude,
      google_maps_url: googleMapsUrl,
      organizer: optionalText(values.organizer),
      contact_phone: contactPhone,
      contact_consent_confirmed: values.contact_consent_confirmed,
      visitor_information: optionalText(values.visitor_information),
      is_featured: values.is_featured,
      status,
    },
  };
}

export function validateCulturalEventFormData(
  formData: FormData,
  context: CulturalEventValidationContext,
) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  return validateCulturalEventInput(input, context);
}
