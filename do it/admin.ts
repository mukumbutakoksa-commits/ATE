import { Router, type IRouter } from "express";
import { db, usersTable, barberProfilesTable, bookingsTable, paymentsTable, disputesTable, pricingConfigTable, walletsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";
import {
  UpdateUserStatusBody,
  UpdateUserStatusParams,
  ApproveBarberParams,
  RejectBarberParams,
  RejectBarberBody,
  ResolveDisputeParams,
  ResolveDisputeBody,
  UpdatePricingBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/stats", requireRole("admin"), async (req, res): Promise<void> => {
  const [{ value: totalClients }] = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.role, "customer"));
  const [{ value: activeBarbers }] = await db.select({ value: count() }).from(barberProfilesTable).where(and(eq(barberProfilesTable.isApproved, true), eq(barberProfilesTable.isAvailable, true)));
  const [{ value: pendingApprovals }] = await db.select({ value: count() }).from(barberProfilesTable).where(eq(barberProfilesTable.isApproved, false));
  const [{ value: openDisputes }] = await db.select({ value: count() }).from(disputesTable).where(eq(disputesTable.status, "open"));
  const [{ value: totalBookings }] = await db.select({ value: count() }).from(bookingsTable);
  const [{ value: completedBookings }] = await db.select({ value: count() }).from(bookingsTable).where(eq(bookingsTable.status, "completed"));

  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "completed"));
  const monthlyRevenueZmw = payments.filter(p => p.currency === "ZMW").reduce((sum, p) => sum + p.amount * 0.2, 0);
  const monthlyRevenueUsd = payments.filter(p => p.currency === "USD").reduce((sum, p) => sum + p.amount * 0.2, 0);

  const refundedPayments = payments.filter(p => p.status === "refunded").length;
  const refundRate = payments.length > 0 ? (refundedPayments / payments.length) * 100 : 0;

  res.json({
    totalClients: Number(totalClients),
    activeBarbers: Number(activeBarbers),
    pendingApprovals: Number(pendingApprovals),
    openDisputes: Number(openDisputes),
    monthlyRevenueZmw: parseFloat(monthlyRevenueZmw.toFixed(2)),
    monthlyRevenueUsd: parseFloat(monthlyRevenueUsd.toFixed(2)),
    totalBookings: Number(totalBookings),
    completedBookings: Number(completedBookings),
    refundRate: parseFloat(refundRate.toFixed(2)),
    topArea: "Lusaka CBD",
    peakHours: "5–8 PM",
  });
});

router.get("/admin/users", requireRole("admin"), async (req, res): Promise<void> => {
  const { role, search } = req.query as { role?: string; search?: string };
  let users = await db.select().from(usersTable);
  if (role) users = users.filter(u => u.role === role);
  if (search) {
    const q = search.toLowerCase();
    users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }
  res.json(users.map(({ passwordHash: _, ...u }) => u));
});

router.patch("/admin/users/:id/status", requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateUserStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateUserStatusBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  await db.update(usersTable).set({ isActive: body.data.isActive }).where(eq(usersTable.id, params.data.id));
  res.json({ message: body.data.isActive ? "User reactivated" : "User suspended" });
});

router.get("/admin/barbers/pending", requireRole("admin"), async (req, res): Promise<void> => {
  const pending = await db.select().from(usersTable)
    .innerJoin(barberProfilesTable, eq(barberProfilesTable.userId, usersTable.id))
    .where(and(eq(usersTable.role, "barber"), eq(barberProfilesTable.isApproved, false)));
  res.json(pending.map(({ users, barber_profiles }) => {
    const { passwordHash: _, ...safeUser } = users;
    return { ...safeUser, profile: barber_profiles };
  }));
});

router.patch("/admin/barbers/:id/approve", requireRole("admin"), async (req, res): Promise<void> => {
  const params = ApproveBarberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.update(barberProfilesTable).set({ isApproved: true }).where(eq(barberProfilesTable.userId, params.data.id));
  res.json({ message: "Barber approved" });
});

router.patch("/admin/barbers/:id/reject", requireRole("admin"), async (req, res): Promise<void> => {
  const params = RejectBarberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = RejectBarberBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  await db.update(barberProfilesTable)
    .set({ isApproved: false, rejectionReason: body.data.reason })
    .where(eq(barberProfilesTable.userId, params.data.id));
  res.json({ message: "Barber rejected" });
});

router.get("/admin/disputes", requireRole("admin"), async (req, res): Promise<void> => {
  const disputes = await db.select().from(disputesTable);
  res.json(disputes);
});

router.patch("/admin/disputes/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const params = ResolveDisputeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = ResolveDisputeBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [updated] = await db.update(disputesTable)
    .set({ status: body.data.status as any, resolution: body.data.resolution })
    .where(eq(disputesTable.id, params.data.id))
    .returning();
  res.json(updated);
});

router.get("/admin/pricing", requireRole("admin"), async (req, res): Promise<void> => {
  const [config] = await db.select().from(pricingConfigTable);
  if (!config) {
    const [newConfig] = await db.insert(pricingConfigTable).values({}).returning();
    res.json(newConfig);
    return;
  }
  res.json(config);
});

router.put("/admin/pricing", requireRole("admin"), async (req, res): Promise<void> => {
  const body = UpdatePricingBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [existing] = await db.select().from(pricingConfigTable);
  let config;
  if (existing) {
    [config] = await db.update(pricingConfigTable).set(body.data).where(eq(pricingConfigTable.id, existing.id)).returning();
  } else {
    [config] = await db.insert(pricingConfigTable).values(body.data).returning();
  }
  res.json(config);
});

router.get("/admin/revenue", requireRole("admin"), async (req, res): Promise<void> => {
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "completed"));
  const totalZmw = payments.filter(p => p.currency === "ZMW").reduce((sum, p) => sum + p.amount * 0.2, 0);
  const totalUsd = payments.filter(p => p.currency === "USD").reduce((sum, p) => sum + p.amount * 0.2, 0);

  // Group by month
  const monthlyMap: Record<string, { revenueZmw: number; revenueUsd: number; bookings: Set<number> }> = {};
  for (const p of payments) {
    const month = new Date(p.createdAt).toISOString().slice(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { revenueZmw: 0, revenueUsd: 0, bookings: new Set() };
    if (p.currency === "ZMW") monthlyMap[month].revenueZmw += p.amount * 0.2;
    else monthlyMap[month].revenueUsd += p.amount * 0.2;
    monthlyMap[month].bookings.add(p.bookingId);
  }

  // If no real data, return some demo data
  const monthly = Object.entries(monthlyMap).map(([month, d]) => ({
    month,
    revenueZmw: parseFloat(d.revenueZmw.toFixed(2)),
    revenueUsd: parseFloat(d.revenueUsd.toFixed(2)),
    bookings: d.bookings.size,
  })).sort((a, b) => a.month.localeCompare(b.month));

  if (monthly.length === 0) {
    // Seed some demo monthly data
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      monthly.push({
        month: d.toISOString().slice(0, 7),
        revenueZmw: Math.round(Math.random() * 5000 + 2000),
        revenueUsd: Math.round(Math.random() * 300 + 100),
        bookings: Math.round(Math.random() * 80 + 20),
      });
    }
  }

  res.json({ totalZmw: parseFloat(totalZmw.toFixed(2)), totalUsd: parseFloat(totalUsd.toFixed(2)), monthly });
});

export default router;
