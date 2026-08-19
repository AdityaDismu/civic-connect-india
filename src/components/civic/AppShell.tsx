import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bell, LogOut, Menu } from "lucide-react";
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
  { to: "/map", label: "Live Map" },
  { to: "/help", label: "Help & Support" },
];

const adminLinks = [
  { to: "/admin/queue", label: "Action Queue" },
  { to: "/admin/escalations", label: "Escalations" },
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

  const links = isAdmin ? [...citizenLinks, ...adminLinks] : citizenLinks;

  async function handleSignOut() {
    await signOutEverywhere(queryClient);
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b-2 border-primary bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center border border-primary bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">CivicPulse</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {user
              ? links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "border-b-2 border-transparent px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground",
                      pathname.startsWith(link.to) && "border-primary text-foreground",
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
                  className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {(unread.data ?? 0) > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {unread.data}
                    </span>
                  ) : null}
                </Link>
                <span className="hidden text-sm text-muted-foreground md:inline">
                  {fullName || user.email}
                  {isAdmin ? " · Admin" : ""}
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
          <nav className="border-t px-4 pb-3 lg:hidden">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t-2 border-primary bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-sm text-primary-foreground/70">
          <p className="font-display font-semibold text-primary-foreground">
            REPORT IT. PRIORITIZE IT. TRACK IT. VERIFY IT.
          </p>
          <p>CivicPulse AI — AI-assisted civic issue reporting and accountability.</p>
        </div>
      </footer>

      {user ? <Assistant /> : null}
    </div>
  );
}
