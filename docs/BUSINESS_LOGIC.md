# Forex Lot Management System — Core Business Logic & Financial Precision

## 1. Domain Overview
The Forex Lot Management System (`FOREX OS`) operates on the physical principle of **Lot-based Inventory Tracking**. In foreign exchange departments, physical currency is acquired at varying market spot rates. Storing currency as fungible pools causes blended-rate distortions and inaccurate tax/accounting reporting. By treating each inbound purchase as an individual immutable lot, exact unit cost basis and lot-wise realized profit are maintained throughout the transaction lifecycle.

---

## 2. Inbound Workflow: Purchases & Lot Creation
```
Purchase Order Created
        │
        ▼
Generate Sequential Lot (e.g. LOT-1004)
        │
        ├─ Set Initial Cost Basis (e.g. ₹94.50 / unit)
        ├─ Set Original Quantity (e.g. 500 units)
        ├─ Set Remaining Quantity (e.g. 500 units)
        └─ Initial Status = AVAILABLE
        │
        ▼
Record Inbound Movement in Stock Ledger
        │
        ▼
Log Immutable Audit Trail (PURCHASE_CREATED)
```

1. **Lot Cost Basis**: Every lot locks in its acquisition price per unit.
2. **Status Progression**:
   - `AVAILABLE`: 100% of original quantity remains.
   - `PARTIALLY_SOLD`: Some units have been dispatched, but remaining stock > 0.
   - `SOLD_OUT`: Remaining balance equals 0.

---

## 3. Outbound Workflow: Sales & Multi-Lot Allocation
When selling foreign currency, the operator dispatches stock from one or more existing lots.

### A. FIFO Allocation (First-In, First-Out)
- Oldest active lots by purchase date are queried first.
- The system automatically allocates units starting from the oldest lot until the requested quantity is completely fulfilled.
- If total vault reserves are less than requested, a shortfall is calculated and execution is prevented.

### B. Manual Allocation
- Operators can manually select specific active lots and specify the exact quantity to draw from each lot.

### C. Live Profit Calculation Formula
For each allocated lot $i$:
$$\text{Profit per Unit}_i = \text{Sell Price}_i - \text{Purchase Price}_i$$
$$\text{Realized Lot Profit}_i = \text{Allocated Quantity}_i \times \text{Profit per Unit}_i$$
$$\text{Total Realized Profit} = \sum_{i=1}^{n} \text{Realized Lot Profit}_i$$
$$\text{Total Settlement Value} = \sum_{i=1}^{n} (\text{Allocated Quantity}_i \times \text{Sell Price}_i)$$

### Example (Source Business Scenario):
- **Lot 1001**: 50 units remaining @ ₹93.50 purchase rate.
- **Lot 1004**: 500 units remaining @ ₹94.50 purchase rate.
- **Customer Order**: 700 units @ ₹96.50 selling rate.
- **FIFO Allocation**:
  - `LOT-1001`: Takes all 50 units @ ₹93.50 $\rightarrow$ Realized profit = $50 \times (96.50 - 93.50) = \mathbf{₹150.00}$.
  - `LOT-1004`: Takes 650 units (if available) @ ₹94.50 $\rightarrow$ Realized profit = $650 \times (96.50 - 94.50) = \mathbf{₹1,300.00}$.
  - **Total Realized Profit**: $₹150 + ₹1,300 = \mathbf{₹1,450.00}$.

---

## 4. Non-Destructive Reversals
Financial transactions cannot be silently deleted. If a customer trade is cancelled due to wire failure:
1. The Sale record is marked as `REVERSED`.
2. A mandatory audited reason must be provided by the operator.
3. Every lot that contributed stock has its remaining balance restored by the exact amount deducted.
4. Lot statuses are restored (`SOLD_OUT` $\rightarrow$ `PARTIALLY_SOLD` or `AVAILABLE`).
5. Realized profit is zeroed out or counterbalanced in reports.
6. A `SALE_REVERSAL` movement is appended to the immutable stock ledger.

---

## 5. Inventory Reconciliation Equation
At any time, theoretical inventory position must mathematically equal active vault balances:

$$\text{Expected Stock} = \text{Total Purchases} - \text{Total Sales} \pm \text{Audited Adjustments}$$
$$\text{Actual Stock} = \sum_{\text{active lots}} \text{Remaining Quantity}$$
$$\text{Variance} = \text{Actual Stock} - \text{Expected Stock}$$

- If $\text{Variance} = 0$: State is **Balanced**.
- If $\text{Variance} \neq 0$: State is **Mismatch**. Operators can inspect the transaction breakdown and execute an audited `INCREASE` or `DECREASE` adjustment with mandatory compliance remarks.

---

## 6. Financial Precision Guarantees
JavaScript native floating-point numbers (`0.1 + 0.2 === 0.30000000000000004`) are **strictly prohibited** in financial calculations. All math operations throughout `FOREX OS` utilize `FinanceDecimal` wrapping `decimal.js` with exact 20-digit fixed-point precision, ensuring banker's rounding compliance and zero float drift.
