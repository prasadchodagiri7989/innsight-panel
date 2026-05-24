import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi, Payment, ApiError } from "@/lib/api";
import { format } from "date-fns";
import {
  RefreshCw, Search, Filter, RotateCcw, CheckCircle2,
  Clock, XCircle, IndianRupee, CreditCard, Banknote,
  AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  paid:                { label: "Paid",             variant: "default",     icon: CheckCircle2 },
  pending:             { label: "Pending",          variant: "secondary",   icon: Clock },
  failed:              { label: "Failed",           variant: "destructive", icon: XCircle },
  refunded:            { label: "Refunded",         variant: "outline",     icon: RotateCcw },
  partially_refunded:  { label: "Part. Refunded",   variant: "outline",     icon: RotateCcw },
};

const METHOD_ICON: Record<string, React.ElementType> = {
  razorpay:    CreditCard,
  upi:         CreditCard,
  cash:        Banknote,
  card:        CreditCard,
  net_banking: CreditCard,
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: "secondary" as const, icon: AlertCircle };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1 capitalize">
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}

// ── Refund Dialog ─────────────────────────────────────────────────────────────
function RefundDialog({
  payment,
  open,
  onClose,
}: {
  payment: Payment | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reason, setReason] = useState("Refund requested by guest");
  const [amount, setAmount] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      paymentsApi.refund(
        payment!._id,
        reason,
        amount ? parseFloat(amount) : undefined
      ),
    onSuccess: () => {
      toast({ title: "Refund processed", description: "The refund has been initiated successfully." });
      qc.invalidateQueries({ queryKey: ["payments"] });
      onClose();
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Refund failed";
      toast({ title: "Refund failed", description: msg, variant: "destructive" });
    },
  });

  if (!payment) return null;
  const maxRefund = payment.amount;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-muted/60 p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guest</span>
              <span className="font-medium">{payment.user?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking</span>
              <span className="font-medium">{payment.booking?.bookingId ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid amount</span>
              <span className="font-medium">₹{payment.amount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="font-medium capitalize">{payment.method}</span>
            </div>
          </div>
          <div>
            <Label>Refund amount (leave blank for full refund)</Label>
            <div className="relative mt-1.5">
              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 h-11 rounded-xl"
                type="number"
                min={1}
                max={maxRefund}
                placeholder={`Max ₹${maxRefund.toLocaleString("en-IN")}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea
              className="mt-1.5 rounded-xl resize-none"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {payment.method === "razorpay" && (
            <p className="text-xs text-muted-foreground rounded-lg bg-blue-50 px-3 py-2">
              This will trigger an automatic refund via Razorpay to the guest's original payment method.
            </p>
          )}
          {payment.method !== "razorpay" && (
            <p className="text-xs text-muted-foreground rounded-lg bg-amber-50 px-3 py-2">
              Offline payment — this will mark the payment as refunded. Please return cash/card manually.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? "Processing…" : "Confirm Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Payments() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (status !== "all") params.status = status;
  if (method !== "all") params.method = method;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (search) params.search = search;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payments", params],
    queryFn: () => paymentsApi.getAll(params),
  });

  const payments: Payment[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta ?? { total: 0, pages: 1 };

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalRefunded = payments.filter((p) => ["refunded", "partially_refunded"].includes(p.status)).reduce((s, p) => s + (p.refundAmount ?? p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Transactions</h1>
          <p className="text-sm text-muted-foreground">View and manage all payment records</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl gap-1.5">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Records", value: String(meta.total), icon: IndianRupee, color: "text-foreground" },
          { label: "Paid (this page)", value: `₹${totalPaid.toLocaleString("en-IN")}`, icon: CheckCircle2, color: "text-green-600" },
          { label: "Refunded (this page)", value: `₹${totalRefunded.toLocaleString("en-IN")}`, icon: RotateCcw, color: "text-orange-600" },
          { label: "Pending (this page)", value: String(payments.filter((p) => p.status === "pending").length), icon: Clock, color: "text-yellow-600" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              {c.label}
            </div>
            <div className={`mt-1.5 text-xl font-semibold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9 rounded-lg text-sm"
            placeholder="Booking ID, guest name, txn ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[140px] rounded-lg text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="partially_refunded">Part. Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[130px] rounded-lg text-sm"><SelectValue placeholder="Method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="razorpay">Razorpay</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="net_banking">Net Banking</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="h-9 w-[140px] rounded-lg text-sm" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
        <Input type="date" className="h-9 w-[140px] rounded-lg text-sm" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
        {(search || status !== "all" || method !== "all" || startDate || endDate) && (
          <Button variant="ghost" size="sm" className="h-9 rounded-lg text-xs" onClick={() => { setSearch(""); setStatus("all"); setMethod("all"); setStartDate(""); setEndDate(""); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading transactions…</div>
        ) : isError ? (
          <div className="flex items-center justify-center py-20 text-destructive text-sm">Failed to load. <Button variant="link" size="sm" onClick={() => refetch()}>Retry</Button></div>
        ) : payments.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  {["Date", "Booking ID", "Guest", "Method", "Amount", "Status", "Txn ID / Razorpay ID", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => {
                  const MethodIcon = METHOD_ICON[p.method] ?? CreditCard;
                  const canRefund = p.status === "paid";
                  return (
                    <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {p.paidAt ? format(new Date(p.paidAt), "dd MMM yy, HH:mm") : format(new Date(p.createdAt), "dd MMM yy, HH:mm")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {p.booking?.bookingId ?? "—"}
                        </span>
                        {p.booking?.roomType && (
                          <div className="text-[11px] text-muted-foreground">{p.booking.roomType}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.user?.name ?? "Guest"}</div>
                        <div className="text-[11px] text-muted-foreground">{p.user?.phone ?? p.user?.email ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 capitalize">
                          <MethodIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.method.replace("_", " ")}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold">
                        ₹{p.amount.toLocaleString("en-IN")}
                        {p.refundAmount ? (
                          <div className="text-[11px] text-orange-600">-₹{p.refundAmount.toLocaleString("en-IN")} refund</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="font-mono text-[11px] text-muted-foreground truncate block">
                          {p.razorpayPaymentId ?? p.transactionId ?? "—"}
                        </span>
                        {p.refundId && (
                          <span className="font-mono text-[11px] text-orange-600 truncate block">R: {p.refundId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {canRefund ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => setRefundTarget(p)}
                          >
                            <RotateCcw className="h-3 w-3" /> Refund
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, meta.total)} of {meta.total}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 rounded-lg gap-1">
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground">Page {page} / {meta.pages}</span>
            <Button size="sm" variant="outline" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)} className="h-8 rounded-lg gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <RefundDialog payment={refundTarget} open={!!refundTarget} onClose={() => setRefundTarget(null)} />
    </div>
  );
}
