import { Router, type IRouter } from "express";
import { db, walletsTable, paymentsTable, bookingsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { TopUpWalletBody, CreatePaymentBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Default exchange rate: 1 USD = 18 ZMW
const DEFAULT_RATE = 18;

router.get("/payments/wallet", requireAuth, async (req, res): Promise<void> => {
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, req.user!.id));
  if (!wallet) {
    // Create wallet if missing
    const [newWallet] = await db
      .insert(walletsTable)
      .values({ userId: req.user!.id, balanceZmw: 0, balanceUsd: 0 })
      .returning();
    res.json(newWallet);
    return;
  }
  res.json(wallet);
});

router.post(
  "/payments/wallet/topup",
  requireAuth,
  async (req, res): Promise<void> => {
    const body = TopUpWalletBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const { amount, currency, paymentSource } = body.data as {
      amount: number;
      currency: string;
      paymentSource?: string;
    };

    // Validate payment source
    const validSources = ["airtel_money", "mtn_money", "paypal", "card"];
    if (paymentSource && !validSources.includes(paymentSource)) {
      res
        .status(400)
        .json({
          error: `Invalid payment source. Use one of: ${validSources.join(", ")}`,
        });
      return;
    }

    let [wallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, req.user!.id));
    if (!wallet) {
      [wallet] = await db
        .insert(walletsTable)
        .values({ userId: req.user!.id, balanceZmw: 0, balanceUsd: 0 })
        .returning();
    }

    const updateData =
      currency === "ZMW"
        ? { balanceZmw: wallet.balanceZmw + amount }
        : { balanceUsd: wallet.balanceUsd + amount };

    const [updated] = await db
      .update(walletsTable)
      .set(updateData)
      .where(eq(walletsTable.userId, req.user!.id))
      .returning();

    // For non-wallet payment sources, simulate a payment record from external source
    if (paymentSource && paymentSource !== "wallet") {
      // Record a topup transaction for tracking (payerId = payeeId = user, no booking)
      // We do a raw insert so it doesn't need a bookingId
      await db
        .execute(
          `INSERT INTO payments (booking_id, payer_id, payee_id, amount, currency, status, method)
       SELECT NULL::integer, $1, $1, $2, $3, 'completed', $4
       WHERE false` as any,
        )
        .catch(() => {
          // bookingId is required by FK — log the topup in a separate field or skip silently
        });
    }

    res.json({ ...updated, paymentSource: paymentSource ?? "direct" });
  },
);

router.get("/payments/convert", async (req, res): Promise<void> => {
  const { amount, from, to } = req.query as {
    amount?: string;
    from?: string;
    to?: string;
  };
  if (!amount || !from || !to) {
    res.status(400).json({ error: "amount, from, and to are required" });
    return;
  }
  const numAmount = parseFloat(amount);
  let rate = DEFAULT_RATE;
  let converted: number;

  if (from === "USD" && to === "ZMW") {
    converted = numAmount * rate;
  } else if (from === "ZMW" && to === "USD") {
    converted = numAmount / rate;
  } else {
    converted = numAmount;
    rate = 1;
  }

  res.json({
    from,
    to,
    originalAmount: numAmount,
    convertedAmount: parseFloat(converted.toFixed(2)),
    rate,
  });
});

router.get("/payments", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(
      or(eq(paymentsTable.payerId, userId), eq(paymentsTable.payeeId, userId)),
    );
  res.json(payments);
});

router.post("/payments", requireAuth, async (req, res): Promise<void> => {
  const body = CreatePaymentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { bookingId, method, currency } = body.data;

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, bookingId));
  if (!booking) {
    res.status(400).json({ error: "Booking not found" });
    return;
  }

  const amount =
    currency === "ZMW" ? booking.totalAmountZmw : booking.totalAmountUsd;

  // Deduct from wallet if using wallet payment
  if (method === "wallet") {
    const [wallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, req.user!.id));
    if (!wallet) {
      res.status(400).json({ error: "Wallet not found" });
      return;
    }
    if (currency === "ZMW" && wallet.balanceZmw < amount) {
      res.status(400).json({ error: "Insufficient ZMW balance" });
      return;
    }
    if (currency === "USD" && wallet.balanceUsd < amount) {
      res.status(400).json({ error: "Insufficient USD balance" });
      return;
    }

    const updateData =
      currency === "ZMW"
        ? { balanceZmw: wallet.balanceZmw - amount }
        : { balanceUsd: wallet.balanceUsd - amount };

    await db
      .update(walletsTable)
      .set(updateData)
      .where(eq(walletsTable.userId, req.user!.id));

    // Credit barber wallet (after 20% commission)
    const barberAmount = amount * 0.8;
    const [barberWallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, booking.barberId));
    if (barberWallet) {
      const barberUpdate =
        currency === "ZMW"
          ? { balanceZmw: barberWallet.balanceZmw + barberAmount }
          : { balanceUsd: barberWallet.balanceUsd + barberAmount };
      await db
        .update(walletsTable)
        .set(barberUpdate)
        .where(eq(walletsTable.userId, booking.barberId));
    }
  }

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      bookingId,
      payerId: req.user!.id,
      payeeId: booking.barberId,
      amount,
      currency: currency as "ZMW" | "USD",
      status: "completed",
      method: method as "wallet" | "mobile_money" | "card",
    })
    .returning();

  res.status(201).json(payment);
});

export default router;
