import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { receptionApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { differenceInCalendarDays } from "date-fns";

const fmtINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(n);

function Field({ label, placeholder, type = "text", value, onChange }: {
  label: string; placeholder?: string; type?: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
    </div>
  );
}

export default function WalkIn() {
  const [form, setForm] = useState({
    guestName: "", phone: "", email: "", idProof: "",
    checkIn: "", checkOut: "", roomId: "", notes: "", guests: "2",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: roomsData } = useQuery({
    queryKey: ["reception-rooms"],
    queryFn: () => receptionApi.getRooms(),
  });

  const available = (roomsData?.data ?? []).filter((r) => r.status === "available");

  const selectedRoom = available.find((r) => r._id === form.roomId) ?? available[0];
  const nights = form.checkIn && form.checkOut
    ? Math.max(0, differenceInCalendarDays(new Date(form.checkOut), new Date(form.checkIn)))
    : 0;
  const subtotal = selectedRoom ? selectedRoom.price * nights : 0;
  const tax = Math.round(subtotal * 0.12);

  const mutation = useMutation({
    mutationFn: () => receptionApi.createOfflineBooking({
      roomId: form.roomId || selectedRoom?._id || "",
      checkInDate: form.checkIn,
      checkOutDate: form.checkOut,
      guests: Number(form.guests),
      guestDetails: { name: form.guestName, email: form.email, phone: form.phone, idProof: form.idProof || undefined },
      specialRequests: form.notes || undefined,
      source: "offline",
    }),
    onSuccess: (res) => {
      setSuccess(`Booking created: ${res.data.bookingId}`);
      setError("");
      setForm({ guestName:"",phone:"",email:"",idProof:"",checkIn:"",checkOut:"",roomId:"",notes:"",guests:"2" });
    },
    onError: (e: any) => { setError(e.message); setSuccess(""); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.guestName || !form.phone || !form.checkIn || !form.checkOut) {
      setError("Guest name, phone, check-in and check-out are required."); return;
    }
    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Walk-in booking" subtitle="Quickly create a booking for a guest at the front desk." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="panel space-y-5 p-6 lg:col-span-2">
          {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          {success && <div className="rounded-xl bg-success/10 p-3 text-sm text-success">{success}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Guest name *" placeholder="e.g. Aarav Sharma" value={form.guestName} onChange={(v) => setForm(f=>({...f,guestName:v}))} />
            <Field label="Phone *" placeholder="+91 98xxx xxxxx" value={form.phone} onChange={(v) => setForm(f=>({...f,phone:v}))} />
            <Field label="Email (optional)" placeholder="guest@example.com" type="email" value={form.email} onChange={(v) => setForm(f=>({...f,email:v}))} />
            <Field label="ID proof" placeholder="Aadhaar / Passport no." value={form.idProof} onChange={(v) => setForm(f=>({...f,idProof:v}))} />
            <Field label="Check-in date *" type="date" value={form.checkIn} onChange={(v) => setForm(f=>({...f,checkIn:v}))} />
            <Field label="Check-out date *" type="date" value={form.checkOut} onChange={(v) => setForm(f=>({...f,checkOut:v}))} />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Select room</label>
              <select value={form.roomId || selectedRoom?._id || ""}
                onChange={(e) => setForm(f=>({...f,roomId:e.target.value}))}
                className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10">
                {available.map((r) => (
                  <option key={r._id} value={r._id}>Room {r.roomNumber} · {r.type} · {fmtINR(r.price)}/night</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Guests</label>
              <select value={form.guests} onChange={(e) => setForm(f=>({...f,guests:e.target.value}))}
                className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none">
                {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
              <textarea rows={3} value={form.notes} onChange={(e) => setForm(f=>({...f,notes:e.target.value}))}
                placeholder="Special requests, arrival time, etc."
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-5">
            <button type="button" onClick={() => setForm({guestName:"",phone:"",email:"",idProof:"",checkIn:"",checkOut:"",roomId:"",notes:"",guests:"2"})}
              className="h-11 rounded-xl border border-border bg-card px-5 text-sm font-medium hover:bg-muted">Clear</button>
            <button type="submit" disabled={mutation.isPending}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90 disabled:opacity-60">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create booking
            </button>
          </div>
        </form>
        <div className="panel p-6">
          <h3 className="font-display text-base font-semibold">Summary</h3>
          <p className="mb-5 text-xs text-muted-foreground">Live preview of the booking.</p>
          <dl className="space-y-3 text-sm">
            {[
              ["Available rooms", String(available.length)],
              ["Selected room", selectedRoom ? `#${selectedRoom.roomNumber}` : "—"],
              ["Nights", String(nights)],
              ["Subtotal", fmtINR(subtotal)],
              ["Taxes (12%)", fmtINR(tax)],
              ["Total", fmtINR(subtotal + tax)],
            ].map(([l,v]) => (
              <div key={l} className="flex justify-between">
                <dt className="text-muted-foreground">{l}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}