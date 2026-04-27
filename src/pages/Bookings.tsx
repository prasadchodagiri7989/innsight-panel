import { Filter, Plus, MoreHorizontal, Eye, Pencil, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import data from "@/data/data.json";
import { useState } from "react";

const fmtINR = (n: number) =>
  "₹" + new Intl.NumberFormat("en-IN").format(n);

export default function Bookings() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const filtered = data.bookings.filter((b) => statusFilter === "all" || b.status === statusFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle="Manage all reservations across the property."
        actions={
          <>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Filter className="h-4 w-4" /> Filters
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90">
              <Plus className="h-4 w-4" /> New booking
            </button>
          </>
        }
      />

      {/* Filter bar */}
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <input
          type="text"
          placeholder="Search guest or booking ID…"
          className="h-10 flex-1 min-w-[200px] rounded-xl border border-border bg-background px-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
        <input
          type="date"
          className="h-10 rounded-xl border border-border bg-background px-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
        >
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="checked-in">Checked-in</option>
          <option value="checked-out">Checked-out</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
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
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{b.id}</td>
                  <td className="px-5 py-3.5 font-medium">{b.guest}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{b.room}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{b.checkIn}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{b.checkOut}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-3.5 text-right font-semibold">{fmtINR(b.amount)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-warning-soft hover:text-warning" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive" title="Cancel">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
