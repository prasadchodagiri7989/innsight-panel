import { Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import data from "@/data/data.json";

export default function Settings() {
  const h = data.hotel;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Hotel information, profile and notifications."
        actions={
          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90">
            <Save className="h-4 w-4" /> Save changes
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel p-6 lg:col-span-2">
          <h3 className="mb-1 font-display text-base font-semibold">Hotel information</h3>
          <p className="mb-5 text-xs text-muted-foreground">These details appear on invoices and confirmations.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hotel name" defaultValue={h.name} />
            <Field label="Phone" defaultValue={h.phone} />
            <Field label="Email" defaultValue={h.email} />
            <Field label="Tagline" defaultValue={h.tagline} />
            <div className="sm:col-span-2">
              <Field label="Address" defaultValue={h.address} />
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <h3 className="mb-1 font-display text-base font-semibold">Notifications</h3>
          <p className="mb-5 text-xs text-muted-foreground">Choose what you want to be notified about.</p>
          <div className="space-y-4">
            <ToggleRow label="New bookings" defaultChecked />
            <ToggleRow label="Cancellations" defaultChecked />
            <ToggleRow label="Daily reports" />
            <ToggleRow label="Staff updates" defaultChecked />
            <ToggleRow label="Marketing emails" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        defaultValue={defaultValue}
        className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
      />
    </label>
  );
}

function ToggleRow({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
