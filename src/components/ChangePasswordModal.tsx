import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, ApiError } from "@/lib/api";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPw.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPw !== confirmPw) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      toast.success("Password changed successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to update password. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-0 shadow-elevated">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display text-xl font-semibold">
            Change Password
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Update your account password.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <Label>Current Password</Label>
            <Input
              type="password"
              className="mt-1.5 h-10 rounded-xl"
              value={currentPw}
              onChange={(e) => { setCurrentPw(e.target.value); setError(""); }}
              required
            />
          </div>

          <div>
            <Label>New Password</Label>
            <div className="relative mt-1.5">
              <Input
                type={showPassword ? "text" : "password"}
                className="h-10 rounded-xl pr-10"
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setError(""); }}
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
          </div>

          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              className="mt-1.5 h-10 rounded-xl"
              value={confirmPw}
              onChange={(e) => { setConfirmPw(e.target.value); setError(""); }}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
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
              Update password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
