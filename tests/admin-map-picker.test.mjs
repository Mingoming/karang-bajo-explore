import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const {
  ADMIN_MAP_DEFAULT_CENTER,
  formatAdminCoordinate,
  getAdminCoordinatePair,
  parseAdminCoordinate,
} = await import("../features/admin-map/model.ts");

const picker = readFileSync(
  "features/admin-map/admin-coordinate-picker.tsx",
  "utf8",
);
const leaflet = readFileSync(
  "features/admin-map/admin-coordinate-picker-leaflet.tsx",
  "utf8",
);
const destinationForm = readFileSync(
  "features/destinations/destination-form.tsx",
  "utf8",
);
const homestayForm = readFileSync(
  "features/homestays/homestay-form.tsx",
  "utf8",
);
const umkmForm = readFileSync("features/umkm/umkm-form.tsx", "utf8");
const traditionalHouseForm = readFileSync(
  "features/traditional-houses/traditional-house-form.tsx",
  "utf8",
);
const culturalEventForm = readFileSync(
  "features/cultural-events/cultural-event-form.tsx",
  "utf8",
);
const villageProfileForm = readFileSync(
  "features/village-profile/village-profile-form.tsx",
  "utf8",
);

test("admin coordinate parsing accepts only finite in-range numbers", () => {
  assert.equal(parseAdminCoordinate("-8.35", -90, 90), -8.35);
  assert.equal(parseAdminCoordinate(" 116.27 ", -180, 180), 116.27);

  assert.equal(parseAdminCoordinate("", -90, 90), null);
  assert.equal(parseAdminCoordinate("abc", -90, 90), null);
  assert.equal(parseAdminCoordinate("Infinity", -90, 90), null);
  assert.equal(parseAdminCoordinate("91", -90, 90), null);
  assert.equal(parseAdminCoordinate("-181", -180, 180), null);
});

test("admin coordinate pair requires both valid values", () => {
  assert.deepEqual(getAdminCoordinatePair("-8.35", "116.27"), {
    latitude: -8.35,
    longitude: 116.27,
  });

  assert.equal(getAdminCoordinatePair("", ""), null);
  assert.equal(getAdminCoordinatePair("-8.35", ""), null);
  assert.equal(getAdminCoordinatePair("", "116.27"), null);
  assert.equal(getAdminCoordinatePair("91", "116.27"), null);
});

test("map-picked coordinates are formatted deterministically", () => {
  assert.equal(formatAdminCoordinate(-8.3512344), "-8.351234");
  assert.equal(formatAdminCoordinate(116.2712346), "116.271235");
  assert.equal(formatAdminCoordinate(-0), "0");
  assert.equal(formatAdminCoordinate(Number.NaN), "");

  assert.deepEqual(ADMIN_MAP_DEFAULT_CENTER, {
    latitude: -8.35,
    longitude: 116.27,
  });
});

test("admin picker keeps manual fields synchronized with a client-only map", () => {
  assert.match(picker, /^"use client";/);
  assert.match(
    picker,
    /dynamic\([\s\S]*?admin-coordinate-picker-leaflet[\s\S]*?ssr: false/,
  );

  assert.match(picker, /name="latitude"/);
  assert.match(picker, /name="longitude"/);
  assert.match(picker, /value=\{latitude\}/);
  assert.match(picker, /value=\{longitude\}/);
  assert.match(picker, /onPick=\{handlePick\}/);
  assert.match(picker, /aria-live="polite"/);
});

test("admin Leaflet picker supports click selection and manual fallback", () => {
  assert.match(leaflet, /^"use client";/);
  assert.match(leaflet, /useMapEvents/);
  assert.match(leaflet, /click\(event\)/);
  assert.match(leaflet, /onPick\(event\.latlng\.lat/);
  assert.match(leaflet, /<CircleMarker/);
  assert.match(leaflet, /setView\(/);
  assert.match(leaflet, /invalidateSize\(/);
  assert.match(leaflet, /ResizeObserver/);
  assert.match(leaflet, /openstreetmap\.org\/copyright/);
  assert.match(leaflet, /tileerror/);
  assert.match(leaflet, /Koordinat tetap dapat dimasukkan secara\s+manual\./);
});

test("destination form uses the reusable required coordinate picker", () => {
  assert.match(destinationForm, /AdminCoordinatePicker/);
  assert.match(destinationForm, /latitudeValue=\{state\.values\.latitude\}/);
  assert.match(destinationForm, /longitudeValue=\{state\.values\.longitude\}/);
  assert.match(destinationForm, /required/);

  assert.doesNotMatch(
    destinationForm,
    /Peta interaktif tidak\s+termasuk dalam tahap ini/,
  );
  assert.doesNotMatch(destinationForm, /name="latitude"/);
  assert.doesNotMatch(destinationForm, /name="longitude"/);
  assert.doesNotMatch(destinationForm, /id="latitude"/);
  assert.doesNotMatch(destinationForm, /id="longitude"/);
});

test("admin picker never requests or stores device location", () => {
  const combined = `${picker}\n${leaflet}`;

  assert.doesNotMatch(
    combined,
    /navigator\.geolocation|getCurrentPosition|watchPosition/,
  );
  assert.doesNotMatch(combined, /\.insert\(|\.update\(|\.upsert\(|\.rpc\(/);
  assert.doesNotMatch(combined, /SERVICE_ROLE|service.?role/i);
});

test("remaining public map forms use one reusable optional coordinate picker", () => {
  const forms = [
    ["homestay", homestayForm],
    ["UMKM", umkmForm],
    ["traditional house", traditionalHouseForm],
  ];

  for (const [label, source] of forms) {
    assert.equal(
      source.match(/<AdminCoordinatePicker/g)?.length,
      1,
      `${label} must render exactly one coordinate picker`,
    );

    const pickerUsage = source.match(/<AdminCoordinatePicker[\s\S]*?\/>/);

    assert.ok(
      pickerUsage,
      `${label} must render the reusable coordinate picker`,
    );

    assert.match(pickerUsage[0], /latitudeValue=\{state\.values\.latitude\}/);
    assert.match(pickerUsage[0], /longitudeValue=\{state\.values\.longitude\}/);
    assert.match(
      pickerUsage[0],
      /latitudeError=\{state\.fieldErrors\.latitude\}/,
    );
    assert.match(
      pickerUsage[0],
      /longitudeError=\{state\.fieldErrors\.longitude\}/,
    );

    assert.doesNotMatch(pickerUsage[0], /\brequired\b/);

    assert.doesNotMatch(source, /name="latitude"/);
    assert.doesNotMatch(source, /name="longitude"/);
    assert.doesNotMatch(source, /id="latitude"/);
    assert.doesNotMatch(source, /id="longitude"/);
    assert.doesNotMatch(source, /Peta interaktif[\s\S]*?tahap ini/i);
  }
});

test("other coordinate forms use one reusable optional coordinate picker", () => {
  const forms = [
    ["cultural event", culturalEventForm],
    ["village profile", villageProfileForm],
  ];

  for (const [label, source] of forms) {
    assert.equal(
      source.match(/<AdminCoordinatePicker/g)?.length,
      1,
      `${label} must render exactly one coordinate picker`,
    );

    const pickerUsage = source.match(/<AdminCoordinatePicker[\s\S]*?\/>/);

    assert.ok(
      pickerUsage,
      `${label} must render the reusable coordinate picker`,
    );

    assert.match(pickerUsage[0], /latitudeValue=\{state\.values\.latitude\}/);
    assert.match(pickerUsage[0], /longitudeValue=\{state\.values\.longitude\}/);
    assert.match(
      pickerUsage[0],
      /latitudeError=\{state\.fieldErrors\.latitude\}/,
    );
    assert.match(
      pickerUsage[0],
      /longitudeError=\{state\.fieldErrors\.longitude\}/,
    );

    assert.doesNotMatch(pickerUsage[0], /\brequired\b/);

    assert.doesNotMatch(source, /name="latitude"/);
    assert.doesNotMatch(source, /name="longitude"/);
    assert.doesNotMatch(source, /id="latitude"/);
    assert.doesNotMatch(source, /id="longitude"/);

    assert.doesNotMatch(source, /Peta interaktif[\s\S]*?(?:modul|tahap) ini/i);
  }
});
