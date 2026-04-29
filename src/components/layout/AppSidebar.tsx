import {
  LayoutDashboard,
  CalendarRange,
  BedDouble,
  IndianRupee,
  Users,
  BarChart3,
  UserCog,
  Settings,
  UserPlus,
  LogIn,
  Grid3x3,
  UserCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Bookings", url: "/bookings", icon: CalendarRange },
  { title: "Active Guests", url: "/active-guests", icon: UserCheck },
  { title: "Rooms", url: "/rooms", icon: BedDouble },
  { title: "Pricing", url: "/pricing", icon: IndianRupee },
  { title: "Guest Records", url: "/guests", icon: Users },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Staff", url: "/staff", icon: UserCog },
  { title: "Settings", url: "/settings", icon: Settings },
];

const receptionistItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Walk-in Booking", url: "/walk-in", icon: UserPlus },
  { title: "Check-in / out", url: "/check-in-out", icon: LogIn },
  { title: "Active Guests", url: "/active-guests", icon: UserCheck },
  { title: "Room Allocation", url: "/allocation", icon: Grid3x3 },
  { title: "Guest Records", url: "/guests", icon: Users },
];

export function AppSidebar() {
  const { user } = useAuth();
  const role = user?.role ?? "receptionist";
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const items = role === "admin" ? adminItems : receptionistItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <BedDouble className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="truncate font-display text-sm font-bold leading-tight text-foreground">
                Abhijeeth INN
              </p>
              <p className="truncate text-[11px] text-muted-foreground">Hotel Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {role === "admin" ? "Management" : "Front Desk"}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10 rounded-xl">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="group flex items-center gap-3 px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="!bg-primary !text-primary-foreground hover:!bg-primary hover:!text-primary-foreground shadow-soft"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
