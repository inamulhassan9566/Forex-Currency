import { NextResponse } from "next/server";
import { ensureDatabaseReady } from "@/lib/auto-init";
import { prisma } from "@/lib/db";

export async function GET() {
  return handleSetup();
}

export async function POST() {
  return handleSetup();
}

async function handleSetup() {
  try {
    const ready = await ensureDatabaseReady();
    if (!ready) {
      return NextResponse.json(
        { success: false, error: "Failed to initialize database. Check database connection string." },
        { status: 500 }
      );
    }

    const [userCount, currencyCount, lotCount] = await Promise.all([
      prisma.user.count(),
      prisma.currency.count(),
      prisma.lot.count(),
    ]);

    return NextResponse.json({
      success: true,
      message: "Database initialized and seeded successfully! You can now log in.",
      stats: {
        users: userCount,
        currencies: currencyCount,
        lots: lotCount,
        realizedProfit: "₹2,660.00",
      },
      demoProfiles: [
        { role: "Super Admin", email: "admin@example.com", password: "Admin@123456" },
        { role: "Trading Operator", email: "operator@example.com", password: "Operator@123456" },
        { role: "Compliance Viewer", email: "viewer@example.com", password: "Viewer@123456" },
      ],
    });
  } catch (err: any) {
    console.error("Setup endpoint error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "An unexpected error occurred during database setup." },
      { status: 500 }
    );
  }
}
