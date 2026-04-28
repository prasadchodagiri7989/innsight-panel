import { useState } from "react";
import { BedDouble, Wifi, Snowflake, Tv, Wine, Sparkles, Loader2, Pencil, X, Plus, Trash2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminApi, type Room } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const amenityIcon: Record<string, typeof Wifi> = { WiFi: Wifi, AC: Snowflake, TV: Tv, "Mini Bar": Wine, "Mini-bar": Wine, Lounge: Sparkles };
const fmtINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(n);

const ROOM_TYPES = ["Deluxe Non AC", "Deluxe AC", "Suite"];
const AMENITY_OPTIONS = ["WiFi", "AC", "TV", "Hot Water", "Mini Bar", "Room Heater", "Balcony", "Sea View", "Lounge", "Breakfast"];

// ── Add Room Modal ────────────────────────────────────────────────────────────
function AddRoomModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    roomNumber: "",
    floor: "1",
    type: "Deluxe AC",
    price: "",
    capacity: "2",
    beds: "",
    size: "",
    description: "",
    amenities: [] as string[],
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createRoom({
        roomNumber: form.roomNumber,
        floor: Number(form.floor),
        type: form.type,
        price: Number(form.price),
        capacity: Number(form.capacity),
        beds: form.beds,
        size: form.size,
        description: form.description,
        amenities: form.amenities,
      } as Parameters<typeof adminApi.createRoom>[0]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleAmenity = (a: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="font-display text-lg font-bold">Add New Room</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Room number *" value={form.roomNumber} onChange={(v) => setForm(f => ({ ...f, roomNumber: v }))} />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Floor *</label>
              <select value={form.floor} onChange={(e) => setForm(f => ({ ...f, floor: e.target.value }))}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none">
                {["1","2","3"].map((n) => <option key={n} value={n}>Floor {n}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Room type *</label>
              <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none">
                {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Field label="Price per night (₹) *" type="number" value={form.price} onChange={(v) => setForm(f => ({ ...f, price: v }))} />
            <Field label="Capacity (guests)" type="number" value={form.capacity} onChange={(v) => setForm(f => ({ ...f, capacity: v }))} />
            <Field label="Bed type (e.g. King)" value={form.beds} onChange={(v) => setForm(f => ({ ...f, beds: v }))} />
            <Field label="Room size (e.g. 28m²)" value={form.size} onChange={(v) => setForm(f => ({ ...f, size: v }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${form.amenities.includes(a) ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-border/60 px-6 py-4">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.roomNumber || !form.price}
            className="flex-1 h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add Room</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => adminApi.deleteRoom(room._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl">
        <div className="p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="font-display text-lg font-bold">Delete Room {room.roomNumber}?</h2>
          <p className="text-sm text-muted-foreground">This room will be deactivated. Rooms with active bookings cannot be deleted.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex gap-3 border-t border-border/60 px-6 py-4">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-60 flex items-center justify-center gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4" /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}



function EditRoomModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    price: String(room.price),
    capacity: String(room.capacity),
    size: room.size ?? "",
    beds: room.beds ?? "",
    description: room.description ?? "",
    amenities: [...room.amenities],
    status: room.status,
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateRoom(room._id, {
        price: Number(form.price),
        capacity: Number(form.capacity),
        size: form.size,
        beds: form.beds,
        description: form.description,
        amenities: form.amenities,
        status: form.status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleAmenity = (a: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="font-display text-lg font-bold">Edit Room {room.roomNumber}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price per night (₹)" type="number" value={form.price} onChange={(v) => setForm(f => ({ ...f, price: v }))} />
            <Field label="Capacity (guests)" type="number" value={form.capacity} onChange={(v) => setForm(f => ({ ...f, capacity: v }))} />
            <Field label="Bed type (e.g. King)" value={form.beds} onChange={(v) => setForm(f => ({ ...f, beds: v }))} />
            <Field label="Room size (e.g. 28m²)" value={form.size} onChange={(v) => setForm(f => ({ ...f, size: v }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
            <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none">
              {["available","occupied","maintenance","reserved"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${form.amenities.includes(a) ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-border/60 px-6 py-4">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
    </div>
  );
}

export default function Rooms() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-rooms"], queryFn: () => adminApi.getRooms() });
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState<Room | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const rooms = data?.data ?? [];

  return (
    <div className="space-y-6">
      {editing && <EditRoomModal room={editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteConfirmModal room={deleting} onClose={() => setDeleting(null)} />}
      {showAdd && <AddRoomModal onClose={() => setShowAdd(false)} />}
      <PageHeader
        title="Rooms"
        subtitle="Manage room inventory, pricing, amenities and status."
        actions={
          <button onClick={() => setShowAdd(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 hover:shadow-elevated">
            <Plus className="h-4 w-4" /> Add Room
          </button>
        }
      />
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((r) => (
            <div key={r._id} className="panel overflow-hidden transition-all hover:shadow-elevated">
              <div className="flex h-28 items-center justify-center bg-gradient-soft">
                <BedDouble className="h-10 w-10 text-primary/40" strokeWidth={1.5} />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-bold leading-tight">Room {r.roomNumber}</p>
                    <p className="text-xs text-muted-foreground">{r.type} · Floor {r.floor} · {r.beds || "—"}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.amenities.slice(0, 4).map((a) => {
                    const Icon = amenityIcon[a] ?? Sparkles;
                    return (
                      <span key={a} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        <Icon className="h-3 w-3" />{a}
                      </span>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Per night</p>
                    <p className="font-display text-lg font-bold">{fmtINR(r.price)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditing(r)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium hover:bg-muted">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => setDeleting(r)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/20">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}