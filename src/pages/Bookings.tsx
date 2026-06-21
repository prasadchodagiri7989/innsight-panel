import { useState } from "react";
import { Filter, Plus, MoreHorizontal, Loader2, Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminApi, ApiError } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const fmtINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(n);

const STATUSES = ["all","pending","confirmed","checked_in","checked_out","cancelled","completed"];

export default function Bookings() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; bookingId: string } | null>(null);

  const params: Record<string, string> = { limit: "100" };
  if (statusFilter !== "all") params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-bookings", params],
    queryFn: () => adminApi.getBookings(params),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.updateBookingStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
    onError: (err: any) => {
      const msg = err instanceof ApiError && err.errors && err.errors.length > 0
        ? err.errors.map((x: any) => x.message).join("\n")
        : err.message || "Failed to update booking status.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteBooking(id),
    onSuccess: () => {
      toast({ title: "Booking deleted", description: "The booking has been successfully removed." });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError && err.errors && err.errors.length > 0
        ? err.errors.map((x: any) => x.message).join("\n")
        : err.message || "Failed to delete booking.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  });

  const handleDelete = (id: string, bookingId: string) => {
    setDeleteTarget({ id, bookingId });
  };

  const bookings = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Bookings" subtitle="Manage all reservations across the property." />

      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search booking ID…"
          className="h-10 flex-1 min-w-[200px] rounded-xl border border-border bg-background px-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10">
          {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading bookings…</div>
        ) : isError ? (
          <div className="p-10 text-center text-sm text-destructive">Failed to load bookings.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Booking ID</th>
                  <th className="px-5 py-3 font-medium">Guest</th>
                  <th className="px-5 py-3 font-medium">Room</th>
                  <th className="px-5 py-3 font-medium">Check-in</th>
                  <th className="px-5 py-3 font-medium">Check-out</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">No bookings found.</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b._id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{b.bookingId}</td>
                    <td className="px-5 py-3.5 font-medium">{b.user?.name ?? b.guestDetails?.name ?? "Guest"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{b.room ? `${b.room.roomNumber} · ${b.room.type}` : "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{format(new Date(b.checkInDate), "dd MMM yyyy")}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      <div>{format(new Date(b.checkOutDate), "dd MMM yyyy")}</div>
                      {b.actualCheckOut && (
                        <div className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                          Act: {format(new Date(b.actualCheckOut), "dd MMM yyyy")}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3.5 text-right font-semibold">{fmtINR(b.totalAmount)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={b.status}
                          onChange={(e) => statusMutation.mutate({ id: b._id, status: e.target.value })}
                          className="h-8 rounded-lg border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none"
                        >
                          {["pending","confirmed","checked_in","checked_out","cancelled","completed"].map((s) => (
                            <option key={s} value={s}>{s.replace("_"," ")}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDelete(b._id, b.bookingId)}
                          className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete booking"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="font-display text-lg font-bold">Delete Booking?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground text-center">
              Are you sure you want to delete booking <strong className="text-foreground">#{deleteTarget?.bookingId}</strong>? This action cannot be undone and will cascade-delete all associated payments, invoices, and restore room availability.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-4">
            <AlertDialogCancel className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="flex-1 h-10 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}