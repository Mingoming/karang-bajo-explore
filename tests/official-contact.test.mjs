import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  buildEmailHref,
  buildTelephoneHref,
  buildWhatsappHref,
  classifyPublicOfficialContacts,
  getAllowedContactStatuses,
  getContactMutationMode,
  isOfficialContactDuplicateError,
  mapPrimaryWhatsapp,
  mapPublicOfficialContact,
  normalizeHttpUrl,
  selectExternalTourismLinks,
  selectGoogleMapsTourismLink,
  selectPublicFooterContactAction,
  selectTripadvisorLink,
  validateContactInput,
  validatePrimaryWhatsappInput,
} from "../features/official-contact/model.ts";

const publicUrlContact = (overrides = {}) => ({
  id: "10000000-0000-4000-8000-000000000010",
  label: "Tripadvisor",
  type: "url",
  value: "https://example.test/tripadvisor",
  description: null,
  href: "https://example.test/tripadvisor",
  external: true,
  ...overrides,
});

const validContact = (overrides = {}) => ({
  label: "Informasi Pariwisata",
  contact_type: "whatsapp",
  value: "+62 812-3456-7890",
  description: "Kanal resmi",
  display_order: "1",
  status: "draft",
  ...overrides,
});

test("WhatsApp normalization requires international digits and builds a safe URL", () => {
  assert.equal(
    buildWhatsappHref("+62 812-3456-7890"),
    "https://wa.me/6281234567890",
  );
  for (const value of ["08123456789", "javascript:alert(1)", "+62/812", "123"])
    assert.equal(buildWhatsappHref(value), null);
});

test("telephone, email, and external links allow only their intended schemes", () => {
  assert.equal(buildTelephoneHref("(0370) 123-456"), "tel:0370123456");
  assert.equal(
    buildEmailHref(" INFO@EXAMPLE.TEST "),
    "mailto:info@example.test",
  );
  assert.equal(
    normalizeHttpUrl("https://example.test/contact"),
    "https://example.test/contact",
  );
  assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
  assert.equal(normalizeHttpUrl("//example.test/contact"), null);
  assert.equal(normalizeHttpUrl("https://user:secret@example.test"), null);
  assert.equal(buildEmailHref("not-an-email"), null);
  assert.equal(buildEmailHref("admin?subject=unsafe@example.test"), null);
  assert.equal(buildEmailHref("admin%0a@example.test"), null);
  assert.equal(buildEmailHref("admin.@example.test"), null);
});

test("public mapping derives href from type and never trusts the stored URL", () => {
  const contact = mapPublicOfficialContact({
    id: "10000000-0000-4000-8000-000000000001",
    label: " Telepon Desa ",
    contact_type: "phone",
    value: "0370 123456",
    description: "  Informasi resmi  ",
    display_order: 0,
  });
  assert.deepEqual(contact, {
    id: "10000000-0000-4000-8000-000000000001",
    label: "Telepon Desa",
    type: "phone",
    value: "0370123456",
    description: "Informasi resmi",
    href: "tel:0370123456",
    external: false,
  });
  assert.equal(
    mapPublicOfficialContact({
      id: "10000000-0000-4000-8000-000000000002",
      label: "Unsafe",
      contact_type: "url",
      value: "javascript:alert(1)",
      description: null,
      display_order: 1,
    }),
    null,
  );
});

test("primary WhatsApp distinguishes configured valid data from missing or invalid data", () => {
  assert.deepEqual(mapPrimaryWhatsapp("6281234567890"), {
    number: "6281234567890",
    displayValue: "+6281234567890",
    href: "https://wa.me/6281234567890",
  });
  assert.equal(mapPrimaryWhatsapp(null), null);
  assert.equal(mapPrimaryWhatsapp("08123456789"), null);
});

test("public result classification distinguishes unconfigured from invalid stored data", () => {
  assert.deepEqual(classifyPublicOfficialContacts(null, []), {
    kind: "ready",
    primaryWhatsapp: null,
    contacts: [],
  });
  assert.equal(
    classifyPublicOfficialContacts(
      { key: "primary_whatsapp_number", value: "6281234567890" },
      [],
    ).kind,
    "ready",
  );
  for (const setting of [
    { key: "another_setting", value: "6281234567890" },
    { key: "primary_whatsapp_number", value: "" },
    { key: "primary_whatsapp_number", value: "08123456789" },
  ]) {
    assert.equal(classifyPublicOfficialContacts(setting, []).kind, "error");
  }
  assert.equal(
    classifyPublicOfficialContacts(null, [
      {
        id: "10000000-0000-4000-8000-000000000003",
        label: "Unsafe",
        contact_type: "url",
        value: "javascript:alert(1)",
        description: null,
        display_order: 0,
      },
    ]).kind,
    "error",
  );
});

test("external tourism selectors match only canonical URL contact labels", () => {
  const contacts = [
    publicUrlContact({
      label: "  TRIPADVISOR  ",
      href: "https://example.test/tripadvisor ",
    }),
    publicUrlContact({
      id: "10000000-0000-4000-8000-000000000011",
      label: " google maps wisata ",
      href: "https://example.test/tourism-map",
    }),
    publicUrlContact({
      id: "10000000-0000-4000-8000-000000000012",
      label: "Situs Pariwisata Lain",
      href: "https://example.test/other",
    }),
  ];

  assert.deepEqual(selectTripadvisorLink(contacts), {
    platform: "tripadvisor",
    href: "https://example.test/tripadvisor",
  });
  assert.deepEqual(selectGoogleMapsTourismLink(contacts), {
    platform: "google-maps",
    href: "https://example.test/tourism-map",
  });
  assert.deepEqual(selectExternalTourismLinks(contacts), [
    {
      platform: "google-maps",
      href: "https://example.test/tourism-map",
    },
    {
      platform: "tripadvisor",
      href: "https://example.test/tripadvisor",
    },
  ]);
});

test("external tourism selectors reject wrong types, unsafe links, and unrelated contacts", () => {
  const wrongType = publicUrlContact({ type: "phone" });
  const unsafe = publicUrlContact({ href: "javascript:alert(1)" });
  const unrelated = publicUrlContact({ label: "Situs Desa" });

  assert.equal(selectTripadvisorLink([wrongType]), null);
  assert.equal(selectTripadvisorLink([unsafe]), null);
  assert.equal(selectTripadvisorLink([unrelated]), null);
  assert.deepEqual(
    selectExternalTourismLinks([wrongType, unsafe, unrelated]),
    [],
  );
});

test("external tourism selection represents one-link and no-link rendering states", () => {
  const tripadvisor = publicUrlContact();
  const googleMaps = publicUrlContact({
    label: "Google Maps Wisata",
    href: "https://example.test/tourism-map",
  });

  assert.equal(selectExternalTourismLinks([tripadvisor]).length, 1);
  assert.equal(selectExternalTourismLinks([googleMaps]).length, 1);
  assert.equal(selectExternalTourismLinks([]).length, 0);
});

test("public footer preserves WhatsApp and safely falls back for absent or failed contact data", () => {
  const primaryWhatsapp = mapPrimaryWhatsapp("6281234567890");
  assert.ok(primaryWhatsapp);
  assert.deepEqual(
    selectPublicFooterContactAction({
      kind: "ready",
      primaryWhatsapp,
      contacts: [],
    }),
    { kind: "whatsapp", href: "https://wa.me/6281234567890" },
  );
  assert.deepEqual(
    selectPublicFooterContactAction({
      kind: "ready",
      primaryWhatsapp: null,
      contacts: [],
    }),
    { kind: "contact-page", href: "/kontak" },
  );
  assert.deepEqual(selectPublicFooterContactAction({ kind: "error" }), {
    kind: "contact-page",
    href: "/kontak",
  });

  const footer = readFileSync("components/public/public-footer.tsx", "utf8");
  assert.match(footer, /selectPublicFooterContactAction\(contact\)/);
  assert.match(footer, /contactAction\.kind === "whatsapp"/);
  assert.match(footer, /href="\/kontak"/);
  assert.match(footer, /target="_blank"/);
  assert.match(footer, /rel="noopener noreferrer"/);
  assert.doesNotMatch(
    footer,
    /PUBLIC_OFFICIAL_CONTACT_UNAVAILABLE|throw new Error/,
  );
});

test("homepage external tourism section is optional, secure, and follows the internal map", () => {
  const section = readFileSync(
    "features/official-contact/external-tourism-links.tsx",
    "utf8",
  );
  const homepage = readFileSync("app/(public)/page.tsx", "utf8");

  assert.match(section, /if \(links\.length === 0\) return null/);
  assert.match(section, /if \(result\.kind === "error"\) return null/);
  assert.match(section, /target="_blank"/);
  assert.match(section, /rel="noopener noreferrer"/);
  assert.match(section, /aria-label={content\.accessibleLabel}/);
  assert.match(section, /focus-visible:outline/);
  assert.doesNotMatch(section, /from "next\/link"/);
  assert.doesNotMatch(
    section,
    /Apa Kata Pengunjung|Ulasan Pengunjung|Testimoni|rating|review count|ranking|★/i,
  );
  assert.doesNotMatch(
    section,
    /tripadvisor\.(?:com|co\.id)|google\.(?:com|co\.id)\/maps|maps\.app\.goo\.gl/i,
  );

  const mapPosition = homepage.indexOf('id="peta-wisata"');
  const externalPosition = homepage.indexOf("<ExternalTourismLinks />");
  const contactPosition = homepage.indexOf("<OfficialContactCta");
  assert.ok(mapPosition >= 0);
  assert.ok(externalPosition > mapPosition);
  assert.ok(contactPosition > externalPosition);
  assert.match(homepage, /href="\/peta-wisata"/);
  assert.match(homepage, /Buka peta wisata/);
  assert.match(homepage, /<OfficialContactCta[\s\S]*?fallbackOnError/);
  assert.doesNotMatch(section, /supabase[\\/]migrations|\.sql["']/);
});

test("contact validation normalizes a typed payload and rejects unknown fields", () => {
  const valid = validateContactInput(validContact(), null);
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.deepEqual(valid.data, {
      label: "Informasi Pariwisata",
      contact_type: "whatsapp",
      value: "6281234567890",
      url: "https://wa.me/6281234567890",
      description: "Kanal resmi",
      display_order: 1,
      status: "draft",
    });
  }
  const unknown = validateContactInput(
    { ...validContact(), created_by: "forged" },
    null,
  );
  assert.equal(unknown.success, false);
  if (!unknown.success)
    assert.match(unknown.formErrors.join(" "), /tidak dikenali/);
});

test("contact validation rejects malformed values and impossible lifecycle transitions", () => {
  for (const overrides of [
    { label: "   " },
    { contact_type: "script" },
    { value: "javascript:alert(1)" },
    { display_order: "-1" },
  ]) {
    assert.equal(
      validateContactInput(validContact(overrides), null).success,
      false,
    );
  }
  assert.equal(
    validateContactInput(validContact({ status: "published" }), "archived")
      .success,
    false,
  );
  assert.equal(
    validateContactInput(validContact({ status: "draft" }), "published")
      .success,
    false,
  );
  assert.deepEqual(getAllowedContactStatuses("archived"), [
    "archived",
    "draft",
  ]);
});

test("primary setting validates one approved field and supports an unconfigured value", () => {
  assert.deepEqual(
    validatePrimaryWhatsappInput({ primary_whatsapp_number: "" }),
    {
      success: true,
      value: "",
      data: null,
    },
  );
  assert.equal(
    validatePrimaryWhatsappInput({
      primary_whatsapp_number: "+62 812 3456 7890",
    }).success,
    true,
  );
  assert.equal(
    validatePrimaryWhatsappInput({ primary_whatsapp_number: "0812" }).success,
    false,
  );
  assert.equal(
    validatePrimaryWhatsappInput({
      primary_whatsapp_number: "6281234567890",
      extra: "x",
    }).success,
    false,
  );
});

test("create/update and duplicate decisions use exact trusted contracts", () => {
  assert.equal(getContactMutationMode(null), "create");
  assert.equal(getContactMutationMode({ id: "server-read" }), "update");
  assert.equal(
    isOfficialContactDuplicateError("23505", "contacts_active_value_idx"),
    true,
  );
  assert.equal(
    isOfficialContactDuplicateError("23505", "another_constraint"),
    false,
  );
});

test("public and admin integration use safe projections and server authorization", () => {
  const data = readFileSync("features/official-contact/data.ts", "utf8");
  const actions = readFileSync("features/official-contact/actions.ts", "utf8");
  assert.match(data, /\.from\("public_site_settings"\)/);
  assert.match(data, /\.from\("published_contacts"\)/);
  assert.doesNotMatch(data, /const PUBLIC_CONTACT_COLUMNS\s*=\s*[\s\S]*?url,/);
  assert.doesNotMatch(data, /SERVICE_ROLE|service_role/);
  assert.match(actions, /requireAdministrator\(\)/);
  assert.match(actions, /queryPrimaryWhatsappSetting/);
  assert.match(actions, /queryOfficialContactById/);
  assert.match(actions, /!current\.setting\.is_editable/);
  assert.match(actions, /revalidatePath\("\/\(public\)"/);
  assert.equal(existsSync("app/(public)/kontak/page.tsx"), true);
  assert.equal(existsSync("app/admin/kontak/page.tsx"), true);
});

test("all approved visitor inquiry surfaces use the centralized CTA contract", () => {
  const cta = readFileSync(
    "features/official-contact/official-contact-cta.tsx",
    "utf8",
  );
  assert.match(cta, /result\.primaryWhatsapp/);
  assert.match(cta, /result\.kind === "error" && !fallbackOnError/);
  assert.match(cta, /result\.kind === "error" \|\| !result\.primaryWhatsapp/);
  assert.match(cta, /href="\/kontak"/);
  assert.match(cta, /Hubungi WhatsApp Desa/);

  const visitorPages = [
    "app/(public)/page.tsx",
    "app/(public)/destinasi/[slug]/page.tsx",
    "app/(public)/paket-wisata/[slug]/page.tsx",
    "app/(public)/homestay/[slug]/page.tsx",
    "app/(public)/umkm/[slug]/page.tsx",
    "app/(public)/rumah-adat/[slug]/page.tsx",
    "app/(public)/acara-budaya/[slug]/page.tsx",
  ];
  for (const page of visitorPages) {
    assert.match(readFileSync(page, "utf8"), /<OfficialContactCta/);
  }
  for (const detailPage of visitorPages.slice(1)) {
    assert.doesNotMatch(readFileSync(detailPage, "utf8"), /fallbackOnError/);
  }
});
