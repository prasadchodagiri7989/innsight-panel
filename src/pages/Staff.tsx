import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import data from "@/data/data.json";

export default function Staff() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        subtitle="Manage team members and their roles."
        actions={
          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add staff
          </button>
        }
      />

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Shift</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s) => (
                <tr key={s.id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-xs font-semibold text-primary-foreground">
                        {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <p className="font-medium">{s.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{s.email}</td>
                  <td className="px-5 py-3.5">
                    <select
                      defaultValue={s.role}
                      className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                    >
                      <option>Admin</option>
                      <option>Receptionist</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{s.shift}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-warning-soft hover:text-warning">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
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
