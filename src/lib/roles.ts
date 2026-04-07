export type AppRole = "ADMIN" | "USER_VIP" | "USER";

export function normalizeAppRole(role: string | null | undefined): AppRole {
    const value = String(role ?? "").trim().toUpperCase();

    if (value === "ADMIN" || value === "SUPERADMIN" || value === "SUPER_ADMIN") {
        return "ADMIN";
    }

    if (value === "USER_VIP" || value === "VIP" || value === "STAFF") {
        return "USER_VIP";
    }

    return "USER";
}

export function isAdminRole(role: string | null | undefined): boolean {
    return normalizeAppRole(role) === "ADMIN";
}

export function isVipRole(role: string | null | undefined): boolean {
    const normalized = normalizeAppRole(role);
    return normalized === "ADMIN" || normalized === "USER_VIP";
}

export function isBasicUserRole(role: string | null | undefined): boolean {
    return normalizeAppRole(role) === "USER";
}
