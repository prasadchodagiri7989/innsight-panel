import { useState } from "react";
import { Search, Eye, Mail, Phone, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Guests() {
  const [q, setQ] = useState("");
  const params: Record<string, string> = { role: "user", limit: "100" };
  if (q) params.search = q;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", params],
    queryFn: () => adminApi.getUsers(params),
  });

  const users = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Guest records" subtitle="Search and view guest profiles." />
      <div className="panel overflow-hidden">
        <div className="border-b border-border/60 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, phone, or email&#8230;"
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading guests&#8230;</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Guest</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Tier</th>
                  <th className="px-5 py-3 font-medium">Total stays</th>
                  <th className="px-5 py-3 font-medium">Member since</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No guests found.</td></tr>
                ) : users.map((g) => (
                  <tr key={g._id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-xs font-semibold text-primary">
                          {g.name.split(" ").map((n) => n[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <p className="font-medium">{g.name}</p>
                          <p className="text-[11px] text-muted-foreground">{g._id.slice(-8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {g.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {g.phone}</p>}
                      <p className="flex items-center gap-1.5 text-xs"><Mail className="h-3 w-3" /> {g.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {g.loyaltyTier && <span className="chip bg-primary-soft text-primary">{g.loyaltyTier}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{g.totalStays ?? 0} stays</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{g.memberSince ?? (g.createdAt ? new Date(g.createdAt).getFullYear() : "—")}</td>
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