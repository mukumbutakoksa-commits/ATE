import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Wallet, CreditCard, CheckCircle2 } from "lucide-react";
import {
  useCreatePayment,
  useGetWallet,
  PaymentInputCurrency,
  getListBookingsQueryKey,
  getGetWalletQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const PAYMENT_METHODS = [
  {
    id: "wallet",
    label: "BarberFlow Wallet",
    description: "Pay from your in-app balance",
    icon: "👛",
    accent: "text-primary border-primary/30 bg-primary/5 hover:bg-primary/10",
    activeAccent: "text-primary border-primary bg-primary/15",
  },
  {
    id: "airtel_money",
    label: "Airtel Money",
    description: "+260 97x · Zambia mobile",
    icon: "📱",
    accent: "text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500/10",
    activeAccent: "text-red-300 border-red-500 bg-red-500/15",
  },
  {
    id: "mtn_money",
    label: "MTN Money",
    description: "+260 96x · Zambia mobile",
    icon: "📱",
    accent:
      "text-yellow-400 border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10",
    activeAccent: "text-yellow-300 border-yellow-500 bg-yellow-500/15",
  },
  {
    id: "paypal",
    label: "PayPal",
    description: "Pay with your PayPal account",
    icon: "🌐",
    accent:
      "text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10",
    activeAccent: "text-blue-300 border-blue-500 bg-blue-500/15",
  },
  {
    id: "card",
    label: "Visa / Mastercard",
    description: "Debit or credit card",
    icon: "💳",
    accent: "text-white/70 border-white/10 bg-white/5 hover:bg-white/10",
    activeAccent: "text-white border-white/40 bg-white/15",
  },
];

interface PaymentModalProps {
  booking: {
    id: number;
    barberId: number;
    totalAmountZmw: number;
    totalAmountUsd: number;
    currency: string;
    service?: { name?: string };
    barber?: { name?: string };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentMethodModal({
  booking,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("wallet");
  const [preferUsd, setPreferUsd] = useState(false);
  const [paid, setPaid] = useState(false);
  const { data: wallet } = useGetWallet();
  const createPayment = useCreatePayment();
  const { toast } = useToast();
  const qc = useQueryClient();

  const currency = preferUsd ? "USD" : "ZMW";
  const amount = preferUsd ? booking.totalAmountUsd : booking.totalAmountZmw;

  const walletBalance = preferUsd
    ? (wallet?.balanceUsd ?? 0)
    : (wallet?.balanceZmw ?? 0);
  const insufficientFunds =
    selectedMethod === "wallet" && walletBalance < amount;

  const handlePay = () => {
    createPayment.mutate(
      {
        data: {
          bookingId: booking.id,
          method: selectedMethod as any,
          currency: currency as PaymentInputCurrency,
        },
      },
      {
        onSuccess: () => {
          setPaid(true);
          qc.invalidateQueries({
            queryKey: getListBookingsQueryKey({ role: "customer" }),
          });
          qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1800);
        },
        onError: (err: any) => {
          toast({
            title: "Payment failed",
            description: err?.message ?? "Please try again",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative glass-panel rounded-3xl w-full max-w-md overflow-hidden"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {paid ? (
          <div className="p-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-5"
            >
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">Payment Confirmed</h2>
            <p className="text-muted-foreground text-sm">
              {formatCurrency(amount, currency)} via{" "}
              {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.label}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Pay for Booking</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {booking.service?.name} with {booking.barber?.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Amount + currency toggle */}
              <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/10">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Total Due
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {formatCurrency(amount, currency)}
                  </div>
                </div>
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                  {(["ZMW", "USD"] as const).map((cur) => (
                    <button
                      key={cur}
                      onClick={() => setPreferUsd(cur === "USD")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        currency === cur
                          ? "bg-primary text-[#1a1204]"
                          : "text-muted-foreground hover:text-white"
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment methods */}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Payment Method
                </div>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((method) => {
                    const isActive = selectedMethod === method.id;
                    const isWalletInsufficient =
                      method.id === "wallet" && walletBalance < amount;
                    return (
                      <button
                        key={method.id}
                        onClick={() =>
                          !isWalletInsufficient && setSelectedMethod(method.id)
                        }
                        disabled={isWalletInsufficient}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                          isWalletInsufficient
                            ? "opacity-40 cursor-not-allowed border-white/5 bg-white/2"
                            : isActive
                              ? method.activeAccent
                              : method.accent
                        }`}
                      >
                        <span className="text-2xl leading-none">
                          {method.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">
                            {method.label}
                          </div>
                          <div className="text-xs opacity-60 mt-0.5">
                            {method.id === "wallet"
                              ? `Balance: ${formatCurrency(walletBalance, currency)}`
                              : method.description}
                          </div>
                        </div>
                        {isActive && (
                          <div className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-current" />
                          </div>
                        )}
                        {isWalletInsufficient && (
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 shrink-0">
                            Insufficient
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={handlePay}
                disabled={createPayment.isPending || insufficientFunds}
                className="w-full gold-btn py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createPayment.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="text-lg leading-none">
                      {
                        PAYMENT_METHODS.find((m) => m.id === selectedMethod)
                          ?.icon
                      }
                    </span>
                    Pay {formatCurrency(amount, currency)}
                  </>
                )}
              </button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Payments are secure and encrypted
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
