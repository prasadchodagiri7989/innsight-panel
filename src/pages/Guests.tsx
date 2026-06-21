import { useState } from "react";
import { Search, Eye, Mail, Phone, Loader2, Key, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminApi, ApiError } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface AdminChangePasswordModalProps {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

const AdminChangePasswordModal = ({ user, onClose, onSuccess }: AdminChangePasswordModalProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGeneratePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await adminApi.changeUserPassword(user._id, { password });
      toast.success(`Updated password for ${user.name}`);
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.errors && err.errors.length > 0 ? err.errors.map(x => x.message).join("\n") : err.message);
      }
      else setError("Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-0 shadow-elevated">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display text-xl font-semibold">
            Change Guest Password
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Update the password for <strong>{user?.name}</strong>.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <Label>New Password</Label>
            <div className="relative mt-1.5 flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  className="h-10 rounded-xl pr-10"
                  placeholder="Enter or generate a new password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl px-3"
                onClick={handleGeneratePassword}
              >
                Generate
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Minimum 8 characters. Toggle the eye icon to view the password you are setting.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-xs text-destructive whitespace-pre-wrap">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-full bg-primary text-primary-foreground shadow-soft"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function Guests() {
  const [q, setQ] = useState("");
  const { user: currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const qc = useQueryClient();
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success("Guest account deleted successfully.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError && err.errors && err.errors.length > 0
        ? err.errors.map((x: any) => x.message).join("\n")
        : err instanceof ApiError ? err.message : "Failed to delete guest account.";
      toast.error(<span className="whitespace-pre-wrap">{msg}</span>);
    }
  });

  const handleDeleteUser = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const params: Record<string, string> = { role: "user", limit: "100" };
  if (q) params.search = q;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-users", params],
    queryFn: () => adminApi.getUsers(params),
  });

  const users = data?.data ?? [];
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader title="Guest records" subtitle="Search and view guest profiles." />
      <div className="panel overflow-hidden">
        <div className="border-b border-border/60 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, phone, or email…"
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading guests…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Guest</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Tier</th>
                  <th className="px-5 py-3 font-medium">Total stays</th>
                  <th className="px-5 py-3 font-medium">Member since</th>
                  {isAdmin && <th className="px-5 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 6 : 5} className="px-5 py-10 text-center text-muted-foreground">No guests found.</td></tr>
                ) : users.map((g) => (
                  <tr key={g._id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-xs font-semibold text-primary">
                          {g.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium">{g.name}</p>
                          <p className="text-[11px] text-muted-foreground">{g._id.slice(-8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {g.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {g.phone}</p>}
                      <p className="flex items-center gap-1.5 text-xs"><Mail className="h-3 w-3" /> {g.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {g.loyaltyTier && <span className="chip bg-primary-soft text-primary">{g.loyaltyTier}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{g.totalStays ?? 0} stays</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{g.memberSince ?? (g.createdAt ? new Date(g.createdAt).getFullYear() : "—")}</td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUser(g)}
                            className="h-8 rounded-lg text-primary hover:text-primary hover:bg-primary-soft"
                          >
                            <Key className="h-3.5 w-3.5 mr-1" /> Reset PW
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(g._id, g.name)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete guest record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminChangePasswordModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onSuccess={refetch}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="font-display text-lg font-bold">Delete Guest Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground text-center">
              Are you sure you want to delete guest account for <strong className="text-foreground">{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-4">
            <AlertDialogCancel className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteUserMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="flex-1 h-10 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              {deleteUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}