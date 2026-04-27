import { IndianRupee, BedDouble, CalendarRange, Percent, LogIn, LogOut, DoorOpen } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRole } from "@/context/RoleContext";
import data from "@/data/data.json";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusBadge } from "@/components/ui/status-badge";

const fmtINR = (n: number) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "var(--shadow-card)",
} as const;

export default function Dashboard() {
  const { role, user } = useRole();
  const d = data.dashboard;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]} 👋`}
        subtitle={
          role === "admin"
            ? "Here's how Hotel Abhijeeth INN is performing this week."
            : "Here's your front-desk overview for today."
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {role === "admin" ? (
          <>
            <StatCard label="Total Revenue" value={fmtINR(d.revenue)} icon={IndianRupee} delta={12} tone="primary" />
            <StatCard label="Occupancy" value={`${d.occupancy}%`} icon={Percent} delta={4} tone="success" />
            <StatCard label="Total Bookings" value={String(d.totalBookings)} icon={CalendarRange} delta={8} tone="warning" />
            <StatCard label="Available Rooms" value={String(d.availableRooms)} icon={BedDouble} delta={-2} tone="muted" />
          </>
        ) : (
          <>
            <StatCard label="Today's Check-ins" value={String(d.checkIns)} icon={LogIn} delta={20} tone="primary" />
            <StatCard label="Today's Check-outs" value={String(d.checkOuts)} icon={LogOut} delta={-5} tone="warning" />
            <StatCard label="Available Rooms" value={String(d.availableRooms)} icon={DoorOpen} tone="success" />
            <StatCard label="Occupancy" value={`${d.occupancy}%`} icon={Percent} delta={4} tone="muted" />
          </>
        )}
      </div>

      {/* Charts (admin only) */}
      {role === "admin" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="panel p-5 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Booking trends</h3>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
              <span className="chip bg-primary-soft text-primary">Weekly</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }} />
                  <Area type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#bk)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Revenue overview</h3>
                <p className="text-xs text-muted-foreground">Daily revenue (₹)</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.trend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--primary-soft))" }} formatter={(v: number) => fmtINR(v)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <div>
            <h3 className="font-display text-base font-semibold">Recent bookings</h3>
            <p className="text-xs text-muted-foreground">Latest activity across the property</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Guest</th>
                <th className="px-5 py-3 font-medium">Room</th>
                <th className="px-5 py-3 font-medium">Dates</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.slice(0, 5).map((b) => (
                <tr key={b.id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3.5 font-medium text-foreground">{b.guest}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{b.room}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {b.checkIn} → {b.checkOut}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-3.5 text-right font-semibold">{fmtINR(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
