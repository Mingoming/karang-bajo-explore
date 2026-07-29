const DEFAULT_ADMIN_PATH = "/admin";
const LOCAL_ORIGIN = "https://karang-bajo.invalid";

export function getSafeAdminRedirect(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_ADMIN_PATH;
  }

  try {
    const url = new URL(value, LOCAL_ORIGIN);

    if (
      url.origin !== LOCAL_ORIGIN ||
      (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/"))
    ) {
      return DEFAULT_ADMIN_PATH;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_ADMIN_PATH;
  }
}

export function getSafeAuthCallbackRedirect(value: string | null | undefined) {
  if (value === "/reset-password") {
    return value;
  }

  return getSafeAdminRedirect(value);
}
