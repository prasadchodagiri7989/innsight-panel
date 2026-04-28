import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import { adminApi, type HotelSettings } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Settings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: () => adminApi.getSettings() });
  const settings = data?.data;

  const [form, setForm] = useState<Partial<HotelSettings>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () => adminApi.updateSettings(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const set = (key: keyof HotelSettings, val: string | number) =>
    setForm((f) => ({ ...f, [key]: val }));

  if (isLoading) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading settings…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Hotel information, GST configuration and notifications."
        actions={
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90 disabled:opacity-60">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved ✓" : "Save changes"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Hotel info */}
        <div className="panel p-6 lg:col-span-2">
          <h3 className="mb-1 font-display text-base font-semibold">Hotel information</h3>
          <p className="mb-5 text-xs text-muted-foreground">These details appear on invoices and confirmations.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hotel name" value={form.hotelName ?? ""} onChange={(v) => set("hotelName", v)} />
            <Field label="Phone" value={form.hotelPhone ?? ""} onChange={(v) => set("hotelPhone", v)} />
            <Field label="Email" value={form.hotelEmail ?? ""} onChange={(v) => set("hotelEmail", v)} />
            <Field label="Tagline" value={form.hotelTagline ?? ""} onChange={(v) => set("hotelTagline", v)} />
            <Field label="GST Number" value={form.gstNumber ?? ""} onChange={(v) => set("gstNumber", v)} />
            <div className="sm:col-span-2">
              <Field label="Address" value={form.hotelAddress ?? ""} onChange={(v) => set("hotelAddress", v)} />
            </div>
          </div>
        </div>

        {/* Notifications */}
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

      {/* GST & Billing */}
      <div className="panel p-6">
        <h3 className="mb-1 font-display text-base font-semibold">GST & Billing</h3>
        <p className="mb-5 text-xs text-muted-foreground">Configure tax rates applied on invoices. Changes take effect on the next checkout.</p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <NumberField
            label="CGST (%)"
            hint="Central GST — levied by central govt"
            value={String(form.cgstPercentage ?? 6)}
            onChange={(v) => set("cgstPercentage", Number(v))}
          />
          <NumberField
            label="SGST (%)"
            hint="State GST — levied by state govt"
            value={String(form.sgstPercentage ?? 6)}
            onChange={(v) => set("sgstPercentage", Number(v))}
          />
          <NumberField
            label="Advance payment (%)"
            hint="% of room subtotal collected at check-in"
            value={String(form.advancePaymentPercent ?? 10)}
            onChange={(v) => set("advancePaymentPercent", Number(v))}
          />
        </div>
        {/* Live GST preview */}
        {(form.cgstPercentage !== undefined || form.sgstPercentage !== undefined) && (
          <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview — on ₹5,000 room bill</p>
            {(() => {
              const base = 5000;
              const cgst = base * (Number(form.cgstPercentage ?? 6)) / 100;
              const sgst = base * (Number(form.sgstPercentage ?? 6)) / 100;
              const total = base + cgst + sgst;
              const advance = total * (Number(form.advancePaymentPercent ?? 10)) / 100;
              const fmt = (n: number) => "₹" + n.toFixed(2);
              return (
                <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-4">
                  <Row label="Subtotal" value={fmt(base)} />
                  <Row label={`CGST (${form.cgstPercentage ?? 6}%)`} value={fmt(cgst)} />
                  <Row label={`SGST (${form.sgstPercentage ?? 6}%)`} value={fmt(sgst)} />
                  <Row label="Total" value={fmt(total)} bold />
                  <Row label={`Advance (${form.advancePaymentPercent ?? 10}%)`} value={fmt(advance)} />
                  <Row label="Balance at checkout" value={fmt(total - advance)} />
                </dl>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
    </label>
  );
}

function NumberField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input type="number" step="0.5" min="0" max="50" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={`font-mono text-xs ${bold ? "font-bold text-sm text-foreground" : ""}`}>{value}</dd>
    </div>
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
