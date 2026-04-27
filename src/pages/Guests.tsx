import { Search, Eye, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import data from "@/data/data.json";
import { useState } from "react";

export default function Guests() {
  const [q, setQ] = useState("");
  const list = data.guests.filter(
    (g) =>
      g.name.toLowerCase().includes(q.toLowerCase()) ||
      g.phone.includes(q) ||
      g.email.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Guest records" subtitle="Search and view guest profiles and stay history." />

      <div className="panel overflow-hidden">
        <div className="border-b border-border/60 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, phone, or email…"
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Guest</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Stays</th>
                <th className="px-5 py-3 font-medium">Last visit</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-xs font-semibold text-primary">
                        {g.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{g.name}</p>
                        <p className="text-[11px] text-muted-foreground">{g.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {g.phone}</p>
                    <p className="flex items-center gap-1.5 text-xs"><Mail className="h-3 w-3" /> {g.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="chip bg-primary-soft text-primary">{g.stays} stays</span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{g.lastVisit}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-muted px-3 text-xs font-semibold text-foreground transition-colors hover:bg-primary-soft hover:text-primary">
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
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
