import React, { useState } from "react";
import { CustomerLayout } from "@/components/layouts/customer-layout";
import {
  useListBookings,
  useUpdateBookingStatus,
  BookingStatusInputStatus,
} from "@workspace/api-client-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  MapPin,
  Scissors,
  Check,
  X,
  Clock,
  CheckCircle2,
  Star,
  CreditCard,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListBookingsQueryKey } from "@workspace/api-client-react";
// getListBookingsQueryKey is from api-client-react (re-export from react-query)
import { AnimatePresence } from "framer-motion";
import { PaymentMethodModal } from "@/components/payment-method-modal";

export default function CustomerBookings() {
  const [filter, setFilter] = useState<string>("all");
  const { data: bookings = [], isLoading } = useListBookings({
    role: "customer",
  });

  const filteredBookings = bookings.filter((b) =>
    filter === "all" ? true : b.status === filter,
  );

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const activeStates = ["pending", "accepted", "in_progress"];
    const aActive = activeStates.includes(a.status);
    const bActive = activeStates.includes(b.status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">
            Manage your past and active appointments
          </p>
        </div>

        <div className="flex gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl max-w-full overflow-x-auto no-scrollbar">
          {[
            "all",
            "pending",
            "accepted",
            "in_progress",
            "completed",
            "cancelled",
          ].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                filter === status
                  ? "bg-primary text-[#1a1204]"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedBookings.length === 0 ? (
        <div className="glass-panel p-12 rounded-[28px] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">No bookings found</h3>
          <p className="text-muted-foreground mb-6">
            You don't have any bookings matching this status.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}

function BookingCard({ booking }: { booking: any }) {
  const qc = useQueryClient();
  const updateStatus = useUpdateBookingStatus();
  const [showPayment, setShowPayment] = useState(false);

  const statusColors: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    accepted: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    in_progress: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    completed: "text-green-400 bg-green-400/10 border-green-400/20",
    cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
  };

  const statusIcons: Record<string, any> = {
    pending: Clock,
    accepted: Check,
    in_progress: Scissors,
    completed: CheckCircle2,
    cancelled: X,
  };

  const StatusIcon = statusIcons[booking.status] || Clock;
  const isActive = ["pending", "accepted", "in_progress"].includes(
    booking.status,
  );

  const handleCancel = () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    updateStatus.mutate(
      { id: booking.id, data: { status: BookingStatusInputStatus.cancelled } },
      {
        onSuccess: () => {
          qc.invalidateQueries({
            queryKey: getListBookingsQueryKey({ role: "customer" }),
          });
        },
      },
    );
  };

  return (
    <>
      <div
        className={`glass-panel p-6 rounded-3xl transition-all ${
          isActive
            ? "border-primary/30 shadow-[0_8px_30px_rgba(226,184,75,0.1)]"
            : ""
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-lg font-bold uppercase shrink-0">
              {booking.barber?.avatar ? (
                <img
                  src={booking.barber.avatar}
                  alt={booking.barber.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                booking.barber?.name?.slice(0, 2)
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold">{booking.barber?.name}</h3>
              <div className="text-sm text-muted-foreground">
                {formatDateTime(booking.createdAt)}
              </div>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold capitalize w-fit ${statusColors[booking.status]}`}
          >
            <StatusIcon className="w-4 h-4" />
            {booking.status.replace("_", " ")}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Service
            </div>
            <div className="font-medium flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" />
              {booking.service?.name}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Amount
            </div>
            <div className="font-medium text-white">
              {formatCurrency(booking.totalAmountZmw, "ZMW")}
              <span className="text-muted-foreground text-sm ml-1">
                / {formatCurrency(booking.totalAmountUsd, "USD")}
              </span>
            </div>
          </div>
          {booking.notes && (
            <div className="col-span-full pt-3 border-t border-white/5 mt-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Notes
              </div>
              <div className="text-sm">{booking.notes}</div>
            </div>
          )}
        </div>

        {isActive && (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {booking.status === "accepted" && (
              <button
                onClick={() => setShowPayment(true)}
                className="gold-btn px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Pay Now
              </button>
            )}
            <button
              onClick={handleCancel}
              disabled={updateStatus.isPending}
              className="px-6 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-medium transition-colors text-sm"
            >
              Cancel Booking
            </button>
          </div>
        )}

        {booking.status === "completed" && (
          <div className="mt-6 flex justify-end">
            <button className="gold-btn px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
              <Star className="w-4 h-4" /> Leave Review
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPayment && (
          <PaymentMethodModal
            booking={booking}
            onClose={() => setShowPayment(false)}
            onSuccess={() => {
              qc.invalidateQueries({
                queryKey: getListBookingsQueryKey({ role: "customer" }),
              });
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
