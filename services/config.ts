const normalizeCsv = (value: string | undefined): string[] =>
  (value || "")
    .split(",")
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);

const readEnv = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];
  return typeof value === "string" ? value.trim() : "";
};

export const env = {
  firebaseApiKey: readEnv("VITE_FIREBASE_API_KEY"),
  firebaseAuthDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  firebaseProjectId: readEnv("VITE_FIREBASE_PROJECT_ID"),
  firebaseStorageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  firebaseMessagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  firebaseAppId: readEnv("VITE_FIREBASE_APP_ID"),
  firebaseMeasurementId: readEnv("VITE_FIREBASE_MEASUREMENT_ID"),
  adminEmails: normalizeCsv(readEnv("VITE_ADMIN_EMAILS")),
};

export const resolveUserRole = (
  email: string | null | undefined,
  storedRole: "user" | "admin" | undefined
): "user" | "admin" => {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const allowlisted = normalizedEmail !== "" && env.adminEmails.includes(normalizedEmail);

  if (storedRole === "admin" && allowlisted) {
    return "admin";
  }

  return "user";
};
