"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronsUpDown, FileText, LayoutDashboard, List, LogOut, Moon, Sun, User, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useMounted, useThemeMode } from "../_ui/theme";
import { initials, useMe } from "../_ui/useMe";

const MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/enquiries", label: "Enquiries", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
];
const ADMIN = [
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/lookups", label: "Lookups", icon: List },
];

function NavGroup({ label, items }: { label: string; items: typeof MAIN }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => (
            <SidebarMenuItem key={it.href}>
              <SidebarMenuButton asChild isActive={pathname === it.href || pathname.startsWith(`${it.href}/`)} tooltip={it.label}>
                <Link href={it.href} onClick={() => setOpenMobile(false)}>
                  <it.icon />
                  <span>{it.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/** Quick light/dark switch in the user menu (full picker lives on the Profile page). */
function ThemeToggleItem() {
  const { resolvedTheme, setMode } = useThemeMode();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault(); // keep the menu open so the change is visible
        setMode(dark ? "light" : "dark");
      }}
    >
      {dark ? <Sun /> : <Moon />}
      {dark ? "Light mode" : "Dark mode"}
    </DropdownMenuItem>
  );
}

export default function AppSidebar() {
  const me = useMe();
  const admin = me?.role === "ADMIN";
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Expanded: logo + name. Collapsed to icons: the name hides and the logo stays. */}
            <SidebarMenuButton size="lg" asChild className="gap-3 hover:bg-transparent group-data-[collapsible=icon]:justify-center">
              <Link href="/dashboard" aria-label="V-Decor Desk dashboard">
                <Image src="/logo.png" alt="" width={453} height={448} priority className="brand-logo size-10 shrink-0 object-contain group-data-[collapsible=icon]:size-8" />
                <span className="truncate font-brand text-xl font-bold group-data-[collapsible=icon]:hidden">V-Decor Desk</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      {/* Divider under the brand, inset from both edges. */}
      <div aria-hidden className="mx-6 h-px shrink-0 bg-sidebar-foreground/40 group-data-[collapsible=icon]:mx-3" />

      <SidebarContent>
        <NavGroup label="Workspace" items={MAIN} />
        {admin && <NavGroup label="Administration" items={ADMIN} />}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-full">
                    <AvatarFallback className="text-xs font-semibold">{initials(me?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{me?.name ?? "…"}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {me ? `${me.role === "ADMIN" ? "Admin" : "Employee"} · ${me.designation}` : ""}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
                <DropdownMenuLabel className="grid font-normal">
                  <span className="font-medium">{me?.name}</span>
                  <span className="text-xs text-muted-foreground">{me?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <ThemeToggleItem />
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut({ redirectTo: "/login" })}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
