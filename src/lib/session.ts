import type { SessionOptions } from "iron-session";

export interface SessionData {
    user?: {
        id: number;
        username: string;
        role: string;
    };
}

const FALLBACK_SESSION_SECRET = "change-this-session-secret-in-production-123456";
const sessionPassword = process.env.SESSION_SECRET || FALLBACK_SESSION_SECRET;

export const sessionOptions: SessionOptions = {
    password: sessionPassword,
    cookieName: "gcg_session",
    cookieOptions: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 8, // 8 hours
    },
};
