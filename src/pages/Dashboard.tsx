import { IndianRupee, BedDouble, CalendarRange, Percent, LogIn, LogOut, DoorOpen, Loader2 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, receptionApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";

const fmtINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 } as const;

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role ?? "receptionist";

  const { data: adminData, isLoading: adminLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
    enabled: role === "admin",
  });

  const { data: receptionData, isLoading: receptionLoading } = useQuery({
    queryKey: ["reception-today"],
    queryFn: () => receptionApi.getToday(),
    enabled: role === "receptionist",
  });

  const isLoading = adminLoading || receptionLoading;
  const d = adminData?.data;
  const rt = receptionData?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]} 👋`}
        subtitle={role === "admin" ? "Here's how Hotel Abhijeeth INN is performing today." : "Here's your front-desk overview for today."}
      />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {role === "admin" && d ? (
              <>
                <StatCard label="Total Revenue" value={fmtINR(d.revenue.allTime)} icon={IndianRupee} tone="primary" />
                <StatCard label="Occupancy" value={`${d.occupancyRate}%`} icon={Percent} tone="success" />
                <StatCard label="Total Bookings" value={String(d.bookings.total)} icon={CalendarRange} tone="warning" />
                <StatCard label="Available Rooms" value={String(d.rooms.available)} icon={BedDouble} tone="muted" />
              </>
            ) : rt ? (
              <>
                <StatCard label="Today Check-ins" value={String(rt.todayCheckIns.length)} icon={LogIn} tone="primary" />
                <StatCard label="Today Check-outs" value={String(rt.todayCheckOuts.length)} icon={LogOut} tone="warning" />
                <StatCard label="Currently Occupied" value={String(rt.currentlyOccupied.length)} icon={DoorOpen} tone="success" />
                <StatCard label="Pending Check-outs" value={String(rt.todayCheckOuts.length)} icon={Percent} tone="muted" />
              </>
            ) : null}
          </div>

          {role === "admin" && d && (
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 p-5">
                <div>
                  <h3 className="font-display text-base font-semibold">Recent bookings</h3>
                  <p className="text-xs text-muted-foreground">Latest 5 reservations</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Booking ID</th>
                      <th className="px-5 py-3 font-medium">Guest</th>
                      <th className="px-5 py-3 font-medium">Room</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.recentBookings.map((b) => (
                      <tr key={b._id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40">
                        <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{b.bookingId}</td>
                        <td className="px-5 py-3.5 font-medium">{b.user?.name ?? "Guest"}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {b.room ? `${b.room.roomNumber} · ${b.room.type}` : "—"}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                        <td className="px-5 py-3.5 text-right font-semibold">{fmtINR(b.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {role === "receptionist" && rt && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="panel overflow-hidden">
                  <div className="border-b border-border/60 p-5">
                    <h3 className="font-display text-base font-semibold">Today's Check-ins</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Guest</th>
                          <th className="px-4 py-3 font-medium">Room</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rt.todayCheckIns.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No check-ins today</td></tr>
                        ) : rt.todayCheckIns.map((b) => (
                          <tr key={b._id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3 font-medium">{b.user?.name ?? b.guestDetails?.name ?? "Guest"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{b.room?.roomNumber ?? "—"}</td>
                            <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="panel overflow-hidden">
                  <div className="border-b border-border/60 p-5">
                    <h3 className="font-display text-base font-semibold">Today's Check-outs</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Guest</th>
                          <th className="px-4 py-3 font-medium">Room</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rt.todayCheckOuts.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No check-outs today</td></tr>
                        ) : rt.todayCheckOuts.map((b) => (
                          <tr key={b._id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3 font-medium">{b.user?.name ?? b.guestDetails?.name ?? "Guest"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{b.room?.roomNumber ?? "—"}</td>
                            <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="panel overflow-hidden">
                <div className="border-b border-border/60 p-5">
                  <h3 className="font-display text-base font-semibold">Currently Occupied Rooms</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{rt.currentlyOccupied.length} room{rt.currentlyOccupied.length !== 1 ? "s" : ""} in use right now</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Room</th>
                        <th className="px-4 py-3 font-medium">Guest</th>
                        <th className="px-4 py-3 font-medium">Check-in</th>
                        <th className="px-4 py-3 font-medium">Due out</th>
                        <th className="px-4 py-3 text-right font-medium">Nights</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rt.currentlyOccupied.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No rooms currently occupied</td></tr>
                      ) : rt.currentlyOccupied.map((b) => (
                        <tr key={b._id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                          <td className="px-4 py-3 font-semibold">{b.room?.roomNumber ?? "—"} <span className="font-normal text-muted-foreground text-xs">· {b.room?.type}</span></td>
                          <td className="px-4 py-3 font-medium">{b.user?.name ?? b.guestDetails?.name ?? "Guest"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{format(new Date(b.checkInDate), "dd MMM")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{format(new Date(b.checkOutDate), "dd MMM")}</td>
                          <td className="px-4 py-3 text-right">{b.nights}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}