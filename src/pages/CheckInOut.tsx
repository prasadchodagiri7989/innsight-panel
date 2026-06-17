import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, LogIn, LogOut, Plus, Trash2, User, Loader2, Receipt, CreditCard, Banknote, Download, Send, CheckCircle2, X, BedDouble, Calendar, Hash, Phone, Mail, Home } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { receptionApi, invoicesApi, type Booking, type InvoicePreview, ApiError } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { toast } from "@/hooks/use-toast";

const fmtINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const CHARGE_CATS = [
  { value: "food", label: "🍽 Food" },
  { value: "laundry", label: "👕 Laundry" },
  { value: "room_service", label: "🛎 Room Service" },
  { value: "minibar", label: "🍷 Minibar" },
  { value: "transport", label: "🚗 Transport" },
  { value: "other", label: "📦 Other" },
];

const PAY_METHODS = ["cash", "card", "upi", "net_banking"];

// ── Invoice Preview Panel ──────────────────────────────────────────────────────
function InvoicePanel({ inv, advancePaid }: { inv: InvoicePreview; advancePaid?: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
      <p className="mb-3 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Bill Summary</p>
      <dl className="space-y-1.5">
        <Row label="Room charges" value={fmtINR(inv.roomSubtotal)} />
        {inv.extraCharges.map((c, i) => (
          <Row key={i} label={`  ${c.description}`} value={fmtINR(c.amount)} muted />
        ))}
        {inv.extraChargesTotal > 0 && <Row label="Extras subtotal" value={fmtINR(inv.extraChargesTotal)} />}
        <div className="my-1 border-t border-border/40" />
        <Row label="Subtotal" value={fmtINR(inv.subtotal)} />
        {Number(inv.discount ?? 0) > 0 && (
          <Row label="Discount" value={`− ${fmtINR(inv.discount ?? 0)}`} color="text-green-600" />
        )}
        <Row label={`CGST (${inv.cgstPercentage}%)`} value={fmtINR(inv.cgst)} muted />
        <Row label={`SGST (${inv.sgstPercentage}%)`} value={fmtINR(inv.sgst)} muted />
        <div className="my-1 border-t border-border/40" />
        <Row label="Total" value={fmtINR(inv.totalAmount)} bold />
        <Row label="Advance paid" value={`− ${fmtINR(advancePaid ?? inv.advancePaid)}`} muted />
        <Row label="Balance due" value={fmtINR(inv.balanceDue)} bold color="text-destructive" />
      </dl>
    </div>
  );
}

function Row({ label, value, muted, bold, color }: { label: string; value: string; muted?: boolean; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between">
      <dt className={muted ? "text-muted-foreground text-xs" : "text-sm"}>{label}</dt>
      <dd className={`font-mono text-xs ${bold ? "font-bold text-sm" : ""} ${color ?? ""}`}>{value}</dd>
    </div>
  );
}

// ── Bill Preview Modal (shown before checkout) ────────────────────────────────
function BillPreviewModal({ inv, booking, payMethod, onClose, onConfirm, isPending }: {
  inv: InvoicePreview;
  booking: Booking;
  payMethod: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const guestName = booking.user?.name ?? booking.guestDetails?.name ?? "Guest";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 shrink-0">
          <h2 className="font-display font-bold text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> Bill Preview
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl bg-muted/40 px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Guest: </span><span className="font-semibold">{guestName}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-muted-foreground">Room: </span><span className="font-semibold">{booking.room?.roomNumber ?? "—"}</span>
          </div>
          <InvoicePanel inv={inv} advancePaid={booking.advancePaid} />
          {inv.balanceDue > 0 && (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">Balance to collect</p>
              <p className="text-2xl font-bold font-display text-amber-700 dark:text-amber-200 mt-0.5">{fmtINR(inv.balanceDue)}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 capitalize">via {payMethod}</p>
            </div>
          )}
          {inv.balanceDue === 0 && (
            <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success font-semibold">
              No balance due — fully paid via advance.
            </div>
          )}
        </div>
        <div className="flex gap-3 border-t border-border/60 px-5 py-4 shrink-0">
          <button onClick={onClose} disabled={isPending} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-50">Back</button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 h-11 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-50 flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Confirm Checkout</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invoice Success Modal (after checkout) ────────────────────────────────────
function InvoiceSuccessModal({ inv, booking, onClose }: {
  inv: Record<string, unknown>;
  booking: Booking;
  onClose: () => void;
}) {
  const mongoBookingId = String(inv.booking ?? (booking as unknown as Record<string, unknown>)._id ?? "");
  const [emailSent, setEmailSent] = useState(false);

  const emailMut = useMutation({
    mutationFn: () => invoicesApi.sendEmail(mongoBookingId),
    onSuccess: () => {
      setEmailSent(true);
      toast({ title: "Invoice emailed", description: "Invoice PDF sent to guest's email." });
    },
    onError: () => toast({ title: "Email failed", description: "Could not send email. Try again.", variant: "destructive" }),
  });

  const guestName = booking.user?.name ?? booking.guestDetails?.name ?? "Guest";
  const guestEmail = booking.user?.email ?? booking.guestDetails?.email ?? "";
  const fmt = (n: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
  const d = inv as Record<string, number | string>;

  const handleDownload = async () => {
    if (!mongoBookingId) return;
    const token = localStorage.getItem("adminAccessToken") ?? "";
    const url = invoicesApi.downloadPdfUrl(mongoBookingId);
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast({ title: "Download failed", variant: "destructive" }); return; }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `invoice-${String(d.invoiceNumber ?? "")}.pdf`;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <h2 className="font-display font-bold text-base">Checkout Complete</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Invoice summary */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm space-y-2.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice #</span>
              <span className="font-mono font-semibold">{String(d.invoiceNumber ?? "—")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guest</span>
              <span className="font-semibold">{guestName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room</span>
              <span className="font-semibold">{booking.room?.roomNumber ?? "—"} · {booking.room?.type ?? "—"}</span>
            </div>
            <div className="my-1 border-t border-border/40" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{fmt(Number(d.totalAmount ?? 0))}</span>
            </div>
            {Number(d.discount ?? 0) > 0 && (
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Discount</span>
                <span>− {fmt(Number(d.discount ?? 0))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Advance paid</span>
              <span className="text-muted-foreground">− {fmt(Number(d.advancePaid ?? 0))}</span>
            </div>
            <div className="flex justify-between border-t border-border/40 pt-2">
              <span className="font-semibold">Balance collected</span>
              <span className="font-bold text-success">{fmt(Number(d.balanceDue ?? 0))}</span>
            </div>
            {d.balancePaymentMethod && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Via</span><span className="capitalize">{String(d.balancePaymentMethod)}</span>
              </div>
            )}
          </div>

          {/* Extra charges breakdown */}
          {Array.isArray(d.extraCharges) && (d.extraCharges as unknown[]).length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs space-y-1.5">
              <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Extra Charges</p>
              {(d.extraCharges as Array<{ description: string; amount: number }>).map((c, i) => (
                <div key={i} className="flex justify-between">
                  <span>{c.description}</span><span className="font-semibold">{fmt(c.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <button onClick={handleDownload}
              className="w-full h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:bg-primary/90">
              <Download className="h-4 w-4" /> Download Invoice PDF
            </button>
            {guestEmail && (
              <button onClick={() => emailMut.mutate()} disabled={emailMut.isPending || emailSent}
                className="w-full h-11 rounded-xl border border-primary text-sm font-semibold text-primary flex items-center justify-center gap-2 hover:bg-primary/5 disabled:opacity-50">
                {emailMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : emailSent ? <><CheckCircle2 className="h-4 w-4" /> Sent!</> : <><Send className="h-4 w-4" /> Email to {guestEmail}</>}
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-border/60 px-5 py-4 shrink-0">
          <button onClick={onClose} className="w-full h-10 rounded-xl border border-border text-sm hover:bg-muted">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Shared: Booking detail section ───────────────────────────────────────────
function BookingDetailSection({ b }: { b: Booking }) {
  const guestName = b.user?.name ?? b.guestDetails?.name ?? "Guest";
  const guestEmail = b.user?.email ?? b.guestDetails?.email;
  const guestPhone = b.user?.phone ?? b.guestDetails?.phone;
  const nights = b.nights ?? differenceInDays(new Date(b.checkOutDate), new Date(b.checkInDate));

  return (
    <div className="space-y-4">
      {/* Guest */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <User className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold">{guestName}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {guestEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{guestEmail}</span>}
            {guestPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{guestPhone}</span>}
          </div>
        </div>
        <StatusBadge status={b.status} />
      </div>

      {/* Booking info grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <InfoCell icon={Hash} label="Booking ID" value={b.bookingId} mono />
        <InfoCell icon={BedDouble} label="Room" value={b.room ? `${b.room.roomNumber} · ${b.room.type}` : `${b.roomType} (to be assigned)`} />
        <InfoCell icon={Calendar} label="Check-in" value={format(new Date(b.checkInDate), "EEE, dd MMM yyyy")} />
        <InfoCell icon={Calendar} label="Check-out (Booked)" value={format(new Date(b.checkOutDate), "EEE, dd MMM yyyy")} />
        {b.actualCheckOut && (
          <InfoCell icon={Calendar} label="Check-out (Actual)" value={format(new Date(b.actualCheckOut), "EEE, dd MMM yyyy")} />
        )}
        <InfoCell label="Nights" value={String(nights)} />
        <InfoCell label="Guests" value={String(b.guests)} />
        <InfoCell label="Room rate/night" value={fmtINR(b.room?.price ?? 0)} />
        <InfoCell label="Room subtotal" value={fmtINR(b.subtotal)} />
      </div>

      {b.specialRequests && (
        <div className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          <span className="font-semibold">Special requests: </span>{b.specialRequests}
        </div>
      )}

      {b.source === "offline" && b.guestDetails?.idProof && (
        <div className="text-xs text-muted-foreground">ID Proof: {b.guestDetails.idProof}</div>
      )}
    </div>
  );
}

function InfoCell({ icon: Icon, label, value, mono }: { icon?: React.ElementType; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </p>
      <p className={`mt-0.5 font-semibold text-sm truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

// ── Check-in Dialog ───────────────────────────────────────────────────────────
function CheckInDialog({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: (result: { advancePaid: number; advancePct: number; room: string }) => void }) {
  const qc = useQueryClient();
  const [payMethod, setPayMethod] = useState("cash");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  // If booking has no room assigned yet, fetch available rooms of the required type
  const needsRoomAssignment = !b.room;
  const { data: availRoomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ["assignable-rooms-for-booking", b._id],
    queryFn: () => receptionApi.getAssignableRooms(b._id),
    enabled: needsRoomAssignment,
  });
  const availableRooms = availRoomsData?.data ?? [];

  // Estimate advance (10% default — actual comes from server)
  const estimatedAdvance = Math.round(b.subtotal * 0.1);

  const mutation = useMutation({
    mutationFn: () => receptionApi.checkIn(b.bookingId, payMethod, needsRoomAssignment ? selectedRoomId : undefined),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
      onDone({ advancePaid: res.data.advancePaid, advancePct: res.data.advancePct, room: res.data.room });
      onClose();
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError && err.errors && err.errors.length > 0
        ? err.errors.map((x: any) => x.message).join("\n")
        : err.message || "Failed to check in.";
      toast({ title: "Check-in failed", description: msg, variant: "destructive" });
    }
  });

  const canCheckIn = !needsRoomAssignment || !!selectedRoomId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <LogIn className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold leading-none">Check-in Guest</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Review details and collect advance payment</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          <BookingDetailSection b={b} />

          {/* Room assignment (for type-based online bookings) */}
          {needsRoomAssignment && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-warning shrink-0" />
                <p className="font-semibold text-sm">Assign a Room</p>
              </div>
              <p className="text-xs text-muted-foreground">
                This booking is for <strong>{b.roomType}</strong>. Select an available room to assign.
              </p>
              {roomsLoading ? (
                <p className="text-xs text-muted-foreground">Loading available rooms…</p>
              ) : availableRooms.length === 0 ? (
                <p className="text-xs text-destructive">No rooms available for assignment.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableRooms.map((room) => (
                    <button
                      key={room._id}
                      onClick={() => setSelectedRoomId(room._id)}
                      className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                        selectedRoomId === room._id
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      Room {room.roomNumber}
                      {room.floor && <span className="ml-1 text-xs opacity-70">(Fl {room.floor})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Advance payment */}
          {b.advancePaid > 0 ? (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-success">Advance Payment Paid</p>
                <p className="font-display text-lg font-bold text-success">{fmtINR(b.advancePaid)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                This booking already has a recorded advance payment of {fmtINR(b.advancePaid)} via {b.advancePaymentMethod === "net_banking" ? "Net Banking" : b.advancePaymentMethod?.toUpperCase()}.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Advance Payment (10%)</p>
                <p className="font-display text-lg font-bold text-primary">{fmtINR(estimatedAdvance)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Exact amount will be calculated by the server based on configured advance %.</p>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Payment method</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAY_METHODS.map((m) => (
                    <button key={m} type="button" onClick={() => setPayMethod(m)}
                      className={`h-10 rounded-xl border text-sm font-medium capitalize transition-colors ${payMethod === m ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"}`}>
                      {m === "net_banking" ? "Net Banking" : m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border/60 px-6 py-4 shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !canCheckIn}
            className="flex-1 h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2">
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {b.advancePaid > 0 ? "Confirm Check-in" : "Confirm Check-in & Collect Advance"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Check-out Dialog ──────────────────────────────────────────────────────────
function CheckOutDialog({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: (invoice: Record<string, unknown>) => void }) {
  const qc = useQueryClient();
  const [payMethod, setPayMethod] = useState("cash");
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeAmt, setChargeAmt] = useState("");
  const [chargeCat, setChargeCat] = useState("food");
  const [liveInv, setLiveInv] = useState<InvoicePreview | null>(null);

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["reception-booking-detail", b.bookingId],
    queryFn: () => receptionApi.getBookingDetail(b.bookingId),
  });

  const bookingDetail = detailData?.data ?? b;

  const [customRoomSubtotal, setCustomRoomSubtotal] = useState("");
  const [discount, setDiscount] = useState("0");

  const checkIn = new Date(bookingDetail.actualCheckIn || bookingDetail.checkInDate);
  const today = new Date();
  const nightsStayed = Math.max(1, differenceInDays(today, checkIn));
  const isStayMismatch = nightsStayed !== bookingDetail.nights;
  const suggestedRoomSubtotal = isStayMismatch ? (bookingDetail.room?.price ?? bookingDetail.pricePerNight ?? 0) * nightsStayed : bookingDetail.subtotal;

  useEffect(() => {
    if (bookingDetail) {
      setCustomRoomSubtotal(String(suggestedRoomSubtotal));
    }
  }, [bookingDetail, suggestedRoomSubtotal]);

  const currentRoomSubtotal = Number(customRoomSubtotal) || 0;
  const currentDiscount = Number(discount) || 0;

  const extraCharges = bookingDetail.extraCharges ?? [];
  const inv = liveInv ?? bookingDetail.invoicePreview;

  // Real-time client-side recalculated preview invoice
  const computedLiveInv = inv ? {
    ...inv,
    roomSubtotal: currentRoomSubtotal,
    discount: currentDiscount,
    subtotal: currentRoomSubtotal + inv.extraChargesTotal,
    cgst: Math.round(Math.max(0, currentRoomSubtotal + inv.extraChargesTotal - currentDiscount) * inv.cgstPercentage) / 100,
    sgst: Math.round(Math.max(0, currentRoomSubtotal + inv.extraChargesTotal - currentDiscount) * inv.sgstPercentage) / 100,
    tax: (Math.round(Math.max(0, currentRoomSubtotal + inv.extraChargesTotal - currentDiscount) * inv.cgstPercentage) / 100) +
         (Math.round(Math.max(0, currentRoomSubtotal + inv.extraChargesTotal - currentDiscount) * inv.sgstPercentage) / 100),
    totalAmount: Math.max(0, currentRoomSubtotal + inv.extraChargesTotal - currentDiscount) +
                 (Math.round(Math.max(0, currentRoomSubtotal + inv.extraChargesTotal - currentDiscount) * inv.cgstPercentage) / 100) +
                 (Math.round(Math.max(0, currentRoomSubtotal + inv.extraChargesTotal - currentDiscount) * inv.sgstPercentage) / 100),
    balanceDue: Math.max(0, (Math.max(0, currentRoomSubtotal + inv.extraChargesTotal - currentDiscount) +
                 (Math.round(Math.max(0, currentRoomSubtotal + inv.extraChargesTotal - currentDiscount) * inv.cgstPercentage) / 100) +
                 (Math.round(Math.max(0, currentRoomSubtotal + inv.extraChargesTotal - currentDiscount) * inv.sgstPercentage) / 100)) - bookingDetail.advancePaid),
  } : null;

  const addChargeMut = useMutation({
    mutationFn: () => receptionApi.addCharge(bookingDetail.bookingId, { description: chargeDesc, amount: Number(chargeAmt), category: chargeCat }),
    onSuccess: (res) => {
      setLiveInv(res.data.invoicePreview);
      setChargeDesc(""); setChargeAmt("");
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError && err.errors && err.errors.length > 0
        ? err.errors.map((x: any) => x.message).join("\n")
        : err.message || "Failed to add charge.";
      toast({ title: "Error adding charge", description: msg, variant: "destructive" });
    }
  });

  const removeChargeMut = useMutation({
    mutationFn: (chargeId: string) => receptionApi.removeCharge(bookingDetail.bookingId, chargeId),
    onSuccess: (res) => {
      setLiveInv(res.data.invoicePreview);
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError && err.errors && err.errors.length > 0
        ? err.errors.map((x: any) => x.message).join("\n")
        : err.message || "Failed to remove charge.";
      toast({ title: "Error removing charge", description: msg, variant: "destructive" });
    }
  });

  const [showBillPreview, setShowBillPreview] = useState(false);

  const checkOutMut = useMutation({
    mutationFn: () => receptionApi.checkOut(bookingDetail.bookingId, payMethod, currentRoomSubtotal, currentDiscount),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
      onDone(res.data.invoice as Record<string, unknown>);
      setShowBillPreview(false);
      onClose();
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError && err.errors && err.errors.length > 0
        ? err.errors.map((x: any) => x.message).join("\n")
        : err.message || "Failed to check out.";
      toast({ title: "Checkout failed", description: msg, variant: "destructive" });
    }
  });

  if (detailLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl p-6 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading checkout details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showBillPreview && computedLiveInv && (
        <BillPreviewModal
          inv={computedLiveInv}
          booking={bookingDetail}
          payMethod={payMethod}
          onClose={() => setShowBillPreview(false)}
          onConfirm={() => checkOutMut.mutate()}
          isPending={checkOutMut.isPending}
        />
      )}
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl rounded-2xl bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <LogOut className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold leading-none">Check-out Guest</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Add any final charges, then preview bill before confirming</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          <BookingDetailSection b={bookingDetail} />

          {/* Advance paid badge */}
          {bookingDetail.advancePaid > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm text-success">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>Advance paid: <strong>{fmtINR(bookingDetail.advancePaid)}</strong> via {bookingDetail.advancePaymentMethod}</span>
            </div>
          )}

          {/* Extra charges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Extra Charges</p>
              <span className="text-xs text-muted-foreground">{extraCharges.length} item{extraCharges.length !== 1 ? "s" : ""}</span>
            </div>

            {extraCharges.length > 0 && (
              <div className="space-y-1.5">
                {extraCharges.map((c) => (
                  <div key={c._id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                    <span className="capitalize">{CHARGE_CATS.find(x => x.value === c.category)?.label ?? c.category} — {c.description}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold">{fmtINR(c.amount)}</span>
                      <button onClick={() => removeChargeMut.mutate(c._id)} disabled={removeChargeMut.isPending}
                        className="text-destructive hover:text-destructive/70 disabled:opacity-40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add charge inline form */}
            <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add a charge</p>
              <div className="grid grid-cols-2 gap-2">
                <select value={chargeCat} onChange={(e) => setChargeCat(e.target.value)}
                  className="col-span-2 h-9 rounded-lg border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none">
                  {CHARGE_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} placeholder="Description"
                  className="h-9 rounded-lg border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none" />
                <input type="number" value={chargeAmt} onChange={(e) => setChargeAmt(e.target.value)} placeholder="Amount (₹)"
                  className="h-9 rounded-lg border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none" />
              </div>
              <button onClick={() => addChargeMut.mutate()} disabled={!chargeDesc || !chargeAmt || addChargeMut.isPending}
                className="w-full h-9 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 disabled:opacity-40 flex items-center justify-center gap-1.5">
                {addChargeMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5" /> Add Charge</>}
              </button>
            </div>
          </div>

          {/* Stay Mismatch Warning */}
          {isStayMismatch && (
            <div className={`rounded-xl border p-3.5 text-xs ${
              nightsStayed < bookingDetail.nights
                ? "border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300"
                : "border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300"
            }`}>
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <Calendar className="h-3.5 w-3.5" />
                {nightsStayed < bookingDetail.nights ? "Early Checkout Detected" : "Overstay Stay Detected"}
              </p>
              <p>
                {nightsStayed < bookingDetail.nights
                  ? `The guest is checking out early (stayed ${nightsStayed} night(s) of ${bookingDetail.nights} booked).`
                  : `The guest stayed longer than booked (stayed ${nightsStayed} night(s) of ${bookingDetail.nights} booked).`}
                {" "}Suggested Room Charge: <strong>{fmtINR(suggestedRoomSubtotal)}</strong>.
              </p>
            </div>
          )}

          {/* Adjustments (Room Charge, Discount) */}
          <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
            <p className="text-sm font-semibold">Charges & Discounts</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Room Charge (₹)</label>
                <input
                  type="number"
                  value={customRoomSubtotal}
                  onChange={(e) => setCustomRoomSubtotal(e.target.value)}
                  className="h-9 w-full mt-1.5 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Suggested: {fmtINR(suggestedRoomSubtotal)}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Stay Discount (₹)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="h-9 w-full mt-1.5 rounded-lg border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Direct amount deduction</p>
              </div>
            </div>
          </div>

          {/* Bill summary */}
          {computedLiveInv && (
            <div>
              <p className="mb-2 text-sm font-semibold">Bill Summary</p>
              <InvoicePanel inv={computedLiveInv} advancePaid={bookingDetail.advancePaid} />
            </div>
          )}

          {/* Balance payment method */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-sm font-semibold">Balance Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {PAY_METHODS.map((m) => (
                <button key={m} onClick={() => setPayMethod(m)}
                  className={`h-10 rounded-xl border text-sm font-medium capitalize transition-colors ${payMethod === m ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"}`}>
                  {m === "net_banking" ? "Net Banking" : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border/60 px-6 py-4 shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={() => setShowBillPreview(true)} disabled={!inv}
            className="flex-1 h-11 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-50 flex items-center justify-center gap-2">
            <Receipt className="h-4 w-4" /> Preview Bill & Checkout
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Extend Stay Dialog ───────────────────────────────────────────────────────
function ExtendDialog({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const [newDate, setNewDate] = useState("");

  const minDate = format(new Date(b.checkOutDate), "yyyy-MM-dd");

  const mutation = useMutation({
    mutationFn: () => receptionApi.extendStay(b.bookingId, new Date(newDate).toISOString()),
    onSuccess: () => {
      toast({ title: "Stay extended", description: `Checkout extended to ${format(new Date(newDate), "dd MMM yyyy")}.` });
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
      onDone();
      onClose();
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError && err.errors && err.errors.length > 0
        ? err.errors.map((x: any) => x.message).join("\n")
        : err.message || "Failed to extend stay. Check room availability.";
      toast({
        title: "Extension failed",
        description: msg,
        variant: "destructive"
      });
    }
  });

  const handleExtend = () => {
    if (!newDate) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="font-display font-bold text-base">Extend Stay</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Guest:</strong> {b.user?.name ?? b.guestDetails?.name ?? "Guest"}</p>
            <p><strong>Room:</strong> {b.room ? `${b.room.roomNumber} · ${b.room.type}` : `${b.roomType}`}</p>
            <p><strong>Current Check-out:</strong> {format(new Date(b.checkOutDate), "dd MMM yyyy")}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">New Check-out Date</label>
            <input
              type="date"
              min={minDate}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border/60 px-5 py-4">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={handleExtend} disabled={!newDate || mutation.isPending}
            className="flex-1 h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-1.5">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Booking Card ───────────────────────────────────────────────────────────────
function BookingCard({ b, onAction }: { b: Booking; onAction: () => void }) {
  const isIn = b.status === "checked_in";
  const isConfirmed = b.status === "confirmed";
  const guestName = b.user?.name ?? b.guestDetails?.name ?? "Guest";

  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{ advancePaid: number; advancePct: number } | null>(null);
  const [checkOutResult, setCheckOutResult] = useState<Record<string, unknown> | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // In-card extra charges (for in-house guests without opening checkout)
  const qc = useQueryClient();
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeAmt, setChargeAmt] = useState("");
  const [chargeCat, setChargeCat] = useState("food");
  const [liveInv, setLiveInv] = useState<InvoicePreview | null>(null);

  const addChargeMut = useMutation({
    mutationFn: () => receptionApi.addCharge(b.bookingId, { description: chargeDesc, amount: Number(chargeAmt), category: chargeCat }),
    onSuccess: (res) => {
      setLiveInv(res.data.invoicePreview);
      setChargeDesc(""); setChargeAmt(""); setShowAddCharge(false);
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError && err.errors && err.errors.length > 0
        ? err.errors.map((x: any) => x.message).join("\n")
        : err.message || "Failed to add charge.";
      toast({ title: "Error adding charge", description: msg, variant: "destructive" });
    }
  });

  const removeChargeMut = useMutation({
    mutationFn: (chargeId: string) => receptionApi.removeCharge(b.bookingId, chargeId),
    onSuccess: (res) => {
      setLiveInv(res.data.invoicePreview);
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError && err.errors && err.errors.length > 0
        ? err.errors.map((x: any) => x.message).join("\n")
        : err.message || "Failed to remove charge.";
      toast({ title: "Error removing charge", description: msg, variant: "destructive" });
    }
  });

  const extraCharges = b.extraCharges ?? [];
  const inv = liveInv ?? b.invoicePreview;

  return (
    <>
      {/* Dialogs rendered at root level so they overlay the full page */}
      {showCheckInDialog && (
        <CheckInDialog
          b={b}
          onClose={() => setShowCheckInDialog(false)}
          onDone={(result) => { setCheckInResult(result); onAction(); }}
        />
      )}
      {showCheckOutDialog && (
        <CheckOutDialog
          b={b}
          onClose={() => setShowCheckOutDialog(false)}
          onDone={(invoice) => { setCheckOutResult(invoice); onAction(); }}
        />
      )}
      {showExtendDialog && (
        <ExtendDialog
          b={b}
          onClose={() => setShowExtendDialog(false)}
          onDone={onAction}
        />
      )}
      {showInvoiceModal && checkOutResult && (
        <InvoiceSuccessModal inv={checkOutResult} booking={b} onClose={() => setShowInvoiceModal(false)} />
      )}

      <div className="panel space-y-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display font-semibold">{guestName}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{b.bookingId}</p>
            </div>
          </div>
          <StatusBadge status={b.status} />
        </div>

        {/* Stay info */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 text-xs">
          <div><p className="text-muted-foreground">Room</p><p className="font-semibold">{b.room ? `${b.room.roomNumber} · ${b.room.type}` : `${b.roomType} (unassigned)`}</p></div>
          <div><p className="text-muted-foreground">Nights</p><p className="font-semibold">{b.nights}</p></div>
          <div><p className="text-muted-foreground">Check-in</p><p className="font-semibold">{format(new Date(b.checkInDate), "dd MMM yyyy")}</p></div>
          <div><p className="text-muted-foreground">Check-out</p><p className="font-semibold">{format(new Date(b.checkOutDate), "dd MMM yyyy")}</p></div>
        </div>

        {/* Advance paid badge */}
        {b.advancePaid > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
            <CreditCard className="h-3.5 w-3.5" /> Advance paid: <strong>{fmtINR(b.advancePaid)}</strong> ({b.advancePaymentMethod})
          </div>
        )}

        {/* Check-in success */}
        {checkInResult && (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
            <Banknote className="h-4 w-4" />
            Checked in! Advance collected: <strong>{fmtINR(checkInResult.advancePaid)}</strong> ({checkInResult.advancePct}%)
          </div>
        )}

        {/* Checkout success */}
        {checkOutResult && (
          <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><Receipt className="h-4 w-4" /> Checkout complete</p>
            <p className="text-xs">Invoice #{String(checkOutResult.invoiceNumber ?? "")} · Total: <strong>{fmtINR(Number(checkOutResult.totalAmount ?? 0))}</strong> · Balance: <strong>{fmtINR(Number(checkOutResult.balanceDue ?? 0))}</strong></p>
          </div>
        )}

        {/* In-house: extra charges list */}
        {isIn && extraCharges.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Extra charges</p>
            {extraCharges.map((c) => (
              <div key={c._id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <span className="capitalize">{CHARGE_CATS.find(x => x.value === c.category)?.label ?? c.category} — {c.description}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{fmtINR(c.amount)}</span>
                  <button onClick={() => removeChargeMut.mutate(c._id)} disabled={removeChargeMut.isPending}
                    className="text-destructive hover:text-destructive/80 disabled:opacity-40">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick add charge form (card-level) */}
        {isIn && showAddCharge && (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-xs font-semibold">Add charge</p>
            <select value={chargeCat} onChange={(e) => setChargeCat(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none">
              {CHARGE_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} placeholder="Description"
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none" />
            <input type="number" value={chargeAmt} onChange={(e) => setChargeAmt(e.target.value)} placeholder="Amount (₹)"
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddCharge(false)} className="flex-1 h-8 rounded-lg border border-border text-xs hover:bg-muted">Cancel</button>
              <button onClick={() => addChargeMut.mutate()} disabled={!chargeDesc || !chargeAmt || addChargeMut.isPending}
                className="flex-1 h-8 rounded-lg bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-40 flex items-center justify-center">
                {addChargeMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
              </button>
            </div>
          </div>
        )}

        {/* Live invoice preview (after adding charges from card) */}
        {isIn && inv && !showAddCharge && (
          <InvoicePanel inv={inv} advancePaid={b.advancePaid} />
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          {isConfirmed && !checkInResult && (
            <>
              <button onClick={() => setShowCheckInDialog(true)}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
                <LogIn className="h-3.5 w-3.5" /> Check-in
              </button>
              <button onClick={() => setShowExtendDialog(true)}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs font-medium hover:bg-muted"
                title="Extend booking checkout date">
                <Calendar className="h-3.5 w-3.5" /> Extend
              </button>
            </>
          )}
          {isIn && !checkOutResult && (
            <>
              <button onClick={() => setShowAddCharge(!showAddCharge)}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs font-medium hover:bg-muted">
                <Plus className="h-3.5 w-3.5" /> Add charge
              </button>
              <button onClick={() => setShowExtendDialog(true)}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs font-medium hover:bg-muted">
                <Calendar className="h-3.5 w-3.5" /> Extend stay
              </button>
              <button onClick={() => setShowCheckOutDialog(true)}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/20">
                <LogOut className="h-3.5 w-3.5" /> Check-out
              </button>
            </>
          )}
          {checkOutResult && (
            <button onClick={() => setShowInvoiceModal(true)}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
              <Download className="h-3.5 w-3.5" /> Invoice
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Tab = "confirmed" | "checked_in";

export default function CheckInOut() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) === "checked_in" ? "checked_in" : "confirmed"
  );
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [refresh, setRefresh] = useState(0);

  // Sync URL params if they change (e.g. navigated from global search)
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    const urlQ = searchParams.get("q");
    if (urlTab === "checked_in" || urlTab === "confirmed") setTab(urlTab);
    if (urlQ !== null) setQ(urlQ);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["reception-bookings-active", refresh],
    queryFn: () => receptionApi.getBookings({ status: "confirmed,checked_in", limit: "100" }),
  });

  const all = data?.data ?? [];
  const filtered = all
    .filter((b) => b.status === (tab === "confirmed" ? "confirmed" : "checked_in"))
    .filter((b) =>
      !q ||
      b.bookingId.toLowerCase().includes(q.toLowerCase()) ||
      (b.user?.name ?? b.guestDetails?.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (b.room?.roomNumber ?? "").includes(q)
    );

  const confirmedCount = all.filter((b) => b.status === "confirmed").length;
  const checkedInCount = all.filter((b) => b.status === "checked_in").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Check-in / Check-out" subtitle="Manage guest arrivals, in-stay charges, and departures." />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {(["confirmed", "checked_in"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`h-9 rounded-lg px-4 text-sm font-medium transition-colors ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "confirmed" ? `Arriving (${confirmedCount})` : `In-house (${checkedInCount})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search by booking ID, guest name or room…"
          className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="panel p-10 text-center text-muted-foreground">
          {tab === "confirmed" ? "No arriving guests found." : "No in-house guests found."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b) => (
            <BookingCard key={b._id} b={b} onAction={() => setRefresh((r) => r + 1)} />
          ))}
        </div>
      )}
    </div>
  );
}