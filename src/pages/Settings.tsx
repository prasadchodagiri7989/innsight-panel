import { useState, useEffect } from "react";
import { Save, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import { adminApi, type HotelSettings } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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

export default function Settings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: () => adminApi.getSettings() });
  const settings = data?.data;

  const [form, setForm] = useState<Partial<HotelSettings>>({});
  const [saved, setSaved] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [password, setPassword] = useState("");
  const [clearAllDates, setClearAllDates] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const dataCategories = [
    { id: "bookings", label: "Bookings", description: "Reservations, stays, & room check-ins" },
    { id: "payments", label: "Payments", description: "Transaction history & records" },
    { id: "invoices", label: "Invoices", description: "Billing documents & GST summaries" },
    { id: "userData", label: "Guest Profiles", description: "Registered users with role 'user'" },
    { id: "activityLogs", label: "Activity Logs", description: "Audit trail and system logs" }
  ];

  const clearMutation = useMutation({
    mutationFn: (vars: { dataTypes: string[]; startDate?: string; endDate?: string; password?: string; clearAllDates?: boolean }) =>
      adminApi.clearData(vars),
    onSuccess: () => {
      toast.success("Selected data cleared successfully!");
      qc.invalidateQueries();
      setSelectedTypes([]);
      setStartDate("");
      setEndDate("");
      setPassword("");
      setClearAllDates(false);
      setIsConfirmOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to clear data.");
    },
  });

  const handleClearSubmit = () => {
    clearMutation.mutate({
      dataTypes: selectedTypes,
      startDate: clearAllDates ? undefined : startDate,
      endDate: clearAllDates ? undefined : endDate,
      password,
      clearAllDates,
    });
  };

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

      <div className="grid grid-cols-1 gap-4">
        {/* Hotel info */}
        <div className="panel p-6 ">
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

      {/* Data Management */}
      <div className="panel p-6 border-destructive/20 bg-destructive/[0.01]">
        <div className="flex items-center gap-2 mb-1">
          <Trash2 className="h-5 w-5 text-destructive" />
          <h3 className="font-display text-base font-semibold text-destructive">Data Management</h3>
        </div>
        <p className="mb-5 text-xs text-muted-foreground">
          Permanently clear operational and transaction records within a date range. This action is irreversible.
        </p>

        <div className="space-y-6">
          {/* Checkboxes */}
          <div>
            <span className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Data Categories to Clear</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dataCategories.map((cat) => (
                <label key={cat.id} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-3 hover:bg-muted/40 cursor-pointer transition-all">
                  <Checkbox
                    checked={selectedTypes.includes(cat.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTypes([...selectedTypes, cat.id]);
                      } else {
                        setSelectedTypes(selectedTypes.filter((t) => t !== cat.id));
                      }
                    }}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <span className="text-xs font-semibold text-foreground">{cat.label}</span>
                    <span className="text-[10px] text-muted-foreground">{cat.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Checkbox for irrespective of date */}
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/[0.02] p-3 max-w-max cursor-pointer transition-all hover:bg-destructive/[0.04]">
            <Checkbox
              id="clearAllDates"
              checked={clearAllDates}
              onCheckedChange={(checked) => setClearAllDates(!!checked)}
            />
            <label htmlFor="clearAllDates" className="grid gap-0.5 leading-none cursor-pointer">
              <span className="text-xs font-semibold text-destructive">Clear all records irrespective of date</span>
              <span className="text-[10px] text-muted-foreground">Warning: This will delete or soft-delete ALL records in the selected categories.</span>
            </label>
          </div>

          {/* Date range & Password */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block">
                <span className={`mb-1.5 block text-xs font-medium text-muted-foreground ${clearAllDates ? 'opacity-50' : ''}`}>From Date</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={clearAllDates}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50" />
              </label>
            </div>
            <div>
              <label className="block">
                <span className={`mb-1.5 block text-xs font-medium text-muted-foreground ${clearAllDates ? 'opacity-50' : ''}`}>To Date</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={clearAllDates}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50" />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Verify Admin Password</span>
                <input type="password" placeholder="Enter password to confirm" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
              </label>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <Button
                variant="destructive"
                className="h-10 rounded-xl px-5 font-semibold"
                disabled={selectedTypes.length === 0 || (!clearAllDates && (!startDate || !endDate)) || !password || clearMutation.isPending}
                onClick={() => setIsConfirmOpen(true)}
              >
                {clearMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Selected Data
                  </>
                )}
              </Button>
              <AlertDialogContent className="rounded-2xl max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive font-display">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirm Bulk Data Clearance
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 pt-2">
                    <p className="text-sm font-semibold text-foreground bg-destructive/5 border border-destructive/10 p-3 rounded-xl leading-relaxed">
                      Warning: You are about to permanently clear the selected data {clearAllDates ? <span className="font-bold text-destructive">irrespective of date (ALL TIME)</span> : <>from <span className="underline font-bold">{startDate}</span> to <span className="underline font-bold">{endDate}</span></>}. This action cannot be undone.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The following categories will be cleared:
                    </p>
                    <ul className="list-disc list-inside text-xs pl-2 space-y-1 font-semibold text-foreground">
                      {selectedTypes.map((t) => (
                        <li key={t}>{dataCategories.find((c) => c.id === t)?.label}</li>
                      ))}
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
                  <AlertDialogCancel className="rounded-xl border border-border/80 text-foreground transition-all hover:bg-muted/50">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearSubmit}
                    className="rounded-xl bg-destructive text-destructive-foreground transition-all hover:bg-destructive/90"
                  >
                    Yes, Clear Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
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
