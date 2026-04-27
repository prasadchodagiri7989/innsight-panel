import { createContext, useContext, useState, ReactNode } from "react";

export type Role = "admin" | "receptionist";

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
  user: { name: string; initials: string };
}

const RoleContext = createContext<RoleCtx | null>(null);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>("admin");
  const user =
    role === "admin"
      ? { name: "Ramesh Kumar", initials: "RK" }
      : { name: "Anjali Menon", initials: "AM" };
  return (
    <RoleContext.Provider value={{ role, setRole, user }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
};
