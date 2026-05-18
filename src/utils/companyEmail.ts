export const COMPANY_EMAIL_DOMAIN = "@asoosoft.net";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const normalizeCompanyEmailInput = (value: string) => {
  const normalizedValue = normalizeEmail(value);

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.includes("@")
    ? normalizedValue
    : `${normalizedValue}${COMPANY_EMAIL_DOMAIN}`;
};

export const isCompanyEmail = (email: string) =>
  normalizeEmail(email).endsWith(COMPANY_EMAIL_DOMAIN);

export const parseCompanyEmailList = (input: string) => {
  const emails = input
    .split(/[\s,;]+/)
    .map(normalizeCompanyEmailInput)
    .filter(Boolean);

  return Array.from(new Set(emails));
};
