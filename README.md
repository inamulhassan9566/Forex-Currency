# FOREX OS — High-End Forex Lot Management System

> **Apple × Linear × Raycast × Stripe × Premium Private Banking**  
> An enterprise-grade, production-ready Forex Lot Management System designed for institutional currency trading departments, treasury desks, and financial operators.

---

## 💎 Design Philosophy & Aesthetics
- **Dark Apple Minimalism**: Pure refined dark palette (`#050505`, `#080808`, `#0A0A0A`) with generous whitespace, crisp typography, and restrained borders.
- **Subtle Glassmorphism (10%)**: Elevated floating modals, command palette, right-side slide-over drawers, and KPI metric surfaces with 20px blur and `rgba(255,255,255,0.06)` borders.
- **Large Tabular Financial Typography**: Prominent numbers with fixed letter spacing and monospace alignment for effortless scanning of millions in currency positions.
- **Restrained Color Hierarchy**: Black and white dominate the user experience. Positive green, restrained red, and warm amber are reserved strictly for financial profit/loss and threshold compliance alerts.

---

## ⚡ Core Business Features
1. **Lot-Wise Inventory Tracking**:
   - Every purchase automatically provisions an immutable, traceable lot (e.g. `LOT-1001`) with its locked acquisition unit cost.
   - Status progression: `AVAILABLE` (100% stock) $\rightarrow$ `PARTIALLY_SOLD` $\rightarrow$ `SOLD_OUT`.
2. **Stepped Sale & FIFO Allocation**:
   - Progressive 5-step sale flow: 01 Currency $\rightarrow$ 02 Quantity $\rightarrow$ 03 Allocation $\rightarrow$ 04 Price $\rightarrow$ 05 Review.
   - **FIFO Auto-Allocation**: Prioritizes oldest active lots first according to standard accounting principles.
   - **Manual Lot Selection**: Select specific individual lots with live units remaining and purchase dates.
   - **Live Profit Calculator**: Instantly computes unit spread and expected profit per contributing lot in real time.
3. **Slide-over Sale Detail Drawer**:
   - Clicking any sale row opens a smooth right-side drawer displaying full lot deduction breakdowns, settlement amounts, and reversal triggers.
4. **Non-Destructive Reversals**:
   - Support for trade cancellations with stock restored to original lots, realized profit reversal, and immutable audit logs.
5. **Inventory Reconciliation**:
   - Verifies expected stock ($\text{Purchases} - \text{Sales} \pm \text{Adjustments}$) against actual lot physical counts with variance alerts and audited adjustment tools.
6. **Executive Profit Analytics**:
   - Realized profit tracking, margin percentages, average profit per unit, and interactive SVG performance trend charts.
7. **Raycast-Inspired Command Palette (`⌘ K` / `Ctrl + K`)**:
   - Instant keyboard navigation across all views, active lots, currencies, and trading operations.
8. **Role-Based Access Control (RBAC)**:
   - Fine-grained permissions for `SUPER_ADMIN`, `ADMIN`, `OPERATOR`, and `VIEWER`.
9. **Zero Floating-Point Financial Engine**:
   - All arithmetic executed with `FinanceDecimal` wrapping `decimal.js` for 20-digit fixed precision.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js 18+ (tested on Node v22.14.0)
- PostgreSQL database

### Installation & Launch
```bash
# 1. Install dependencies
npm install

# 2. Push schema to PostgreSQL database
npx prisma db push

# 3. Seed demonstration data (Lots 1001-1006, Currencies, POs, Sales)
node prisma/seed.js

# 4. Build and start production server
npm run build
npm run start
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Access Credentials
| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@example.com` | `Admin@123456` | Full system access, users, settings, reversals |
| **Trading Operator** | `operator@example.com` | `Operator@123456` | Purchases, sales, lot allocation, inventory |
| **Auditor / Viewer** | `viewer@example.com` | `Viewer@123456` | Read-only ledger, reports, and analytics |

---

## 🧪 Testing & Verification
Run the comprehensive automated unit and integration test suite:
```bash
npm test
```
- `tests/unit/business-rules.test.ts`: Verifies Decimal precision, profit per unit calculations, FIFO multi-lot allocation logic, and insufficient stock barriers.
- `tests/integration/trading-flow.test.ts`: Verifies complete end-to-end trading lifecycle: Purchase $\rightarrow$ Lot Generation $\rightarrow$ Multi-Lot FIFO Sale $\rightarrow$ Lot Stock Reduction $\rightarrow$ Sale Reversal & Stock Restoration $\rightarrow$ RBAC enforcement.

---

## 📚 Documentation
- [Business Logic & Mathematical Precision](docs/BUSINESS_LOGIC.md)
- [Database Architecture & Schema Reference](docs/DATABASE.md)
- [Vercel & Cloud Deployment Guide](docs/DEPLOYMENT.md)
- [Trading Desk Operator Guide](docs/USER_GUIDE.md)
