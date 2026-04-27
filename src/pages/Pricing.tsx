import { Save, Tag } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import data from "@/data/data.json";

const fmtINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(n);

export default function Pricing() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing"
        subtitle="Manage room rates, seasonal pricing, and discounts."
        actions={
          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90">
            <Save className="h-4 w-4" /> Save changes
          </button>
        }
      />

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
                <th className="px-5 py-3 font-medium">Weekday rate</th>
                <th className="px-5 py-3 font-medium">Weekend rate</th>
                <th className="px-5 py-3 font-medium">Season</th>
              </tr>
            </thead>
            <tbody>
              {data.pricing.map((p) => (
                <tr key={p.type} className="border-b border-border/40 last:border-0">
                  <td className="px-5 py-4 font-semibold">{p.type}</td>
                  <td className="px-5 py-4">
                    <div className="relative inline-flex items-center">
                      <span className="absolute left-3 text-sm text-muted-foreground">₹</span>
                      <input
                        type="number"
                        defaultValue={p.weekday}
                        className="h-10 w-32 rounded-lg border border-border bg-background pl-7 pr-3 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="relative inline-flex items-center">
                      <span className="absolute left-3 text-sm text-muted-foreground">₹</span>
                      <input
                        type="number"
                        defaultValue={p.weekend}
                        className="h-10 w-32 rounded-lg border border-border bg-background pl-7 pr-3 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{p.season}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-display text-base font-semibold">Seasonal pricing</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {data.seasons.map((s) => {
            const isDiscount = "discount" in s;
            return (
              <div key={s.name} className="panel p-5 transition-all hover:shadow-elevated">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Tag className="h-5 w-5" />
                  </div>
                  <span className={`chip ${isDiscount ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                    {isDiscount ? `-${(s as any).discount}%` : `+${(s as any).uplift}%`}
                  </span>
                </div>
                <p className="mt-4 font-display text-lg font-bold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.dates}</p>
                <input
                  type="number"
                  defaultValue={isDiscount ? (s as any).discount : (s as any).uplift}
                  className="mt-4 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  placeholder="Adjustment %"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
