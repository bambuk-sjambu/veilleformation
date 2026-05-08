import { SessionOptions } from "iron-session";

export interface SessionData {
  userId?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  isLoggedIn?: boolean;
}

const SESSION_PASSWORD = process.env.SESSION_PASSWORD;
if (!SESSION_PASSWORD || SESSION_PASSWORD.length < 32) {
  // En production : crash explicite au boot. En dev : warning + fallback dev-only
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_PASSWORD must be set in production (32+ chars). Refusing to start."
    );
  }
  console.warn(
    "WARN: SESSION_PASSWORD missing or too short — using dev fallback. Set a real one for production."
  );
}

export const sessionOptions: SessionOptions = {
  password:
    SESSION_PASSWORD && SESSION_PASSWORD.length >= 32
      ? SESSION_PASSWORD
      : "dev-only-fallback-password-32-chars-min-do-not-use-in-prod",
  cookieName: "veille-formation-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};
