import { Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";

export default function Pricing() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-rooms-pricing"], queryFn: () => adminApi.getRooms() });
  const rooms = data?.data ?? [];

  const [prices, setPrices] = useState<Record<string, number>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Unique room types with their prices
  const roomTypes = useMemo(() => {
    const map = new Map<string, { type: string; price: number; count: number }>();
    rooms.forEach((r) => {
      if (!map.has(r.type)) map.set(r.type, { type: r.type, price: r.price, count: 1 });
      else map.get(r.type)!.count++;
    });
    return [...map.values()];
  }, [rooms]);

  // Sync state with backend room prices on load
  useEffect(() => {
    if (roomTypes.length > 0) {
      const initial: Record<string, number> = {};
      roomTypes.forEach((t) => {
        initial[t.type] = t.price;
      });
      // Initialize only if empty so user input is not overwritten
      setPrices((prev) => (Object.keys(prev).length === 0 ? initial : prev));
    }
  }, [roomTypes]);

  const mutation = useMutation({
    mutationFn: () => adminApi.updateRoomPricing({ pricing: prices }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rooms-pricing"] });
      setSuccessMsg("Pricing updated successfully!");
      setErrorMsg("");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to update pricing");
      setSuccessMsg("");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing"
        subtitle="Manage room rates and pricing options."
        actions={
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90 disabled:opacity-60"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </button>
        }
      />

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading rates…
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="border-b border-border/60 p-5">
            <h3 className="font-display text-base font-semibold">Base rates</h3>
            <p className="text-xs text-muted-foreground">Editable per room type</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Room type</th>
                  <th className="px-5 py-3 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map((p) => (
                  <tr key={p.type} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-4 font-semibold">
                      {p.type} <span className="text-xs text-muted-foreground">({p.count} rooms)</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative inline-flex items-center">
                        <span className="absolute left-3 text-sm text-muted-foreground">₹</span>
                        <input
                          type="number"
                          value={prices[p.type] !== undefined ? prices[p.type] : p.price}
                          onChange={(e) => setPrices(prev => ({ ...prev, [p.type]: Number(e.target.value) }))}
                          className="h-10 w-32 rounded-lg border border-border bg-background pl-7 pr-3 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
