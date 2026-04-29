import { useEffect, useState } from "react";
import { Bell, Search, ChevronDown, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const initials = user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || e.key === "/") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md md:px-6">
        <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-muted" />

        <button
          onClick={() => setSearchOpen(true)}
          className="relative hidden flex-1 max-w-md items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-4 text-sm text-muted-foreground transition-all hover:bg-muted/70 hover:border-primary/40 focus:outline-none md:flex h-10"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>Search guests, bookings, rooms…</span>
          <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 font-mono text-[10px] sm:inline-flex">
            Ctrl K
          </kbd>
        </button>

        {/* Mobile search icon */}
        <button
          onClick={() => setSearchOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>

        <div className="flex-1 md:hidden" />

        <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card px-2 py-1.5 transition-colors hover:bg-muted">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-tight text-foreground">{user?.name}</p>
                <p className="text-[11px] capitalize leading-tight text-primary">{user?.role}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <p className="font-semibold">{user?.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{user?.role} &middot; {user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </>
  );
}

