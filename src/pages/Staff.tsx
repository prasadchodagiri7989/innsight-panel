import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminApi, type Staff } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Staff() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "receptionist", shift: "morning", salary: "", phone: "", email: "" });
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["admin-staff"], queryFn: () => adminApi.getStaff() });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createStaff({
      name: form.name, role: form.role, shift: form.shift,
      salary: form.salary ? Number(form.salary) : undefined,
      contact: { phone: form.phone || undefined, email: form.email || undefined },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-staff"] }); setShowForm(false); setForm({ name:"",role:"receptionist",shift:"morning",salary:"",phone:"",email:"" }); },
    onError: (e: any) => setFormError(e.message),
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
          {formError && <p className="text-sm text-destructive">{formError}</p>}
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
                  <tr key={s._id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40">
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
                        <button onClick={() => { if(confirm("Deactivate this staff member?")) deleteMutation.mutate(s._id); }}
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
    </div>
  );
}