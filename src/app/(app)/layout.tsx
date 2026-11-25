import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { MeProvider } from "../_ui/useMe";
import AppSidebar from "./nav";
import { Breadcrumbs } from "./breadcrumbs";
import { MobileTabBar, MobileTopBar } from "./mobile-nav";

function PageFallback() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// Suspense boundaries: with cacheComponents, client parts reading the URL
// (usePathname / useParams) must stream in after the static shell is prerendered.
// Below md the sidebar is replaced by a top bar + bottom tab bar (thumb zone).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <SidebarProvider>
        <Suspense>
          <AppSidebar />
        </Suspense>
        {/* min-w-0 (here and on main's children): wide tables scroll inside their card instead of widening the page. */}
        <SidebarInset className="min-w-0 max-md:bg-muted/50">
          <header className="hidden h-14 shrink-0 items-center gap-2 border-b bg-sidebar px-4 md:flex">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Suspense>
              <Breadcrumbs />
            </Suspense>
          </header>
          <Suspense fallback={<div className="h-14 border-b bg-sidebar md:hidden" />}>
            <MobileTopBar />
          </Suspense>
          <main className="mx-auto grid w-full max-w-7xl gap-6 p-4 *:min-w-0 md:p-8">
            <Suspense fallback={<PageFallback />}>{children}</Suspense>
          </main>
          <Suspense>
            <MobileTabBar />
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    </MeProvider>
  );
}
