import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Loader2, Search, ArrowRightLeft, User, BedDouble, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { adminApi, type Booking, type Room } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtINR = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDate = (d: string) => {
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
};

function guestName(b: Booking): string {
  return b.guestDetails?.name ?? b.user?.name ?? "Unknown";
}

// ── Change-Room Dialog ────────────────────────────────────────────────────────
interface ChangeRoomDialogProps {
  booking: Booking;
  availableRooms: Room[];
  onClose: () => void;
}

function ChangeRoomDialog({ booking, availableRooms, onClose }: ChangeRoomDialogProps) {
  const [selectedRoom, setSelectedRoom] = useState("");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newRoomId: string) => adminApi.changeGuestRoom(booking._id, newRoomId),
    onSuccess: () => {
      toast.success("Room changed successfully");
      qc.invalidateQueries({ queryKey: ["active-guests"] });
      qc.invalidateQueries({ queryKey: ["admin-rooms-alloc"] });
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentRoom = booking.room;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="panel w-full max-w-md space-y-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Change Room</h2>
            <p className="text-sm text-muted-foreground">{guestName(booking)} · Booking {booking.bookingId}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {currentRoom && (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Current room:</span>{" "}
            <span className="font-semibold">
              {currentRoom.roomNumber} · {currentRoom.type} · {fmtINR(currentRoom.price)}/night
            </span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Select new room</label>
          {availableRooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available rooms at the moment.</p>
          ) : (
            <div className="grid max-h-60 gap-2 overflow-y-auto pr-1">
              {availableRooms.map((r) => (
                <button
                  key={r._id}
                  onClick={() => setSelectedRoom(r._id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-sm transition-all",
                    selectedRoom === r._id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <span className="font-semibold">Room {r.roomNumber}</span>
                  <span className="text-muted-foreground">{r.type} · Floor {r.floor} · {fmtINR(r.price)}/night</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedRoom && currentRoom && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Note: The booking amount will be recalculated based on the new room price for the remaining {booking.nights} night(s).
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate(selectedRoom)}
            disabled={!selectedRoom || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Change
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Guest Detail Dialog ───────────────────────────────────────────────────────
interface GuestDetailDialogProps {
  booking: Booking;
  availableRooms: Room[];
  onClose: () => void;
}

function GuestDetailDialog({ booking, availableRooms, onClose }: GuestDetailDialogProps) {
  const [showChangeRoom, setShowChangeRoom] = useState(false);
  const name = guestName(booking);
  const phone = booking.guestDetails?.phone ?? booking.user?.phone ?? "—";
  const email = booking.guestDetails?.email ?? booking.user?.email ?? "—";
  const idProof = booking.guestDetails?.idProof ?? "—";

  if (showChangeRoom) {
    return (
      <ChangeRoomDialog
        booking={booking}
        availableRooms={availableRooms}
        onClose={() => setShowChangeRoom(false)}
      />
    );
  }

  const extrasTotal = booking.extraCharges.reduce((s, c) => s + c.amount, 0);
  const balance = booking.totalAmount - booking.advancePaid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="panel w-full max-w-lg space-y-5 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">{name}</h2>
              <p className="text-sm text-muted-foreground">{booking.bookingId}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Phone" value={phone} />
          <InfoRow label="Email" value={email} span2 />
          <InfoRow label="ID Proof" value={idProof} />
          <InfoRow label="Room" value={booking.room ? `${booking.room.roomNumber} · ${booking.room.type}` : "—"} />
          <InfoRow label="Floor" value={booking.room ? `Floor ${booking.room.floor}` : "—"} />
          <InfoRow label="Check-in" value={booking.actualCheckIn ? fmtDate(booking.actualCheckIn as unknown as string) : fmtDate(booking.checkInDate)} />
          <InfoRow label="Due Out" value={fmtDate(booking.checkOutDate)} />
          <InfoRow label="Nights" value={String(booking.nights)} />
          <InfoRow label="Room Rate" value={booking.room ? fmtINR(booking.room.price) + "/night" : "—"} />
          <InfoRow label="Subtotal" value={fmtINR(booking.subtotal)} />
          <InfoRow label="Tax" value={fmtINR(booking.tax)} />
          <InfoRow label="Total" value={fmtINR(booking.totalAmount)} />
          <InfoRow label="Advance Paid" value={fmtINR(booking.advancePaid)} />
          <InfoRow label="Balance Due" value={fmtINR(balance)} />
        </div>

        {booking.extraCharges.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Extra Charges ({fmtINR(extrasTotal)})</p>
            <div className="rounded-xl border border-border divide-y divide-border">
              {booking.extraCharges.map((c) => (
                <div key={c._id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{c.description} <span className="text-muted-foreground">({c.category})</span></span>
                  <span className="font-medium">{fmtINR(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={() => setShowChangeRoom(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Change Room
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  return (
    <div className={cn("rounded-xl bg-muted/40 px-3 py-2", span2 && "col-span-2")}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-medium truncate" title={value}>{value}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ActiveGuests() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [selected, setSelected] = useState<Booking | null>(null);

  useEffect(() => {
    const urlQ = searchParams.get("q");
    if (urlQ !== null) setSearch(urlQ);
  }, [searchParams]);

  const { data: guestsData, isLoading: loadingGuests } = useQuery({
    queryKey: ["active-guests"],
    queryFn: () => adminApi.getActiveGuests(),
    refetchInterval: 30_000,
  });

  const { data: roomsData } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: () => adminApi.getRooms(),
  });

  const guests = guestsData?.data ?? [];
  const availableRooms = (roomsData?.data ?? []).filter((r) => r.status === "available" && r.isActive);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return guests;
    return guests.filter((b) => {
      const name = guestName(b).toLowerCase();
      const room = b.room?.roomNumber?.toLowerCase() ?? "";
      const bid = b.bookingId?.toLowerCase() ?? "";
      return name.includes(q) || room.includes(q) || bid.includes(q);
    });
  }, [guests, search]);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Active Guests"
          subtitle={`${guests.length} guest${guests.length !== 1 ? "s" : ""} currently checked in`}
        />

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, room, booking ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {loadingGuests ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading active guests…
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel flex flex-col items-center justify-center gap-3 py-16 text-center">
            <BedDouble className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search ? "No guests match your search." : "No guests are currently checked in."}
            </p>
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Guest</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Room</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Check-in</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Out</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((b) => {
                    const name = guestName(b);
                    const phone = b.guestDetails?.phone ?? b.user?.phone ?? "—";
                    const balance = b.totalAmount - b.advancePaid;
                    return (
                      <tr key={b._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelected(b)}
                            className="text-left hover:underline"
                          >
                            <p className="font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground">{phone}</p>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {b.room ? (
                            <>
                              <p className="font-semibold">{b.room.roomNumber}</p>
                              <p className="text-xs text-muted-foreground">{b.room.type} · Floor {b.room.floor}</p>
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {b.actualCheckIn ? fmtDate(b.actualCheckIn as unknown as string) : fmtDate(b.checkInDate)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(b.checkOutDate)}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmtINR(b.totalAmount)}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={balance > 0 ? "destructive" : "default"}>
                            {fmtINR(balance)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelected(b)}>
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelected(b)}
                              title="Change room"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <GuestDetailDialog
          booking={selected}
          availableRooms={availableRooms}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
