import Decimal from "decimal.js";

// Configure Decimal.js for financial precision: 20 digits of precision, ROUND_HALF_UP (banker's / commercial standard)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class FinanceDecimal {
  /**
   * Safely parse a value into a Decimal instance.
   */
  static parse(val: number | string | Decimal | null | undefined): Decimal {
    if (val === null || val === undefined || val === "") {
      return new Decimal(0);
    }
    return new Decimal(val.toString());
  }

  /**
   * Calculate profit per unit: sellPrice - purchasePrice
   */
  static profitPerUnit(
    sellPrice: number | string | Decimal,
    purchasePrice: number | string | Decimal
  ): Decimal {
    const sp = this.parse(sellPrice);
    const pp = this.parse(purchasePrice);
    return sp.minus(pp);
  }

  /**
   * Calculate total profit: profitPerUnit * quantity
   */
  static totalProfit(
    profitPerUnit: number | string | Decimal,
    quantity: number | string | Decimal
  ): Decimal {
    const ppu = this.parse(profitPerUnit);
    const qty = this.parse(quantity);
    return ppu.times(qty);
  }

  /**
   * Calculate total monetary amount: price * quantity
   */
  static totalAmount(
    price: number | string | Decimal,
    quantity: number | string | Decimal
  ): Decimal {
    const p = this.parse(price);
    const qty = this.parse(quantity);
    return p.times(qty);
  }

  /**
   * Calculate remaining stock after sale: currentRemaining - soldQuantity
   */
  static deductStock(
    currentRemaining: number | string | Decimal,
    soldQuantity: number | string | Decimal
  ): Decimal {
    const cur = this.parse(currentRemaining);
    const sold = this.parse(soldQuantity);
    return cur.minus(sold);
  }

  /**
   * Format Decimal to fixed decimal places string (default 2, or custom like 4 for forex)
   */
  static toFixedString(
    val: number | string | Decimal | null | undefined,
    decimals = 2
  ): string {
    const d = this.parse(val);
    return d.toFixed(decimals);
  }

  /**
   * Convert Decimal to standard JS number (safe for UI display where string formatting isn't used)
   */
  static toNumber(val: number | string | Decimal | null | undefined, decimals = 2): number {
    const d = this.parse(val);
    return parseFloat(d.toFixed(decimals));
  }

  /**
   * Compare two numbers. Returns -1 if a < b, 0 if a == b, 1 if a > b.
   */
  static compare(
    a: number | string | Decimal,
    b: number | string | Decimal
  ): number {
    const da = this.parse(a);
    const db = this.parse(b);
    return da.comparedTo(db);
  }

  /**
   * Check if quantity requested exceeds remaining stock
   */
  static isInsufficient(
    available: number | string | Decimal,
    requested: number | string | Decimal
  ): boolean {
    const avail = this.parse(available);
    const req = this.parse(requested);
    return req.greaterThan(avail);
  }
}

export default FinanceDecimal;
