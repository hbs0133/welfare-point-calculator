const AUTH_EMAIL_DOMAIN = "welfare-point.asoosoft.local";
const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export const normalizeLoginId = (loginId: string) => loginId.trim().toLowerCase();

export const isValidLoginId = (loginId: string) => LOGIN_ID_PATTERN.test(loginId);

export const createAuthEmail = (loginId: string) =>
  `${normalizeLoginId(loginId)}@${AUTH_EMAIL_DOMAIN}`;

export const getLoginIdFromEmail = (email: string) => {
  const suffix = `@${AUTH_EMAIL_DOMAIN}`;
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
};
