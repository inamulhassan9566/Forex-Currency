-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('AVAILABLE', 'PARTIALLY_SOLD', 'SOLD_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('CONFIRMED', 'REVERSED');

-- CreateEnum
CREATE TYPE "AllocationMethod" AS ENUM ('MANUAL', 'FIFO');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('PURCHASE', 'SALE', 'SALE_REVERSAL', 'PURCHASE_REVERSAL', 'ADJUSTMENT', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('INCREASE', 'DECREASE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT '$',
    "decimalPrecision" INTEGER NOT NULL DEFAULT 2,
    "minStockThreshold" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "originalQuantity" DECIMAL(18,4) NOT NULL,
    "remainingQuantity" DECIMAL(18,4) NOT NULL,
    "purchasePrice" DECIMAL(18,4) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "totalPurchaseCost" DECIMAL(18,4) NOT NULL,
    "status" "LotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "purchasePrice" DECIMAL(18,4) NOT NULL,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "supplier" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "totalQuantity" DECIMAL(18,4) NOT NULL,
    "averageSellPrice" DECIMAL(18,4) NOT NULL,
    "totalSaleAmount" DECIMAL(18,4) NOT NULL,
    "totalPurchaseCost" DECIMAL(18,4) NOT NULL,
    "totalRealizedProfit" DECIMAL(18,4) NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "allocationMethod" "AllocationMethod" NOT NULL DEFAULT 'FIFO',
    "status" "SaleStatus" NOT NULL DEFAULT 'CONFIRMED',
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "reversedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_lot_allocations" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "purchasePrice" DECIMAL(18,4) NOT NULL,
    "sellPrice" DECIMAL(18,4) NOT NULL,
    "totalPurchaseCost" DECIMAL(18,4) NOT NULL,
    "totalSaleAmount" DECIMAL(18,4) NOT NULL,
    "profitPerUnit" DECIMAL(18,4) NOT NULL,
    "totalProfit" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_lot_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "transactionType" "InventoryTransactionType" NOT NULL,
    "quantityIn" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantityOut" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "balanceAfter" DECIMAL(18,4) NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "notes" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_records" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "purchasePrice" DECIMAL(18,4) NOT NULL,
    "sellPrice" DECIMAL(18,4) NOT NULL,
    "profitPerUnit" DECIMAL(18,4) NOT NULL,
    "realizedProfit" DECIMAL(18,4) NOT NULL,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "adjustmentType" "AdjustmentType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "previousRemainingQuantity" DECIMAL(18,4) NOT NULL,
    "newRemainingQuantity" DECIMAL(18,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Apex Forex Trading Corp',
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "defaultAllocationMethod" TEXT NOT NULL DEFAULT 'FIFO',
    "lotNumberPrefix" TEXT NOT NULL DEFAULT 'LOT-',
    "saleNumberPrefix" TEXT NOT NULL DEFAULT 'INV-',
    "purchaseNumberPrefix" TEXT NOT NULL DEFAULT 'PO-',
    "financialYear" TEXT NOT NULL DEFAULT '2026-2027',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currencies_code_idx" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currencies_isActive_idx" ON "currencies"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "lots_lotNumber_key" ON "lots"("lotNumber");

-- CreateIndex
CREATE INDEX "lots_lotNumber_idx" ON "lots"("lotNumber");

-- CreateIndex
CREATE INDEX "lots_currencyId_idx" ON "lots"("currencyId");

-- CreateIndex
CREATE INDEX "lots_status_idx" ON "lots"("status");

-- CreateIndex
CREATE INDEX "lots_purchaseDate_idx" ON "lots"("purchaseDate");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_purchaseNumber_key" ON "purchases"("purchaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_lotId_key" ON "purchases"("lotId");

-- CreateIndex
CREATE INDEX "purchases_purchaseNumber_idx" ON "purchases"("purchaseNumber");

-- CreateIndex
CREATE INDEX "purchases_currencyId_idx" ON "purchases"("currencyId");

-- CreateIndex
CREATE INDEX "purchases_purchaseDate_idx" ON "purchases"("purchaseDate");

-- CreateIndex
CREATE INDEX "purchases_status_idx" ON "purchases"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_saleNumber_key" ON "sales"("saleNumber");

-- CreateIndex
CREATE INDEX "sales_saleNumber_idx" ON "sales"("saleNumber");

-- CreateIndex
CREATE INDEX "sales_currencyId_idx" ON "sales"("currencyId");

-- CreateIndex
CREATE INDEX "sales_saleDate_idx" ON "sales"("saleDate");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "sales"("status");

-- CreateIndex
CREATE INDEX "sale_lot_allocations_saleId_idx" ON "sale_lot_allocations"("saleId");

-- CreateIndex
CREATE INDEX "sale_lot_allocations_lotId_idx" ON "sale_lot_allocations"("lotId");

-- CreateIndex
CREATE INDEX "inventory_transactions_lotId_idx" ON "inventory_transactions"("lotId");

-- CreateIndex
CREATE INDEX "inventory_transactions_currencyId_idx" ON "inventory_transactions"("currencyId");

-- CreateIndex
CREATE INDEX "inventory_transactions_transactionType_idx" ON "inventory_transactions"("transactionType");

-- CreateIndex
CREATE INDEX "inventory_transactions_transactionDate_idx" ON "inventory_transactions"("transactionDate");

-- CreateIndex
CREATE INDEX "inventory_transactions_referenceId_idx" ON "inventory_transactions"("referenceId");

-- CreateIndex
CREATE INDEX "profit_records_saleId_idx" ON "profit_records"("saleId");

-- CreateIndex
CREATE INDEX "profit_records_lotId_idx" ON "profit_records"("lotId");

-- CreateIndex
CREATE INDEX "profit_records_currencyId_idx" ON "profit_records"("currencyId");

-- CreateIndex
CREATE INDEX "profit_records_transactionDate_idx" ON "profit_records"("transactionDate");

-- CreateIndex
CREATE INDEX "profit_records_isReversed_idx" ON "profit_records"("isReversed");

-- CreateIndex
CREATE INDEX "stock_adjustments_lotId_idx" ON "stock_adjustments"("lotId");

-- CreateIndex
CREATE INDEX "stock_adjustments_currencyId_idx" ON "stock_adjustments"("currencyId");

-- CreateIndex
CREATE INDEX "stock_adjustments_createdAt_idx" ON "stock_adjustments"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lot_allocations" ADD CONSTRAINT "sale_lot_allocations_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lot_allocations" ADD CONSTRAINT "sale_lot_allocations_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_records" ADD CONSTRAINT "profit_records_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_records" ADD CONSTRAINT "profit_records_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "sale_lot_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_records" ADD CONSTRAINT "profit_records_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_records" ADD CONSTRAINT "profit_records_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

