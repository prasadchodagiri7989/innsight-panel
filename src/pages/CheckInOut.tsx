import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, LogIn, LogOut, Plus, Trash2, User, Loader2, Receipt, CreditCard, Banknote, Printer, X, BedDouble, Calendar, Hash, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { receptionApi, type Booking, type InvoicePreview } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";

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

// ── Printable Invoice Modal ───────────────────────────────────────────────────
function PrintInvoiceModal({ inv, booking, onClose }: {
  inv: Record<string, unknown>;
  booking: Booking;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const guestName = booking.user?.name ?? booking.guestDetails?.name ?? "Guest";

  const doPrint = () => {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Invoice</title><style>
      body{font-family:sans-serif;padding:32px;color:#111}
      h1{font-size:22px;margin:0 0 4px}
      .sub{color:#666;font-size:13px;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      td,th{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}
      th{background:#f9fafb;text-align:left;font-weight:600}
      .right{text-align:right}.bold{font-weight:700}.total{font-size:15px}
      .footer{margin-top:24px;color:#666;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px}
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const fmt = (n: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
  const invoiceData = inv as Record<string, number | string>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="font-display font-bold flex items-center gap-2"><Receipt className="h-4 w-4" /> Invoice</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div ref={printRef}>
            <h1>Hotel Abhitej Inn</h1>
            <p className="sub">Invoice #{String(invoiceData.invoiceNumber ?? "")}</p>
            <table>
              <tbody>
                <tr><th>Guest</th><td className="right">{guestName}</td></tr>
                <tr><th>Booking ID</th><td className="right">{booking.bookingId}</td></tr>
                <tr><th>Room</th><td className="right">{booking.room?.roomNumber} · {booking.room?.type}</td></tr>
                <tr><th>Check-in</th><td className="right">{booking.checkInDate ? format(new Date(booking.checkInDate), "dd MMM yyyy") : "—"}</td></tr>
                <tr><th>Check-out</th><td className="right">{booking.checkOutDate ? format(new Date(booking.checkOutDate), "dd MMM yyyy") : "—"}</td></tr>
              </tbody>
            </table>
            <table>
              <thead><tr><th>Description</th><th className="right">Amount</th></tr></thead>
              <tbody>
                <tr><td>Room charges ({booking.nights} nights)</td><td className="right">{fmt(Number(invoiceData.roomSubtotal ?? booking.subtotal))}</td></tr>
                {(invoiceData.extraChargesTotal as number) > 0 && (
                  <tr><td>Extra charges</td><td className="right">{fmt(Number(invoiceData.extraChargesTotal))}</td></tr>
                )}
                <tr><td>CGST ({invoiceData.cgstPercentage}%)</td><td className="right">{fmt(Number(invoiceData.cgst ?? 0))}</td></tr>
                <tr><td>SGST ({invoiceData.sgstPercentage}%)</td><td className="right">{fmt(Number(invoiceData.sgst ?? 0))}</td></tr>
                <tr className="bold total"><td>Total</td><td className="right">{fmt(Number(invoiceData.totalAmount ?? booking.totalAmount))}</td></tr>
                <tr><td>Advance paid ({booking.advancePaymentMethod})</td><td className="right">- {fmt(booking.advancePaid)}</td></tr>
                <tr className="bold total"><td>Balance due ({String(invoiceData.balancePaymentMethod ?? "—")})</td><td className="right">{fmt(Number(invoiceData.balanceDue ?? 0))}</td></tr>
              </tbody>
            </table>
            <p className="footer">Thank you for staying with us! — Hotel Abhitej Inn</p>
          </div>
        </div>
        <div className="flex gap-3 border-t border-border/60 px-6 py-4">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm hover:bg-muted">Close</button>
          <button onClick={doPrint}
            className="flex-1 h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2">
            <Printer className="h-4 w-4" /> Print
          </button>
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
        <InfoCell icon={BedDouble} label="Room" value={`${b.room?.roomNumber ?? "—"} · ${b.room?.type ?? ""}`} />
        <InfoCell icon={Calendar} label="Check-in" value={format(new Date(b.checkInDate), "EEE, dd MMM yyyy")} />
        <InfoCell icon={Calendar} label="Check-out" value={format(new Date(b.checkOutDate), "EEE, dd MMM yyyy")} />
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
function CheckInDialog({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: (result: { advancePaid: number; advancePct: number }) => void }) {
  const qc = useQueryClient();
  const [payMethod, setPayMethod] = useState("cash");

  // Estimate advance (10% default — actual comes from server)
  const estimatedAdvance = Math.round(b.subtotal * 0.1);

  const mutation = useMutation({
    mutationFn: () => receptionApi.checkIn(b.bookingId, payMethod),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
      onDone(res.data);
      onClose();
    },
  });

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

          {/* Advance payment */}
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
                  <button key={m} onClick={() => setPayMethod(m)}
                    className={`h-10 rounded-xl border text-sm font-medium capitalize transition-colors ${payMethod === m ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"}`}>
                    {m === "net_banking" ? "Net Banking" : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border/60 px-6 py-4 shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4" /> Confirm Check-in & Collect Advance</>}
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

  const extraCharges = b.extraCharges ?? [];
  const inv = liveInv ?? b.invoicePreview;

  const addChargeMut = useMutation({
    mutationFn: () => receptionApi.addCharge(b.bookingId, { description: chargeDesc, amount: Number(chargeAmt), category: chargeCat }),
    onSuccess: (res) => {
      setLiveInv(res.data.invoicePreview);
      setChargeDesc(""); setChargeAmt("");
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
    },
  });

  const removeChargeMut = useMutation({
    mutationFn: (chargeId: string) => receptionApi.removeCharge(b.bookingId, chargeId),
    onSuccess: (res) => {
      setLiveInv(res.data.invoicePreview);
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
    },
  });

  const checkOutMut = useMutation({
    mutationFn: () => receptionApi.checkOut(b.bookingId, payMethod),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
      onDone(res.data.invoice as Record<string, unknown>);
      onClose();
    },
  });

  return (
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
              <p className="text-xs text-muted-foreground mt-0.5">Add any final charges, collect balance payment</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          <BookingDetailSection b={b} />

          {/* Advance paid badge */}
          {b.advancePaid > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm text-success">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>Advance paid: <strong>{fmtINR(b.advancePaid)}</strong> via {b.advancePaymentMethod}</span>
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

          {/* Bill summary */}
          {inv && (
            <div>
              <p className="mb-2 text-sm font-semibold">Final Bill</p>
              <InvoicePanel inv={inv} advancePaid={b.advancePaid} />
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
          <button onClick={() => checkOutMut.mutate()} disabled={checkOutMut.isPending}
            className="flex-1 h-11 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-50 flex items-center justify-center gap-2">
            {checkOutMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Complete Check-out</>}
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
  });

  const removeChargeMut = useMutation({
    mutationFn: (chargeId: string) => receptionApi.removeCharge(b.bookingId, chargeId),
    onSuccess: (res) => {
      setLiveInv(res.data.invoicePreview);
      qc.invalidateQueries({ queryKey: ["reception-bookings-active"] });
    },
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
      {showInvoiceModal && checkOutResult && (
        <PrintInvoiceModal inv={checkOutResult} booking={b} onClose={() => setShowInvoiceModal(false)} />
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
          <div><p className="text-muted-foreground">Room</p><p className="font-semibold">{b.room?.roomNumber ?? "—"} · {b.room?.type}</p></div>
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
            <button onClick={() => setShowCheckInDialog(true)}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
              <LogIn className="h-3.5 w-3.5" /> Check-in
            </button>
          )}
          {isIn && !checkOutResult && (
            <>
              <button onClick={() => setShowAddCharge(!showAddCharge)}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs font-medium hover:bg-muted">
                <Plus className="h-3.5 w-3.5" /> Add charge
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
              <Printer className="h-3.5 w-3.5" /> Print Invoice
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