import { Bell, Search, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRole } from "@/context/RoleContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const { role, setRole, user } = useRole();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-muted" />

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search bookings, guests, rooms…"
          className="h-10 w-full rounded-xl border border-border/70 bg-muted/40 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
        />
      </div>

      <div className="flex-1 md:hidden" />

      <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card px-2 py-1.5 transition-colors hover:bg-muted">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-xs font-semibold text-primary-foreground">
              {user.initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-foreground">{user.name}</p>
              <p className="text-[11px] capitalize leading-tight text-primary">{role}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Switch role (demo)</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setRole("admin")} className="cursor-pointer">
            <span className="mr-auto">Admin</span>
            {role === "admin" && <span className="text-primary">●</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRole("receptionist")} className="cursor-pointer">
            <span className="mr-auto">Receptionist</span>
            {role === "receptionist" && <span className="text-primary">●</span>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
