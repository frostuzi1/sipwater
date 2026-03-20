export const ADMIN_EMAIL = "valediomari@gmail.com";

export function isAdminEmail(email?: string | null) {
  return (email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

