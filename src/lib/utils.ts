import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import FinanceDecimal from "./decimal";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | string | null | undefined,
  currencyCode = "USD",
  decimals = 2
): string {
  if (value === null || value === undefined) return "0.00";
  const num = FinanceDecimal.toNumber(value, decimals);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode.length === 3 ? currencyCode : "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatAmount(
  value: number | string | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined) return "0.00";
  const num = FinanceDecimal.toNumber(value, decimals);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
