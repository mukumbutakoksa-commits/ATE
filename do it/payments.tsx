import React from "react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { useListPayments } from "@workspace/api-client-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Receipt, Loader2 } from "lucide-react";
import { PAYMENT_METHODS } from "@/components/payment-method-modal";

function MethodBadge({ method }: { method: string }) {
  const config = PAYMENT_METHODS.find((m) => m.id === method);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span className="text-base leading-none">{config?.icon ?? "💰"}</span>
      <span>{config?.label ?? method.replace(/_/g, " ")}</span>
    </span>
  );
}

export default function AdminPayments() {
  const { data: payments = [], isLoading } = useListPayments();

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Transaction Log</h1>
          <p className="text-muted-foreground">
            All money movement across the platform.
          </p>
        </div>
      </div>

      {/* Method summary pills */}
      <div className="flex flex-wrap gap-3 mb-8">
        {PAYMENT_METHODS.map((m) => {
          const count = payments.filter((p) => p.method === m.id).length;
          if (!count) return null;
          return (
            <div
              key={m.id}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-sm"
            >
              <span className="text-base leading-none">{m.icon}</span>
              <span className="font-medium">{m.label}</span>
              <span className="ml-1 bg-white/10 text-white/60 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-16 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">No Transactions</h3>
            <p className="text-muted-foreground">
              No payments have been recorded yet.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 font-medium">Transaction ID</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Method</th>
                  <th className="p-4 font-medium text-right">Amount</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 font-mono text-sm">
                      TXN-{p.id.toString().padStart(6, "0")}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Booking #{p.bookingId}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDateTime(p.createdAt)}
                    </td>
                    <td className="p-4">
                      <MethodBadge method={p.method} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-bold text-white">
                        {formatCurrency(p.amount, p.currency)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          p.status === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : p.status === "failed"
                              ? "bg-red-500/20 text-red-400"
                              : p.status === "refunded"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-white/10 text-white"
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
