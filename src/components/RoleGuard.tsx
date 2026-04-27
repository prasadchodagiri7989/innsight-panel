import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useRole, Role } from "@/context/RoleContext";

export function RoleGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role } = useRole();
  if (!allow.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive-soft text-destructive">
        <Lock className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-display text-xl font-bold">Restricted area</h2>
      <p className="mt-1 text-sm text-muted-foreground">You don't have access to this section.</p>
    </div>
  );
}
