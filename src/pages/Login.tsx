import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-elevated">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Hotel Abhijeeth INN
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Staff portal — Admin &amp; Reception</p>
        </div>

        {/* Card */}
        <div className="panel p-8">
          <h2 className="mb-6 font-display text-xl font-semibold">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hotelabhitejinn.com"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-12 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-muted/60 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Demo credentials</p>
            <p className="mt-1">Admin: <span className="font-mono">admin@hotelabhitejinn.com</span> / <span className="font-mono">Admin@1234</span></p>
            <p className="mt-0.5">Reception: <span className="font-mono">reception@hotelabhitejinn.com</span> / <span className="font-mono">Recept@1234</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
