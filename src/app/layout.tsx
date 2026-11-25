import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/pt-sans/700.css"; // brand wordmark only (bold weight)
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeModeProvider } from "./_ui/theme";

export const metadata: Metadata = {
  title: "V-Decor Desk",
  description: "Enquiry & quote tracking",
};

// viewportFit "cover" exposes env(safe-area-inset-*) for the mobile tab bar.
// theme-color is kept in sync with the chosen mode at runtime (ThemeModeProvider).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Theme provider lives here (server component) so its no-flash script is in the SSR HTML.
// suppressHydrationWarning: that script adds class/style to <html> before React hydrates.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeModeProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster richColors position="top-center" />
        </ThemeModeProvider>
      </body>
    </html>
  );
}
