import { useState } from "react";
import { Filter, Plus, MoreHorizontal, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const fmtINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(n);

const STATUSES = ["all","pending","confirmed","checked_in","checked_out","cancelled","completed"];

export default function Bookings() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

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
  });

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
                    <td className="px-5 py-3.5 text-muted-foreground">{format(new Date(b.checkOutDate), "dd MMM yyyy")}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3.5 text-right font-semibold">{fmtINR(b.totalAmount)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <select
                        value={b.status}
                        onChange={(e) => statusMutation.mutate({ id: b._id, status: e.target.value })}
                        className="h-8 rounded-lg border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none"
                      >
                        {["pending","confirmed","checked_in","checked_out","cancelled","completed"].map((s) => (
                          <option key={s} value={s}>{s.replace("_"," ")}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}