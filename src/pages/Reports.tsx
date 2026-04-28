import { Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fmtINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(n);

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "var(--shadow-card)",
} as const;

export default function Reports() {
  const { data: revData, isLoading: revLoading } = useQuery({
    queryKey: ["reports-revenue"],
    queryFn: () => adminApi.getRevenueReport(),
  });
  const { data: occData, isLoading: occLoading } = useQuery({
    queryKey: ["reports-occupancy"],
    queryFn: () => adminApi.getOccupancyReport(),
  });

  const revenueChart = revData?.data ?? [];
  const occupancyChart = occData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & analytics"
        subtitle="Track revenue, occupancy and performance over time."
        actions={
          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90">
            <Download className="h-4 w-4" /> Export
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Revenue</h3>
            <p className="text-xs text-muted-foreground">Monthly revenue (₹)</p>
          </div>
          {revLoading ? (
            <div className="flex h-72 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--primary-soft))" }} formatter={(v: number) => fmtINR(v)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Occupancy</h3>
            <p className="text-xs text-muted-foreground">Monthly occupancy %</p>
          </div>
          {occLoading ? (
            <div className="flex h-72 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={occupancyChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="occupancy" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
