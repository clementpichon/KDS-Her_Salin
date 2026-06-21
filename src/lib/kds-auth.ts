export const KDS_AUTH_KEY = "hersalin_auth_v1";

const KDS_CREDENTIALS_KEY = "hersalin_credentials_v1";
const DEFAULT_USER = "Her Salin";
const DEFAULT_PASS = "Vi&3Xh=8pQ-";

type StoredCredentials = {
  user?: string;
  pass?: string;
};

export function getKdsCredentials() {
  if (typeof window === "undefined") {
    return { user: DEFAULT_USER, pass: DEFAULT_PASS };
  }

  try {
    const stored = window.localStorage.getItem(KDS_CREDENTIALS_KEY);
    const parsed = stored ? (JSON.parse(stored) as StoredCredentials) : {};
    return {
      user: parsed.user || DEFAULT_USER,
      pass: parsed.pass || DEFAULT_PASS,
    };
  } catch {
    return { user: DEFAULT_USER, pass: DEFAULT_PASS };
  }
}

export function verifyKdsCredentials(user: string, pass: string) {
  const credentials = getKdsCredentials();
  return user.trim() === credentials.user && pass === credentials.pass;
}

export function updateKdsPassword(newPassword: string) {
  const credentials = getKdsCredentials();
  window.localStorage.setItem(
    KDS_CREDENTIALS_KEY,
    JSON.stringify({ user: credentials.user, pass: newPassword }),
  );
}

export function resetKdsPassword() {
  window.localStorage.removeItem(KDS_CREDENTIALS_KEY);
}
