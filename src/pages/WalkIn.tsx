import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import data from "@/data/data.json";

export default function WalkIn() {
  const available = data.rooms.filter((r) => r.status === "available");

  return (
    <div className="space-y-6">
      <PageHeader title="Walk-in booking" subtitle="Quickly create a booking for a guest at the front desk." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <form className="panel space-y-5 p-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Guest name" placeholder="e.g. Aarav Sharma" />
            <Field label="Phone number" placeholder="+91 98xxx xxxxx" />
            <Field label="Email (optional)" placeholder="guest@example.com" />
            <Field label="ID proof" placeholder="Aadhaar / Passport no." />
            <Field label="Check-in date" type="date" />
            <Field label="Check-out date" type="date" />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Select room</label>
              <select className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10">
                {available.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.id} · {r.type} · ₹{r.price}/night
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                rows={3}
                placeholder="Special requests, arrival time, etc."
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-5">
            <button type="button" className="h-11 rounded-xl border border-border bg-card px-5 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90">
              <UserPlus className="h-4 w-4" /> Create booking
            </button>
          </div>
        </form>

        <div className="panel p-6">
          <h3 className="font-display text-base font-semibold">Summary</h3>
          <p className="mb-5 text-xs text-muted-foreground">Live preview of the booking.</p>
          <dl className="space-y-3 text-sm">
            <Row label="Available rooms" value={String(available.length)} />
            <Row label="Selected room" value={`#${available[0]?.id ?? "—"}`} />
            <Row label="Nights" value="1" />
            <Row label="Subtotal" value={`₹${available[0]?.price ?? 0}`} />
            <Row label="Taxes (12%)" value={`₹${Math.round((available[0]?.price ?? 0) * 0.12)}`} />
          </dl>
          <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
            <span className="font-display text-2xl font-bold text-primary">
              ₹{Math.round((available[0]?.price ?? 0) * 1.12)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, type = "text" }: { label: string; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
