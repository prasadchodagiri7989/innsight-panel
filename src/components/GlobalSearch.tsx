/**
 * Global command palette (Ctrl+K / click search bar).
 * Searches bookings, active guests, and provides quick navigation
 * shortcuts with role-aware action items.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, CalendarRange, BedDouble, IndianRupee, Users, BarChart3,
  UserCog, Settings, UserPlus, LogIn, LogOut, Grid3x3, UserCheck, ArrowRightLeft,
  Search, Loader2, X,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { adminApi, receptionApi, type Booking } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// ── Static nav + action items ─────────────────────────────────────────────────
type Role = "admin" | "receptionist";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["admin", "receptionist"] as Role[] },
  { title: "Bookings", url: "/bookings", icon: CalendarRange, roles: ["admin"] as Role[] },
  { title: "Active Guests", url: "/active-guests", icon: UserCheck, roles: ["admin", "receptionist"] as Role[] },
  { title: "Check-in / Check-out", url: "/check-in-out", icon: LogIn, roles: ["admin", "receptionist"] as Role[] },
  { title: "Room Allocation", url: "/allocation", icon: Grid3x3, roles: ["admin", "receptionist"] as Role[] },
  { title: "Walk-in Booking", url: "/walk-in", icon: UserPlus, roles: ["receptionist"] as Role[] },
  { title: "Rooms", url: "/rooms", icon: BedDouble, roles: ["admin"] as Role[] },
  { title: "Pricing", url: "/pricing", icon: IndianRupee, roles: ["admin"] as Role[] },
  { title: "Guest Records", url: "/guests", icon: Users, roles: ["admin", "receptionist"] as Role[] },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["admin"] as Role[] },
  { title: "Staff", url: "/staff", icon: UserCog, roles: ["admin"] as Role[] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["admin"] as Role[] },
];

const ACTION_ITEMS = [
  { title: "New walk-in booking", url: "/walk-in", icon: UserPlus, roles: ["receptionist"] as Role[], badge: "Walk-in" },
  { title: "Check in an arriving guest", url: "/check-in-out?tab=confirmed", icon: LogIn, roles: ["admin", "receptionist"] as Role[], badge: "Check-in" },
  { title: "Check out an in-house guest", url: "/check-in-out?tab=checked_in", icon: LogOut, roles: ["admin", "receptionist"] as Role[], badge: "Check-out" },
  { title: "Change guest room", url: "/active-guests", icon: ArrowRightLeft, roles: ["admin", "receptionist"] as Role[], badge: "Room change" },
  { title: "View all rooms", url: "/allocation", icon: Grid3x3, roles: ["admin", "receptionist"] as Role[], badge: "Allocation" },
  { title: "Add new staff member", url: "/staff", icon: UserCog, roles: ["admin"] as Role[], badge: "Staff" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function guestName(b: Booking): string {
  return b.guestDetails?.name ?? b.user?.name ?? "Unknown Guest";
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  confirmed:   { label: "Arriving",   class: "bg-primary/10 text-primary" },
  checked_in:  { label: "In-house",   class: "bg-success/10 text-success" },
  checked_out: { label: "Checked out",class: "bg-muted text-muted-foreground" },
  pending:     { label: "Pending",    class: "bg-warning/10 text-warning" },
  cancelled:   { label: "Cancelled",  class: "bg-destructive/10 text-destructive" },
  completed:   { label: "Completed",  class: "bg-muted text-muted-foreground" },
};

// ── useDebounce ───────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.role ?? "receptionist") as Role;
  const qc = useQueryClient();

  const [input, setInput] = useState("");
  const debouncedQ = useDebounce(input, 280);

  // Active guests from cache (refresh on open)
  const { data: activeGuestsData, isFetching: fetchingGuests } = useQuery({
    queryKey: ["active-guests"],
    queryFn: () => adminApi.getActiveGuests(),
    enabled: open,
    staleTime: 20_000,
  });

  // Booking search (only when query >= 2 chars)
  const shouldSearchBookings = debouncedQ.length >= 2;
  const bookingApi = role === "admin"
    ? () => adminApi.getBookings({ search: debouncedQ, limit: "10" })
    : () => receptionApi.getBookings({ search: debouncedQ, limit: "10" });

  const { data: bookingSearchData, isFetching: fetchingBookings } = useQuery({
    queryKey: ["global-search-bookings", debouncedQ, role],
    queryFn: bookingApi,
    enabled: open && shouldSearchBookings,
    staleTime: 10_000,
  });

  const activeGuests = activeGuestsData?.data ?? [];
  const bookingResults = bookingSearchData?.data ?? [];

  // Filter active guests client-side
  const filteredGuests = input.length >= 1
    ? activeGuests.filter((b) => {
        const q = input.toLowerCase();
        return (
          guestName(b).toLowerCase().includes(q) ||
          (b.room?.roomNumber ?? "").toLowerCase().includes(q) ||
          (b.bookingId ?? "").toLowerCase().includes(q) ||
          (b.guestDetails?.phone ?? "").includes(q)
        );
      })
    : activeGuests.slice(0, 5); // show first 5 when no query

  // Filter nav items
  const filteredNav = input
    ? NAV_ITEMS.filter(
        (n) =>
          n.roles.includes(role) &&
          n.title.toLowerCase().includes(input.toLowerCase())
      )
    : NAV_ITEMS.filter((n) => n.roles.includes(role));

  // Filter action items
  const filteredActions = input
    ? ACTION_ITEMS.filter(
        (a) =>
          a.roles.includes(role) &&
          a.title.toLowerCase().includes(input.toLowerCase())
      )
    : ACTION_ITEMS.filter((a) => a.roles.includes(role));

  const isFetching = fetchingGuests || fetchingBookings;

  const go = useCallback(
    (url: string) => {
      onOpenChange(false);
      setInput("");
      navigate(url);
    },
    [navigate, onOpenChange]
  );

  // Close on Escape is handled by CommandDialog. Ctrl+K toggling is in parent.
  useEffect(() => {
    if (!open) setInput("");
  }, [open]);

  const hasBookingResults = shouldSearchBookings && bookingResults.length > 0;
  const hasGuestResults = filteredGuests.length > 0;
  const hasNavResults = filteredNav.length > 0;
  const hasActionResults = filteredActions.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search guests, rooms, booking IDs, or actions…"
        value={input}
        onValueChange={setInput}
      />
      <CommandList>
        {isFetching && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Searching…
          </div>
        )}

        <CommandEmpty>No results found.</CommandEmpty>

        {/* ── Active Guests ──────────────────────────────────────────── */}
        {hasGuestResults && (
          <>
            <CommandGroup heading="Active guests">
              {filteredGuests.map((b) => (
                <div key={b._id} className="px-1">
                  <CommandItem
                    value={`guest-checkout-${b._id}`}
                    onSelect={() =>
                      go(`/check-in-out?tab=checked_in&q=${encodeURIComponent(b.bookingId)}`)
                    }
                    className="flex items-center justify-between gap-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium truncate">{guestName(b)}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        · Room {b.room?.roomNumber ?? "?"}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                      Check out
                    </span>
                  </CommandItem>
                  <CommandItem
                    value={`guest-changeroom-${b._id}`}
                    onSelect={() =>
                      go(`/active-guests?q=${encodeURIComponent(guestName(b))}`)
                    }
                    className="flex items-center justify-between gap-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowRightLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">Change room — {guestName(b)}</span>
                    </div>
                    <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Room {b.room?.roomNumber ?? "?"}
                    </span>
                  </CommandItem>
                </div>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* ── Booking Search Results ─────────────────────────────────── */}
        {hasBookingResults && (
          <>
            <CommandGroup heading="Bookings">
              {bookingResults.map((b) => {
                const name = guestName(b);
                const st = STATUS_BADGE[b.status] ?? { label: b.status, class: "bg-muted text-muted-foreground" };
                let actionUrl = "/bookings";
                let actionLabel = "View";

                if (b.status === "confirmed") {
                  actionUrl = `/check-in-out?tab=confirmed&q=${encodeURIComponent(b.bookingId)}`;
                  actionLabel = "Check in";
                } else if (b.status === "checked_in") {
                  actionUrl = `/check-in-out?tab=checked_in&q=${encodeURIComponent(b.bookingId)}`;
                  actionLabel = "Check out";
                } else if (role === "admin") {
                  actionUrl = `/bookings?search=${encodeURIComponent(b.bookingId)}`;
                }

                return (
                  <CommandItem
                    key={b._id}
                    value={`booking-${b._id}`}
                    onSelect={() => go(actionUrl)}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <span className="font-medium">{name}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{b.bookingId}</span>
                        {b.room && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            · Room {b.room.roomNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${st.class}`}>
                        {st.label}
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
                        {actionLabel}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* ── Quick Actions ──────────────────────────────────────────── */}
        {hasActionResults && (
          <>
            <CommandGroup heading="Quick actions">
              {filteredActions.map((a) => (
                <CommandItem
                  key={a.url}
                  value={`action-${a.title}`}
                  onSelect={() => go(a.url)}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <a.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{a.title}</span>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {a.badge}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* ── Navigation ────────────────────────────────────────────── */}
        {hasNavResults && (
          <CommandGroup heading="Go to page">
            {filteredNav.map((n) => (
              <CommandItem
                key={n.url}
                value={`nav-${n.title}`}
                onSelect={() => go(n.url)}
                className="flex items-center gap-2"
              >
                <n.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{n.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground flex items-center gap-3">
        <span><kbd className="rounded border border-border px-1 font-mono text-[10px]">↑↓</kbd> navigate</span>
        <span><kbd className="rounded border border-border px-1 font-mono text-[10px]">↵</kbd> select</span>
        <span><kbd className="rounded border border-border px-1 font-mono text-[10px]">Esc</kbd> close</span>
      </div>
    </CommandDialog>
  );
}
