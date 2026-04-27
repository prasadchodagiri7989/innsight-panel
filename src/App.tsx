import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/context/RoleContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGuard } from "@/components/RoleGuard";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />

              {/* Admin-only */}
              <Route path="/bookings" element={<RoleGuard allow={["admin"]}><Bookings /></RoleGuard>} />
              <Route path="/rooms" element={<RoleGuard allow={["admin"]}><Rooms /></RoleGuard>} />
              <Route path="/pricing" element={<RoleGuard allow={["admin"]}><Pricing /></RoleGuard>} />
              <Route path="/reports" element={<RoleGuard allow={["admin"]}><Reports /></RoleGuard>} />
              <Route path="/staff" element={<RoleGuard allow={["admin"]}><Staff /></RoleGuard>} />
              <Route path="/settings" element={<RoleGuard allow={["admin"]}><Settings /></RoleGuard>} />

              {/* Receptionist-only */}
              <Route path="/walk-in" element={<RoleGuard allow={["receptionist"]}><WalkIn /></RoleGuard>} />
              <Route path="/check-in-out" element={<RoleGuard allow={["receptionist"]}><CheckInOut /></RoleGuard>} />
              <Route path="/allocation" element={<RoleGuard allow={["receptionist"]}><Allocation /></RoleGuard>} />

              {/* Shared */}
              <Route path="/guests" element={<Guests />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
