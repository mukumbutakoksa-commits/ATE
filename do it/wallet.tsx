import React, { useState } from "react";
import { CustomerLayout } from "@/components/layouts/customer-layout";
import {
  useGetWallet,
  useTopUpWallet,
  useListPayments,
  WalletTopUpInputCurrency,
} from "@workspace/api-client-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Loader2,
  Smartphone,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetWalletQueryKey,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";

// Payment source config
const PAYMENT_SOURCES = [
  {
    id: "airtel_money",
    label: "Airtel Money",
    description: "Zambia mobile money",
    icon: "📱",
    color: "bg-red-500/10 border-red-500/30 text-red-400",
    activeColor: "bg-red-500/20 border-red-500 text-red-300",
  },
  {
    id: "mtn_money",
    label: "MTN Money",
    description: "Zambia mobile money",
    icon: "📱",
    color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    activeColor: "bg-yellow-500/20 border-yellow-500 text-yellow-300",
  },
  {
    id: "paypal",
    label: "PayPal",
    description: "Global payments",
    icon: "🌐",
    color: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    activeColor: "bg-blue-500/20 border-blue-500 text-blue-300",
  },
  {
    id: "card",
    label: "Visa / Mastercard",
    description: "Debit or credit card",
    icon: "💳",
    color: "bg-white/5 border-white/10 text-white/60",
    activeColor: "bg-white/15 border-white/40 text-white",
  },
];

function PaymentMethodIcon({ method }: { method: string }) {
  const icons: Record<string, string> = {
    airtel_money: "📱",
    mtn_money: "📱",
    paypal: "🌐",
    card: "💳",
    wallet: "👛",
    mobile_money: "📱",
  };
  return (
    <span className="text-base leading-none">{icons[method] ?? "💰"}</span>
  );
}

export default function CustomerWallet() {
  const { data: wallet, isLoading: loadingWallet } = useGetWallet();
  const { data: payments = [], isLoading: loadingPayments } = useListPayments();

  return (
    <CustomerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Wallet</h1>
        <p className="text-muted-foreground">
          Manage your balances and transaction history
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {/* Balance Cards */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-bold text-lg">Current Balance</h2>
            </div>
            {loadingWallet ? (
              <div className="h-20 animate-pulse bg-white/5 rounded-xl mb-4" />
            ) : (
              <div className="space-y-4 relative z-10">
                <div>
                  <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider">
                    Zambian Kwacha
                  </div>
                  <div className="text-4xl font-extrabold text-white tracking-tight">
                    {formatCurrency(wallet?.balanceZmw || 0, "ZMW")}
                  </div>
                </div>
                <div className="h-px w-full bg-white/10" />
                <div>
                  <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider">
                    US Dollars
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground tracking-tight">
                    {formatCurrency(wallet?.balanceUsd || 0, "USD")}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top Up Form */}
          <TopUpForm />
        </div>

        <div className="lg:col-span-2">
          <div className="glass-panel rounded-3xl overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-white/10">
              <h2 className="font-bold text-xl">Transaction History</h2>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {loadingPayments ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No transactions yet.
                </div>
              ) : (
                <div className="space-y-1">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-4 rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl grid place-items-center shrink-0 text-lg ${
                            payment.status === "completed"
                              ? "bg-green-500/10"
                              : "bg-red-500/10"
                          }`}
                        >
                          <PaymentMethodIcon method={payment.method} />
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {PAYMENT_SOURCES.find(
                              (s) => s.id === payment.method,
                            )?.label ?? payment.method.replace(/_/g, " ")}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {formatDateTime(payment.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">
                          {formatCurrency(payment.amount, payment.currency)}
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            payment.status === "completed"
                              ? "bg-green-500/20 text-green-400"
                              : payment.status === "failed"
                                ? "bg-red-500/20 text-red-400"
                                : payment.status === "refunded"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-white/10 text-white"
                          }`}
                        >
                          {payment.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

function TopUpForm() {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<WalletTopUpInputCurrency>(
    WalletTopUpInputCurrency.ZMW,
  );
  const [source, setSource] = useState<string>("airtel_money");
  const { toast } = useToast();
  const qc = useQueryClient();
  const topUp = useTopUpWallet();

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    topUp.mutate(
      {
        data: {
          amount: Number(amount),
          currency,
          paymentSource: source as any,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Wallet topped up!",
            description: `Added ${formatCurrency(Number(amount), currency)} via ${PAYMENT_SOURCES.find((s) => s.id === source)?.label}`,
          });
          setAmount("");
          qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
          qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        },
        onError: (err) => {
          toast({
            title: "Top-up failed",
            description: err.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const selectedSource = PAYMENT_SOURCES.find((s) => s.id === source)!;

  return (
    <div className="glass-panel p-6 rounded-3xl">
      <h3 className="font-bold mb-5 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-muted-foreground" />
        Add Funds
      </h3>

      <form onSubmit={handleTopUp} className="space-y-5">
        {/* Currency toggle */}
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
            Currency
          </label>
          <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
            {(["ZMW", "USD"] as const).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setCurrency(WalletTopUpInputCurrency[cur])}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currency === cur
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {cur === "ZMW" ? "🇿🇲 ZMW" : "🇺🇸 USD"}
              </button>
            ))}
          </div>
        </div>

        {/* Payment method grid */}
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_SOURCES.map((src) => (
              <button
                key={src.id}
                type="button"
                onClick={() => setSource(src.id)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  source === src.id ? src.activeColor : src.color
                }`}
              >
                <span className="text-xl mb-1">{src.icon}</span>
                <span className="text-xs font-bold leading-tight">
                  {src.label}
                </span>
                <span className="text-[10px] opacity-60 leading-tight">
                  {src.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              {currency === "ZMW" ? "K" : "$"}
            </span>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary/50 text-lg font-medium"
              placeholder="0.00"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={topUp.isPending}
          className="w-full gold-btn py-3 rounded-xl flex items-center justify-center gap-2 font-semibold"
        >
          {topUp.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span className="text-base">{selectedSource.icon}</span>
              Deposit via {selectedSource.label}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
