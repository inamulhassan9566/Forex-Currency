import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 1) {
    return apiSuccess({ lots: [], purchases: [], sales: [], currencies: [] });
  }

  const [lots, purchases, sales, currencies] = await Promise.all([
    prisma.lot.findMany({
      where: {
        OR: [
          { lotNumber: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { currency: true },
      take: 5,
    }),
    prisma.purchase.findMany({
      where: {
        OR: [
          { purchaseNumber: { contains: q, mode: "insensitive" } },
          { supplier: { contains: q, mode: "insensitive" } },
          { referenceNumber: { contains: q, mode: "insensitive" } },
          { lot: { lotNumber: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: { currency: true, lot: true },
      take: 5,
    }),
    prisma.sale.findMany({
      where: {
        OR: [
          { saleNumber: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { referenceNumber: { contains: q, mode: "insensitive" } },
          { allocations: { some: { lot: { lotNumber: { contains: q, mode: "insensitive" } } } } },
        ],
      },
      include: { currency: true },
      take: 5,
    }),
    prisma.currency.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
    }),
  ]);

  return apiSuccess({
    lots,
    purchases,
    sales,
    currencies,
  });
}
