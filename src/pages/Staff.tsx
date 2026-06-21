import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Calendar, Shield, Clock, Phone, Mail, MapPin, IndianRupee, FileText, AlertTriangle } from "lucide-react";
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
import { adminApi, type Staff, ApiError } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

const fmtINR = (n?: number) => n !== undefined ? "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n) : "—";

function StaffDetailsDialog({
  staff,
  open,
  onClose,
}: {
  staff: Staff | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!staff) return null;

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return "—";
    }
  };

  const initials = staff.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader className="flex flex-row items-center gap-4 border-b pb-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-lg font-bold text-primary-foreground shadow-sm">
            {initials}
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-xl font-bold tracking-tight">{staff.name}</DialogTitle>
            <p className="text-xs font-mono text-muted-foreground">{staff.employeeId || "—"}</p>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4 text-sm">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Role
              </span>
              <p className="font-semibold capitalize pl-5">{staff.role}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Shift
              </span>
              <p className="font-semibold capitalize pl-5">{staff.shift}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5" /> Salary
              </span>
              <p className="font-semibold pl-5">{fmtINR(staff.salary)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Joined Date
              </span>
              <p className="font-semibold pl-5">{formatDate(staff.joiningDate)}</p>
            </div>
          </div>

          <div className="border-t border-border/40 pt-4 space-y-3">
            {/* Contact details */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Information</p>
              
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary animate-pulse" />
                <span className="text-foreground font-medium">{staff.contact?.phone || "—"}</span>
              </div>

              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground font-medium break-all">{staff.contact?.email || "—"}</span>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Address
              </span>
              <p className="text-foreground pl-5 leading-relaxed">{staff.address || "—"}</p>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Notes
              </span>
              <p className="text-foreground pl-5 leading-relaxed bg-muted/40 p-2.5 rounded-xl border border-border/30">
                {staff.notes || "No notes available."}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Staff() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "receptionist", shift: "morning", salary: "", phone: "", email: "" });
  const [formError, setFormError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin-staff"], queryFn: () => adminApi.getStaff() });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createStaff({
      name: form.name, role: form.role, shift: form.shift,
      salary: form.salary ? Number(form.salary) : undefined,
      contact: { phone: form.phone || undefined, email: form.email || undefined },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-staff"] }); setShowForm(false); setForm({ name:"",role:"receptionist",shift:"morning",salary:"",phone:"",email:"" }); },
    onError: (e: any) => {
      if (e instanceof ApiError && e.errors && e.errors.length > 0) {
        setFormError(e.errors.map((err) => err.message).join("\n"));
      } else {
        setFormError(e.message || "Something went wrong");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteStaff(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });

  const staff = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Staff" subtitle="Manage team members and their roles."
        actions={
          <button onClick={() => setShowForm(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add staff
          </button>
        }
      />

      {showForm && (
        <div className="panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">New staff member</h3>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
          </div>
          {formError && <p className="text-sm text-destructive whitespace-pre-wrap">{formError}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[["name","Full name","text"],["salary","Salary (₹)","number"],["phone","Phone","text"],["email","Email","email"]].map(([k,l,t]) => (
              <div key={k}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{l}</label>
                <input type={t} value={(form as any)[k]} onChange={(e) => setForm(f => ({...f,[k]:e.target.value}))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Role</label>
              <select value={form.role} onChange={(e) => setForm(f=>({...f,role:e.target.value}))}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none">
                {["admin","receptionist","manager","housekeeping","chef","security","maintenance"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Shift</label>
              <select value={form.shift} onChange={(e) => setForm(f=>({...f,shift:e.target.value}))}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none">
                {["morning","afternoon","night","rotating"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <button type="button" onClick={() => setShowForm(false)} className="h-10 rounded-xl border border-border bg-card px-5 text-sm hover:bg-muted">Cancel</button>
            <button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create
            </button>
          </div>
        </div>
      )}

      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading staff&#8230;</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Employee ID</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Shift</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No staff found.</td></tr>
                ) : staff.map((s) => (
                  <tr key={s._id} onClick={() => setSelectedStaff(s)}
                    className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40 cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-xs font-semibold text-primary-foreground">
                          {s.name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                        </div>
                        <p className="font-medium">{s.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{s.employeeId}</td>
                    <td className="px-5 py-3.5 capitalize text-muted-foreground">{s.role}</td>
                    <td className="px-5 py-3.5 capitalize text-muted-foreground">{s.shift}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">
                      {s.contact?.phone && <div>{s.contact.phone}</div>}
                      {s.contact?.email && <div>{s.contact.email}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setDeactivateTarget({ id: s._id, name: s.name }); }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
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

      <StaffDetailsDialog staff={selectedStaff} open={!!selectedStaff} onClose={() => setSelectedStaff(null)} />

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="font-display text-lg font-bold">Deactivate Staff Member?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground text-center">
              Are you sure you want to deactivate <strong className="text-foreground">{deactivateTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-4">
            <AlertDialogCancel className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivateTarget) {
                  deleteMutation.mutate(deactivateTarget.id);
                  setDeactivateTarget(null);
                }
              }}
              className="flex-1 h-10 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}