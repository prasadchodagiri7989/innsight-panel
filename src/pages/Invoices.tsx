import { useState } from "react";
import { Search, Download, Send, Receipt, Loader2, ChevronLeft, ChevronRight, CheckCircle2, X, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { invoicesApi, adminApi, type Invoice } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const fmtINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={muted ? "text-muted-foreground text-xs" : "text-sm"}>{label}</dt>
      <dd className={`font-mono text-xs ${bold ? "font-bold text-sm" : ""}`}>{value}</dd>
    </div>
  );
}

// ── Invoice Detail Modal ──────────────────────────────────────────────────────
function InvoiceDetailModal({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const mongoBookingId = inv.booking?._id ?? "";
  const [emailSent, setEmailSent] = useState(false);

  const emailMut = useMutation({
    mutationFn: () => invoicesApi.sendEmail(mongoBookingId),
    onSuccess: () => {
      setEmailSent(true);
      toast({ title: "Invoice emailed", description: "Invoice PDF sent to guest's email." });
    },
    onError: () => toast({ title: "Email failed", description: "Could not send email. Try again.", variant: "destructive" }),
  });

  const handleDownload = async () => {
    const token = localStorage.getItem("adminAccessToken") ?? "";
    const url = invoicesApi.downloadPdfUrl(mongoBookingId);
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast({ title: "Download failed", variant: "destructive" }); return; }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `invoice-${inv.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 shrink-0">
          <h2 className="font-display font-bold text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> Invoice #{inv.invoiceNumber}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Guest & stay */}
          <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-1">
            <p className="font-semibold">{inv.user?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{inv.user?.email ?? ""}</p>
            {inv.user?.phone && <p className="text-xs text-muted-foreground">{inv.user.phone}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
              <p className="text-muted-foreground">Booking ID</p>
              <p className="font-mono font-semibold">{inv.booking?.bookingId ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
              <p className="text-muted-foreground">Room</p>
              <p className="font-semibold">{inv.room ? `${inv.room.roomNumber} · ${inv.room.type}` : "—"}</p>
            </div>
            {inv.booking?.checkInDate && (
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                <p className="text-muted-foreground">Check-in</p>
                <p className="font-semibold">{format(new Date(inv.booking.checkInDate), "dd MMM yyyy")}</p>
              </div>
            )}
            {inv.booking?.checkOutDate && (
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                <p className="text-muted-foreground">Check-out (Booked)</p>
                <p className="font-semibold">{format(new Date(inv.booking.checkOutDate), "dd MMM yyyy")}</p>
              </div>
            )}
            {inv.booking?.actualCheckOut && (
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2 col-span-2">
                <p className="text-muted-foreground">Check-out (Actual)</p>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {format(new Date(inv.booking.actualCheckOut), "dd MMM yyyy, hh:mm a")}
                </p>
              </div>
            )}
          </div>

          {/* Bill breakdown */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm space-y-1.5">
            <Row label="Room charges" value={fmtINR(inv.roomSubtotal)} />
            {inv.extraCharges?.map((c, i) => (
              <Row key={i} label={`  ${c.description}`} value={fmtINR(c.amount)} muted />
            ))}
            {inv.extraChargesTotal > 0 && <Row label="Extras subtotal" value={fmtINR(inv.extraChargesTotal)} />}
            <div className="border-t border-border/40 my-1" />
            <Row label="Subtotal" value={fmtINR(inv.subtotal)} />
            <Row label={`CGST (${inv.cgstPercentage}%)`} value={fmtINR(inv.cgst)} muted />
            <Row label={`SGST (${inv.sgstPercentage}%)`} value={fmtINR(inv.sgst)} muted />
            <div className="border-t border-border/40 my-1" />
            <Row label="Total" value={fmtINR(inv.totalAmount)} bold />
            <Row label={`Advance paid (${inv.advancePaymentMethod})`} value={`− ${fmtINR(inv.advancePaid)}`} muted />
            <div className="border-t border-border/40 my-1" />
            <Row label={`Balance due (${inv.balancePaymentMethod})`} value={fmtINR(inv.balanceDue)} bold />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Generated: {format(new Date(inv.generatedAt), "dd MMM yyyy, hh:mm a")}
          </p>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={handleDownload}
              className="w-full h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:bg-primary/90">
              <Download className="h-4 w-4" /> Download PDF
            </button>
            {inv.user?.email && (
              <button onClick={() => emailMut.mutate()} disabled={emailMut.isPending || emailSent || !mongoBookingId}
                className="w-full h-11 rounded-xl border border-primary text-sm font-semibold text-primary flex items-center justify-center gap-2 hover:bg-primary/5 disabled:opacity-50">
                {emailMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : emailSent ? <><CheckCircle2 className="h-4 w-4" /> Sent!</> : <><Send className="h-4 w-4" /> Email to {inv.user.email}</>}
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

// ── Main Invoices Page ────────────────────────────────────────────────────────
export default function Invoices() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);

  const qc = useQueryClient();
  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteInvoice(id),
    onSuccess: () => {
      toast({ title: "Invoice deleted", description: "The invoice record has been deleted." });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: () => {
      toast({ title: "Deletion failed", description: "Could not delete invoice.", variant: "destructive" });
    }
  });

  const handleDeleteInvoice = (id: string, invoiceNumber: string) => {
    if (window.confirm(`Are you sure you want to delete invoice #${invoiceNumber}?`)) {
      deleteInvoiceMutation.mutate(id);
    }
  };

  // Debounce search
  const handleSearch = (val: string) => {
    setQ(val);
    clearTimeout((window as unknown as Record<string, unknown>).__invoiceSearchTimer as ReturnType<typeof setTimeout>);
    (window as unknown as Record<string, unknown>).__invoiceSearchTimer = setTimeout(() => {
      setDebouncedQ(val);
      setPage(1);
    }, 400);
  };

  const params: Record<string, string> = { page: String(page), limit: "15" };
  if (debouncedQ) params.search = debouncedQ;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", params],
    queryFn: () => invoicesApi.list(params),
    staleTime: 30_000,
  });

  const invoices = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {selectedInv && (
        <InvoiceDetailModal inv={selectedInv} onClose={() => setSelectedInv(null)} />
      )}

      <PageHeader title="Invoices" subtitle="View, download, and email generated invoices." />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by invoice #, booking ID, or guest name…"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}
              className="h-11 px-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted">
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices…
        </div>
      ) : invoices.length === 0 ? (
        <div className="panel p-10 text-center text-muted-foreground">
          No invoices found.
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Check-out</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {invoices.map((inv) => (
                  <InvoiceRow
                    key={inv._id}
                    inv={inv}
                    onView={() => setSelectedInv(inv)}
                    onDelete={() => handleDeleteInvoice(inv._id, inv.invoiceNumber)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, meta.total)} of {meta.total} invoices
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                  className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="h-8 px-3 flex items-center text-xs font-medium">{page} / {meta.pages}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= meta.pages}
                  className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InvoiceRow({ inv, onView, onDelete }: { inv: Invoice; onView: () => void; onDelete: () => void }) {
  const [emailSent, setEmailSent] = useState(false);
  const mongoBookingId = inv.booking?._id ?? "";

  const emailMut = useMutation({
    mutationFn: () => invoicesApi.sendEmail(mongoBookingId),
    onSuccess: () => {
      setEmailSent(true);
      toast({ title: "Emailed", description: `Invoice sent to ${inv.user?.email}` });
    },
    onError: () => toast({ title: "Failed", description: "Could not send email.", variant: "destructive" }),
  });

  const handleDownload = async () => {
    const token = localStorage.getItem("adminAccessToken") ?? "";
    const url = invoicesApi.downloadPdfUrl(mongoBookingId);
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast({ title: "Download failed", variant: "destructive" }); return; }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `invoice-${inv.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
        <button onClick={onView} className="hover:underline">{inv.invoiceNumber}</button>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium">{inv.user?.name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{inv.user?.email ?? ""}</p>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.booking?.bookingId ?? "—"}</td>
      <td className="px-4 py-3 text-xs">{inv.room ? `${inv.room.roomNumber} · ${inv.room.type}` : "—"}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {inv.booking?.checkOutDate ? (
          <>
            <div>{format(new Date(inv.booking.checkOutDate), "dd MMM yyyy")}</div>
            {inv.booking.actualCheckOut && (
              <div className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                Act: {format(new Date(inv.booking.actualCheckOut), "dd MMM yyyy")}
              </div>
            )}
          </>
        ) : "—"}
      </td>
      <td className="px-4 py-3 text-right font-semibold">{fmtINR(inv.totalAmount)}</td>
      <td className="px-4 py-3 text-right">
        <span className={`font-semibold ${inv.balanceDue > 0 ? "text-destructive" : "text-success"}`}>
          {inv.balanceDue > 0 ? fmtINR(inv.balanceDue) : "Paid"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button onClick={handleDownload} title="Download PDF"
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground">
            <Download className="h-3.5 w-3.5" />
          </button>
          {inv.user?.email && (
            <button onClick={() => emailMut.mutate()} disabled={emailMut.isPending || emailSent || !mongoBookingId}
              title={emailSent ? "Sent!" : `Email to ${inv.user.email}`}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40">
              {emailMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : emailSent ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Send className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          )}
          <button onClick={onView} title="View invoice"
            className="h-8 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted">
            View
          </button>
          <button onClick={onDelete} title="Delete invoice"
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
