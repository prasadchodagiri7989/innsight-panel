import { Search, LogIn, LogOut, User } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import data from "@/data/data.json";

export default function CheckInOut() {
  const active = data.bookings.filter((b) => b.status === "confirmed" || b.status === "checked-in");

  return (
    <div className="space-y-6">
      <PageHeader title="Check-in / Check-out" subtitle="Search a booking, then check guests in or out." />

      <div className="panel p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search by booking ID, guest name or room…"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((b) => {
          const isIn = b.status === "checked-in";
          return (
            <div key={b.id} className="panel space-y-4 p-5 transition-all hover:shadow-elevated">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display font-semibold">{b.guest}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{b.id}</p>
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Room</p>
                  <p className="font-semibold text-foreground">{b.room}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold text-foreground">₹{b.amount.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Check-in</p>
                  <p className="font-semibold text-foreground">{b.checkIn}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Check-out</p>
                  <p className="font-semibold text-foreground">{b.checkOut}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={isIn}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90 disabled:opacity-40 disabled:hover:shadow-soft"
                >
                  <LogIn className="h-4 w-4" /> Check-in
                </button>
                <button
                  disabled={!isIn}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-card"
                >
                  <LogOut className="h-4 w-4" /> Check-out
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
