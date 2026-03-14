import { SessionOptions } from "iron-session";

export interface SessionData {
  userId?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  isLoggedIn?: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || "fallback-password-that-is-at-least-32-chars-long",
  cookieName: "veille-formation-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};
