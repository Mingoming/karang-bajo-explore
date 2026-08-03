export const PRIMARY_WHATSAPP_KEY = "primary_whatsapp_number" as const;

export const OFFICIAL_CONTACT_TYPES = [
  "phone",
  "whatsapp",
  "email",
  "url",
] as const;

export type OfficialContactType = (typeof OFFICIAL_CONTACT_TYPES)[number];
export type OfficialContactStatus = "draft" | "published" | "archived";

export type SiteSettingRecord = {
  id: string;
  key: string;
  value: string | null;
  value_type: "text" | "number" | "boolean" | "url" | "json";
  label: string;
  description: string | null;
  is_public: boolean;
  is_editable: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
};

export type OfficialContactRecord = {
  id: string;
  label: string;
  contact_type: OfficialContactType;
  value: string;
  url: string | null;
  description: string | null;
  display_order: number;
  status: OfficialContactStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
};

export type PublicOfficialContactRow = Pick<
  OfficialContactRecord,
  "id" | "label" | "contact_type" | "value" | "description" | "display_order"
>;

export type PublicWhatsappSettingRow = {
  key: string;
  value: string | null;
};

export type PublicOfficialContact = {
  id: string;
  label: string;
  type: OfficialContactType;
  value: string;
  description: string | null;
  href: string;
  external: boolean;
};

export type ExternalTourismPlatform = "google-maps" | "tripadvisor";

export type ExternalTourismLink = {
  platform: ExternalTourismPlatform;
  href: string;
};

export type PrimaryWhatsapp = {
  number: string;
  displayValue: string;
  href: string;
};

export type PublicOfficialContactResult =
  | {
      kind: "ready";
      primaryWhatsapp: PrimaryWhatsapp | null;
      contacts: PublicOfficialContact[];
    }
  | { kind: "error" };

export type PublicFooterContactAction =
  | { kind: "whatsapp"; href: string }
  | { kind: "contact-page"; href: "/kontak" };

const CONTACT_FIELDS = [
  "label",
  "contact_type",
  "value",
  "description",
  "display_order",
  "status",
] as const;
type ContactField = (typeof CONTACT_FIELDS)[number];
export type ContactFormValues = Record<ContactField, string>;
export type ContactFieldErrors = Partial<Record<ContactField, string>>;
export type ContactActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "duplicate-error"
    | "database-error"
    | "not-found";
  values: ContactFormValues;
  fieldErrors: ContactFieldErrors;
  formErrors: string[];
  message: string | null;
  revision: number;
};

export type ContactMutationPayload = {
  label: string;
  contact_type: OfficialContactType;
  value: string;
  url: string;
  description: string | null;
  display_order: number;
  status: OfficialContactStatus;
};

export type WhatsappSettingActionState = {
  kind:
    "idle" | "validation-error" | "read-only" | "database-error" | "success";
  value: string;
  error: string | null;
  message: string | null;
  revision: number;
};

const EMPTY_CONTACT_VALUES: ContactFormValues = {
  label: "",
  contact_type: "phone",
  value: "",
  description: "",
  display_order: "0",
  status: "draft",
};

function optionalText(value: string) {
  return value.trim() || null;
}

function isContactType(value: string): value is OfficialContactType {
  return OFFICIAL_CONTACT_TYPES.some((type) => type === value);
}

function isContactStatus(value: string): value is OfficialContactStatus {
  return value === "draft" || value === "published" || value === "archived";
}

function isContactField(value: string): value is ContactField {
  return CONTACT_FIELDS.some((field) => field === value);
}

function hasOnlyPhoneCharacters(value: string) {
  return /^\+?[0-9()\s.-]+$/.test(value);
}

export function normalizeWhatsappNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !hasOnlyPhoneCharacters(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

export function buildWhatsappHref(value: string): string | null {
  const number = normalizeWhatsappNumber(value);
  return number ? `https://wa.me/${number}` : null;
}

export function normalizePhoneNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !hasOnlyPhoneCharacters(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 5 || digits.length > 15) return null;
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export function buildTelephoneHref(value: string): string | null {
  const phone = normalizePhoneNumber(value);
  return phone ? `tel:${phone}` : null;
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  const localPart = email.slice(0, email.indexOf("@"));
  if (
    !/^[a-z0-9.!$'*+/=_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
      email,
    ) ||
    email.startsWith(".") ||
    localPart.endsWith(".") ||
    email.includes("..")
  )
    return null;
  return email;
}

export function buildEmailHref(value: string): string | null {
  const email = normalizeEmail(value);
  return email ? `mailto:${email}` : null;
}

export function normalizeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeContactValue(
  type: OfficialContactType,
  value: string,
): { value: string; href: string; external: boolean } | null {
  if (type === "whatsapp") {
    const number = normalizeWhatsappNumber(value);
    return number
      ? { value: number, href: `https://wa.me/${number}`, external: true }
      : null;
  }
  if (type === "phone") {
    const number = normalizePhoneNumber(value);
    return number
      ? { value: number, href: `tel:${number}`, external: false }
      : null;
  }
  if (type === "email") {
    const email = normalizeEmail(value);
    return email
      ? { value: email, href: `mailto:${email}`, external: false }
      : null;
  }
  const url = normalizeHttpUrl(value);
  return url ? { value: url, href: url, external: true } : null;
}

export function mapPrimaryWhatsapp(
  value: string | null,
): PrimaryWhatsapp | null {
  if (!value) return null;
  const number = normalizeWhatsappNumber(value);
  if (!number) return null;
  return {
    number,
    displayValue: `+${number}`,
    href: `https://wa.me/${number}`,
  };
}

export function mapPublicOfficialContact(
  row: PublicOfficialContactRow,
): PublicOfficialContact | null {
  if (!isContactType(row.contact_type)) return null;
  const normalized = normalizeContactValue(row.contact_type, row.value);
  if (!normalized || !row.label.trim()) return null;
  return {
    id: row.id,
    label: row.label.trim(),
    type: row.contact_type,
    value: normalized.value,
    description: row.description?.trim() || null,
    href: normalized.href,
    external: normalized.external,
  };
}

export function classifyPublicOfficialContacts(
  setting: PublicWhatsappSettingRow | null,
  rows: PublicOfficialContactRow[],
): PublicOfficialContactResult {
  if (setting && setting.key !== PRIMARY_WHATSAPP_KEY) return { kind: "error" };
  const primaryWhatsapp = mapPrimaryWhatsapp(setting?.value ?? null);
  if (
    setting?.value !== null &&
    setting?.value !== undefined &&
    !primaryWhatsapp
  )
    return { kind: "error" };

  const contacts: PublicOfficialContact[] = [];
  for (const row of rows) {
    const contact = mapPublicOfficialContact(row);
    if (!contact) return { kind: "error" };
    contacts.push(contact);
  }
  return { kind: "ready", primaryWhatsapp, contacts };
}

function selectExternalTourismLink(
  contacts: readonly PublicOfficialContact[],
  label: string,
  platform: ExternalTourismPlatform,
): ExternalTourismLink | null {
  const normalizedLabel = label.trim().toLowerCase();
  const contact = contacts.find(
    (candidate) =>
      candidate.type === "url" &&
      candidate.label.trim().toLowerCase() === normalizedLabel,
  );
  if (!contact) return null;

  const href = normalizeHttpUrl(contact.href);
  return href ? { platform, href } : null;
}

export function selectTripadvisorLink(
  contacts: readonly PublicOfficialContact[],
) {
  return selectExternalTourismLink(contacts, "Tripadvisor", "tripadvisor");
}

export function selectGoogleMapsTourismLink(
  contacts: readonly PublicOfficialContact[],
) {
  return selectExternalTourismLink(
    contacts,
    "Google Maps Wisata",
    "google-maps",
  );
}

export function selectExternalTourismLinks(
  contacts: readonly PublicOfficialContact[],
) {
  return [
    selectGoogleMapsTourismLink(contacts),
    selectTripadvisorLink(contacts),
  ].filter((link): link is ExternalTourismLink => link !== null);
}

export function selectPublicFooterContactAction(
  result: PublicOfficialContactResult,
): PublicFooterContactAction {
  if (result.kind === "ready" && result.primaryWhatsapp) {
    return { kind: "whatsapp", href: result.primaryWhatsapp.href };
  }

  return { kind: "contact-page", href: "/kontak" };
}

export function getContactTypeLabel(type: OfficialContactType) {
  return {
    phone: "Telepon",
    whatsapp: "WhatsApp tambahan",
    email: "Email",
    url: "Tautan",
  }[type];
}

export function getContactStatusLabel(status: OfficialContactStatus) {
  return { draft: "Draf", published: "Diterbitkan", archived: "Diarsipkan" }[
    status
  ];
}

export function getAllowedContactStatuses(
  current: OfficialContactStatus | null,
): readonly OfficialContactStatus[] {
  if (current === null) return ["draft"];
  if (current === "published") return ["published", "archived"];
  if (current === "archived") return ["archived", "draft"];
  return ["draft", "published", "archived"];
}

export function emptyContactFormValues(): ContactFormValues {
  return { ...EMPTY_CONTACT_VALUES };
}

export function contactToFormValues(
  contact: OfficialContactRecord | null,
): ContactFormValues {
  if (!contact) return emptyContactFormValues();
  return {
    label: contact.label,
    contact_type: contact.contact_type,
    value: contact.value,
    description: contact.description ?? "",
    display_order: String(contact.display_order),
    status: contact.status,
  };
}

export function createContactInitialState(
  contact: OfficialContactRecord | null,
): ContactActionState {
  return {
    kind: "idle",
    values: contactToFormValues(contact),
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

export function validateContactInput(
  input: Record<string, unknown>,
  currentStatus: OfficialContactStatus | null | undefined,
) {
  const values = emptyContactFormValues();
  const fieldErrors: ContactFieldErrors = {};
  const formErrors: string[] = [];
  for (const [field, raw] of Object.entries(input)) {
    if (field.startsWith("$ACTION_")) continue;
    if (!isContactField(field)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
    } else if (typeof raw !== "string") {
      fieldErrors[field] = "Nilai tidak valid.";
    } else {
      values[field] = raw;
    }
  }
  const label = values.label.trim();
  if (!label) fieldErrors.label = "Label kontak wajib diisi.";
  const typeValue = values.contact_type.trim();
  const type = isContactType(typeValue) ? typeValue : null;
  if (!type) fieldErrors.contact_type = "Jenis kontak tidak valid.";
  const normalized = type ? normalizeContactValue(type, values.value) : null;
  if (!values.value.trim()) {
    fieldErrors.value = "Nilai kontak wajib diisi.";
  } else if (!normalized) {
    fieldErrors.value =
      type === "whatsapp"
        ? "Nomor WhatsApp harus memakai kode negara dan hanya berisi format nomor yang valid."
        : type === "email"
          ? "Alamat email tidak valid."
          : type === "url"
            ? "Tautan harus menggunakan protokol http atau https."
            : "Nomor telepon tidak valid.";
  }
  const displayOrder = Number(values.display_order.trim());
  if (!Number.isSafeInteger(displayOrder) || displayOrder < 0) {
    fieldErrors.display_order =
      "Urutan tampil harus berupa bilangan bulat nol atau lebih.";
  }
  const statusValue = values.status.trim();
  const status = isContactStatus(statusValue) ? statusValue : null;
  if (!status) {
    fieldErrors.status = "Status publikasi tidak valid.";
  } else if (
    currentStatus !== undefined &&
    !getAllowedContactStatuses(currentStatus).includes(status)
  ) {
    fieldErrors.status = "Perubahan status publikasi tidak diizinkan.";
  }
  if (
    Object.keys(fieldErrors).length ||
    formErrors.length ||
    !type ||
    !normalized ||
    !status
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
      label,
      contact_type: type,
      value: normalized.value,
      url: normalized.href,
      description: optionalText(values.description),
      display_order: displayOrder,
      status,
    } satisfies ContactMutationPayload,
  };
}

export function validateContactFormData(
  formData: FormData,
  currentStatus: OfficialContactStatus | null | undefined,
) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  return validateContactInput(input, currentStatus);
}

export function validatePrimaryWhatsappInput(input: Record<string, unknown>) {
  const keys = Object.keys(input).filter((key) => !key.startsWith("$ACTION_"));
  if (keys.some((key) => key !== PRIMARY_WHATSAPP_KEY)) {
    return {
      success: false as const,
      value: "",
      error: "Formulir memuat kolom yang tidak dikenali.",
    };
  }
  const raw = input[PRIMARY_WHATSAPP_KEY];
  if (typeof raw !== "string") {
    return {
      success: false as const,
      value: "",
      error: "Nomor WhatsApp tidak valid.",
    };
  }
  if (!raw.trim()) return { success: true as const, value: "", data: null };
  const normalized = normalizeWhatsappNumber(raw);
  if (!normalized) {
    return {
      success: false as const,
      value: raw,
      error:
        "Gunakan nomor internasional dengan kode negara, tanpa awalan nol lokal.",
    };
  }
  return { success: true as const, value: raw, data: normalized };
}

export function isOfficialContactDuplicateError(
  code: string,
  diagnostic: string,
) {
  return code === "23505" && diagnostic.includes("contacts_active_value_idx");
}

export function isValidOfficialContactId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function getContactMutationMode(
  existing: Pick<OfficialContactRecord, "id"> | null,
) {
  return existing ? "update" : "create";
}
