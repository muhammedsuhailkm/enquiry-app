"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronLeft, ChevronRight, FileText, LayoutDashboard, List, LogOut, Menu, Moon, Plus, User, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useMounted, useThemeMode } from "../_ui/theme";
import { initials, useMe } from "../_ui/useMe";

/** Title shown in the mobile top bar for nested routes (top-level routes show the brand). */
function nestedTitle(parts: string[]) {
  if (parts[0] === "enquiries") {
    if (parts[1] === "new") return "New enquiry";
    if (parts[2] === "edit") return "Edit enquiry";
    return "Enquiry";
  }
  if (parts[0] === "employees") return "Employee";
  return "";
}

/** Form routes have their own sticky action bar, so the tab bar steps aside. */
const isFormRoute = (parts: string[]) => parts[0] === "enquiries" && (parts[1] === "new" || parts[2] === "edit");

export function MobileTopBar() {
  const parts = usePathname().split("/").filter(Boolean);
  const nested = parts.length > 1;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-sidebar/90 px-4 backdrop-blur-md md:hidden">
      {nested ? (
        <>
          <Link
            href={"/" + parts.slice(0, -1).join("/")}
            aria-label="Back"
            className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <span className="truncate text-base font-semibold">{nestedTitle(parts)}</span>
        </>
      ) : (
        <Link href="/dashboard" aria-label="Dashboard" className="flex items-center">
          <Image src="/logo.png" alt="V-Decor Desk" width={453} height={448} priority className="brand-logo size-10 object-contain" />
        </Link>
      )}
    </header>
  );
}

function TabLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary/8")}>
        <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
      </span>
      {label}
    </Link>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const me = useMe();
  const admin = me?.role === "ADMIN";
  const [more, setMore] = useState(false);

  if (isFormRoute(parts)) return null;
  const on = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = on("/employees") || on("/lookups");

  return (
    <>
      {/* Spacer so page content never hides behind the fixed bar. */}
      <div aria-hidden className="h-[calc(5rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
          <TabLink href="/dashboard" label="Home" icon={LayoutDashboard} active={on("/dashboard")} />
          <TabLink href="/enquiries" label="Enquiries" icon={FileText} active={on("/enquiries")} />
          <div className="flex justify-center">
            <Link
              href="/enquiries/new"
              aria-label="New enquiry"
              className="-mt-5 mb-2 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab transition-transform active:scale-95"
            >
              <Plus className="size-6" strokeWidth={2.25} />
            </Link>
          </div>
          <TabLink href="/profile" label="Profile" icon={User} active={on("/profile")} />
          <button
            type="button"
            onClick={() => setMore(true)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
              moreActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", moreActive && "bg-primary/8")}>
              <Menu className="size-5" strokeWidth={moreActive ? 2.25 : 1.75} />
            </span>
            More
          </button>
        </div>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="gap-0 rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div aria-hidden className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/25" />
          <SheetHeader className="px-6 pt-4">
            <SheetTitle className="sr-only">More</SheetTitle>
            <SheetDescription className="sr-only">Account and administration</SheetDescription>
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarFallback className="font-semibold">{initials(me?.name)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0">
                <span className="truncate font-semibold">{me?.name ?? "…"}</span>
                <span className="truncate text-sm text-muted-foreground">{me?.email}</span>
              </div>
            </div>
          </SheetHeader>
          <div className="grid gap-1 px-3 pt-4">
            {admin && (
              <>
                <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Administration</p>
                <SheetLink href="/employees" icon={Users} label="Employees" onPick={() => setMore(false)} />
                <SheetLink href="/lookups" icon={List} label="Lookups" onPick={() => setMore(false)} />
                <div className="my-2 h-px bg-border" />
              </>
            )}
            <DarkModeRow />
            <div className="my-2 h-px bg-border" />
            <button
              type="button"
              onClick={() => signOut({ redirectTo: "/login" })}
              className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-destructive active:bg-destructive/5"
            >
              <LogOut className="size-5" />
              Log out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Dark mode switch in the More sheet (the whole row is the tap target). */
function DarkModeRow() {
  const { resolvedTheme, setMode } = useThemeMode();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium active:bg-muted">
      <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
        <Moon className="size-4.5" />
      </span>
      <span className="flex-1">Dark mode</span>
      <Switch checked={dark} onCheckedChange={(v) => setMode(v ? "dark" : "light")} aria-label="Dark mode" />
    </label>
  );
}

function SheetLink({ href, icon: Icon, label, onPick }: { href: string; icon: React.ElementType; label: string; onPick: () => void }) {
  return (
    <Link href={href} onClick={onPick} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium active:bg-muted">
      <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-4.5" />
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
