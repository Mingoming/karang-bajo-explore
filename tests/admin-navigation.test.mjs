import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_NAVIGATION,
  getAdminPageTitle,
  isAdminNavigationItemActive,
} from "../config/admin-navigation.ts";

test("navigation contains the approved routes in order", () => {
  assert.deepEqual(
    ADMIN_NAVIGATION.map(({ href }) => href),
    [
      "/admin",
      "/admin/profil-desa",
      "/admin/destinasi",
      "/admin/paket-wisata",
      "/admin/homestay",
      "/admin/umkm",
      "/admin/rumah-adat",
      "/admin/acara-budaya",
      "/admin/media",
      "/admin/pengaturan",
    ],
  );
});

test("dashboard is active only on the admin root", () => {
  assert.equal(isAdminNavigationItemActive("/admin", "/admin"), true);
  assert.equal(
    isAdminNavigationItemActive("/admin/destinasi", "/admin"),
    false,
  );
});

test("a nested route retains its parent module active state", () => {
  assert.equal(
    isAdminNavigationItemActive(
      "/admin/destinasi/contoh/edit",
      "/admin/destinasi",
    ),
    true,
  );
  assert.equal(
    isAdminNavigationItemActive("/admin/destinasi-lain", "/admin/destinasi"),
    false,
  );
});

test("page titles follow the active navigation item", () => {
  assert.equal(getAdminPageTitle("/admin"), "Dashboard");
  assert.equal(getAdminPageTitle("/admin/paket-wisata/baru"), "Paket Wisata");
  assert.equal(getAdminPageTitle("/admin/rute-tidak-dikenal"), "Administrator");
});
