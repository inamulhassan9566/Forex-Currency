import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const PurchaseCreateSchema = z.object({
  currencyId: z.string().min(1, "Currency is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  purchasePrice: z.number().nonnegative("Purchase price cannot be negative"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  supplier: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  customLotNumber: z.string().optional(),
  entryType: z.enum(["PURCHASE", "OPENING_BALANCE"]).default("PURCHASE").optional(),
});

export const SaleAllocationItemSchema = z.object({
  lotId: z.string().min(1, "Lot ID is required"),
  quantity: z.number().positive("Sold quantity must be greater than 0"),
  sellPrice: z.number().nonnegative("Sell price cannot be negative"),
});

export const SaleCreateSchema = z.object({
  currencyId: z.string().min(1, "Currency is required"),
  totalQuantity: z.number().positive("Total quantity must be greater than 0"),
  saleDate: z.string().min(1, "Sale date is required"),
  customerName: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  allocationMethod: z.enum(["MANUAL", "FIFO"]).default("FIFO"),
  allocations: z.array(SaleAllocationItemSchema).min(1, "At least one lot allocation is required"),
});

export const SalePreviewSchema = z.object({
  currencyId: z.string().min(1, "Currency is required"),
  totalQuantity: z.number().positive("Total quantity must be greater than 0"),
  sellPrice: z.number().nonnegative("Sell price cannot be negative").optional(),
  allocationMethod: z.enum(["MANUAL", "FIFO"]).default("FIFO"),
  manualAllocations: z
    .array(
      z.object({
        lotId: z.string(),
        quantity: z.number().positive(),
        sellPrice: z.number().nonnegative(),
      })
    )
    .optional(),
});

export const SaleReverseSchema = z.object({
  reason: z.string().min(3, "Reason for reversal is required (min 3 characters)"),
});

export const CurrencySchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(5, "Code max 5 characters")
    .transform((v) => v.toUpperCase()),
  name: z.string().min(2, "Name must be at least 2 characters"),
  symbol: z.string().default("$"),
  decimalPrecision: z.number().int().min(0).max(6).default(2),
  minStockThreshold: z.number().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const StockAdjustmentSchema = z.object({
  lotId: z.string().min(1, "Lot is required"),
  adjustmentType: z.enum(["INCREASE", "DECREASE"]),
  quantity: z.number().positive("Adjustment quantity must be greater than 0"),
  reason: z.string().min(3, "Reason for adjustment is required"),
});

export const UserCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "OPERATOR", "VIEWER"]).default("OPERATOR"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const UserUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "OPERATOR", "VIEWER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const SettingsSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  baseCurrency: z.string().default("USD"),
  timezone: z.string().default("UTC"),
  dateFormat: z.string().default("DD/MM/YYYY"),
  defaultAllocationMethod: z.enum(["MANUAL", "FIFO"]).default("FIFO"),
  lotNumberPrefix: z.string().default("LOT-"),
  saleNumberPrefix: z.string().default("INV-"),
  purchaseNumberPrefix: z.string().default("PO-"),
  financialYear: z.string().default("2026-2027"),
});

export const LotUpdateSchema = z.object({
  lotNumber: z
    .string()
    .trim()
    .min(1, "Lot number cannot be empty")
    .optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(["AVAILABLE", "PARTIALLY_SOLD", "SOLD_OUT", "CANCELLED"]).optional(),
});

export const LotDirectCreateSchema = z.object({
  currencyId: z.string().min(1, "Currency is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  purchasePrice: z.number().nonnegative("Purchase price cannot be negative"),
  purchaseDate: z.string().min(1, "Acquisition date is required"),
  lotNumber: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  entryType: z.enum(["PURCHASE", "OPENING_BALANCE"]).default("PURCHASE").optional(),
});

