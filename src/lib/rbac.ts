import { Role } from "@prisma/client";

export type Permission =
  | "users:manage"
  | "currencies:manage"
  | "settings:manage"
  | "purchases:create"
  | "purchases:view"
  | "sales:create"
  | "sales:reverse"
  | "sales:view"
  | "lots:view"
  | "lots:adjust"
  | "inventory:view"
  | "ledger:view"
  | "reports:view"
  | "reports:export"
  | "audit:view"
  | "reconciliation:manage";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "users:manage",
    "currencies:manage",
    "settings:manage",
    "purchases:create",
    "purchases:view",
    "sales:create",
    "sales:reverse",
    "sales:view",
    "lots:view",
    "lots:adjust",
    "inventory:view",
    "ledger:view",
    "reports:view",
    "reports:export",
    "audit:view",
    "reconciliation:manage",
  ],
  ADMIN: [
    "currencies:manage",
    "purchases:create",
    "purchases:view",
    "sales:create",
    "sales:reverse",
    "sales:view",
    "lots:view",
    "lots:adjust",
    "inventory:view",
    "ledger:view",
    "reports:view",
    "reports:export",
    "audit:view",
    "reconciliation:manage",
  ],
  OPERATOR: [
    "purchases:create",
    "purchases:view",
    "sales:create",
    "sales:view",
    "lots:view",
    "inventory:view",
    "ledger:view",
    "reports:view",
  ],
  VIEWER: [
    "purchases:view",
    "sales:view",
    "lots:view",
    "inventory:view",
    "ledger:view",
    "reports:view",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canManageUsers(role: Role): boolean {
  return role === "SUPER_ADMIN";
}

export function canManageCurrencies(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canManageSettings(role: Role): boolean {
  return role === "SUPER_ADMIN";
}

export function canReverseSale(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canAdjustStock(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canCreateTransaction(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "OPERATOR";
}

export function isReadOnly(role: Role): boolean {
  return role === "VIEWER";
}
