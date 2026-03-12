import type { SessionOptions } from "iron-session";

export interface SessionData {
    user?: {
        id: number;
        username: string;
        role: string;
    };
}

export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_SECRET as string,
    cookieName: "gcg_session",
    cookieOptions: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 8, // 8 hours
    },
};
