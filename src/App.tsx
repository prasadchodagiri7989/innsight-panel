import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Rooms from "./pages/Rooms";
import Pricing from "./pages/Pricing";
import Guests from "./pages/Guests";
import Reports from "./pages/Reports";
import Staff from "./pages/Staff";
import Settings from "./pages/Settings";
import WalkIn from "./pages/WalkIn";
import CheckInOut from "./pages/CheckInOut";
import Allocation from "./pages/Allocation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

/** Redirects to /login if not authenticated; shows loading while checking */
function RequireAuth({ children, allow }: { children: React.ReactNode; allow?: ("admin" | "receptionist")[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role as "admin" | "receptionist")) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">Loading…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={<RequireAuth><AppLayout><Dashboard /></AppLayout></RequireAuth>} />

      {/* Admin-only */}
      <Route path="/bookings" element={<RequireAuth allow={["admin"]}><AppLayout><Bookings /></AppLayout></RequireAuth>} />
      <Route path="/rooms" element={<RequireAuth allow={["admin"]}><AppLayout><Rooms /></AppLayout></RequireAuth>} />
      <Route path="/pricing" element={<RequireAuth allow={["admin"]}><AppLayout><Pricing /></AppLayout></RequireAuth>} />
      <Route path="/reports" element={<RequireAuth allow={["admin"]}><AppLayout><Reports /></AppLayout></RequireAuth>} />
      <Route path="/staff" element={<RequireAuth allow={["admin"]}><AppLayout><Staff /></AppLayout></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth allow={["admin"]}><AppLayout><Settings /></AppLayout></RequireAuth>} />

      {/* Receptionist-only */}
      <Route path="/walk-in" element={<RequireAuth allow={["receptionist"]}><AppLayout><WalkIn /></AppLayout></RequireAuth>} />
      <Route path="/check-in-out" element={<RequireAuth allow={["admin", "receptionist"]}><AppLayout><CheckInOut /></AppLayout></RequireAuth>} />
      <Route path="/allocation" element={<RequireAuth allow={["admin", "receptionist"]}><AppLayout><Allocation /></AppLayout></RequireAuth>} />

      {/* Shared */}
      <Route path="/guests" element={<RequireAuth><AppLayout><Guests /></AppLayout></RequireAuth>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;