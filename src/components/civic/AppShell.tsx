import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bell, ChevronRight, LogOut, Menu, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, signOutEverywhere } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Assistant } from "./Assistant";

const citizenLinks = [
  { to: "/dashboard", label: "My Reports" },
  { to: "/report", label: "Report Issue" },
  { to: "/community", label: "Community" },
  { to: "/rewards", label: "Civic Rewards" },
  { to: "/map", label: "Live Map" },
  { to: "/help", label: "Help & Support" },
];

const adminLinks = [
  { to: "/admin/queue", label: "Action Queue" },
  { to: "/admin/escalations", label: "Escalations" },
  { to: "/map", label: "Live Map" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, fullName } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi" | "mr">("en");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const unread = useQuery({
    queryKey: ["unread", user?.id],
    enabled: Boolean(user),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  // Strict role separation: authority staff see the control-room nav only,
  // citizens never see admin destinations.
  const links = isAdmin ? adminLinks : citizenLinks;

  async function handleSignOut() {
    await signOutEverywhere(queryClient);
    void navigate({ to: isAdmin ? "/admin-login" : "/auth", replace: true });
  }

  return (
    <div className={cn("flex min-h-screen flex-col bg-background", isAdmin && "authority-page")}>
      <div className="tricolour-rule" />
      <header className="sticky top-0 z-30 border-b border-border/90 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-3 px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_18px_-12px_oklch(.29_.08_254_/_90%)]">
              <Activity className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display text-lg font-bold leading-none tracking-tight">
                CivicPulse
              </span>
              <span className="mt-1 block text-[9px] font-bold tracking-[.18em] text-muted-foreground uppercase">
                AI civic service
              </span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {user
              ? links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      pathname.startsWith(link.to) && "bg-secondary text-primary",
                    )}
                  >
                    {link.label}
                  </Link>
                ))
              : null}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <label className="hidden items-center gap-1 text-xs font-bold text-muted-foreground sm:flex">
              Language
              <select
                aria-label="Language"
                value={language}
                onChange={(e) => {
                  const next = e.target.value as "en" | "hi" | "mr";
                  setLanguage(next);
                  document.documentElement.lang = next;
                }}
                className="border border-input bg-background px-2 py-1 text-foreground"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="mr">मराठी</option>
              </select>
            </label>
            {user ? (
              <>
                <Link
                  to="/notifications"
                  className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {(unread.data ?? 0) > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {unread.data}
                    </span>
                  ) : null}
                </Link>
                <span className="hidden text-right text-xs text-muted-foreground md:inline">
                  <span className="block font-bold text-foreground">{fullName || user.email}</span>
                  <span>{isAdmin ? "Municipal operations" : "Citizen workspace"}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-1 h-4 w-4" /> Sign out
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
            {user ? (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
        </div>

        {open && user ? (
          <nav className="border-t bg-card px-4 py-3 lg:hidden">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {link.label}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-8 bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 md:grid-cols-[1fr_auto] md:px-8">
          <div>
            <p className="font-display text-lg font-bold">Civic action, made visible.</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-primary-foreground/72">
              CivicPulse AI is an independent civic-technology prototype. It is not a government
              service or emergency response system.
            </p>
          </div>
          <p className="flex items-center gap-2 self-end text-xs font-semibold tracking-wide text-primary-foreground/70">
            <ShieldCheck className="h-4 w-4 text-accent" /> REPORT · TRACK · VERIFY
          </p>
        </div>
      </footer>

      {user ? <Assistant /> : null}
    </div>
  );
}
