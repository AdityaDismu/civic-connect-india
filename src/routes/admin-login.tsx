import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin portal login — CivicPulse AI" },
      {
        name: "description",
        content:
          "Secure municipal staff sign-in for the CivicPulse AI admin portal: triage the action queue, assign departments and verify resolutions.",
      },
      { property: "og:title", content: "Admin portal login — CivicPulse AI" },
      {
        property: "og:description",
        content: "Authorized municipal administrators sign in here to manage civic reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { isAdmin, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) void navigate({ to: "/admin/queue", replace: true });
  }, [loading, user, isAdmin, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      setBusy(false);
      toast.error(error?.message ?? "Sign-in failed.");
      return;
    }
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    if (roleError) {
      await supabase.auth.signOut();
      setBusy(false);
      toast.error(
        "Could not verify this account's municipal access. Please contact an administrator.",
      );
      return;
    }
    const admin = (roles ?? []).some((r) => r.role === "ADMIN");
    setBusy(false);
    if (!admin) {
      await supabase.auth.signOut();
      toast.error("This account is not authorized for the admin portal.");
      return;
    }
    toast.success("Signed in to the municipal admin portal.");
    void navigate({ to: "/admin/queue", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md border-t-4 border-primary bg-card p-8 shadow-[8px_8px_0_0_oklch(0.31_0.07_250_/_18%)]">
        <span className="flex h-11 w-11 items-center justify-center border border-primary bg-primary text-primary-foreground">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <p className="page-kicker mt-6">Authorized operations</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Municipal Desk</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with an administrator account created by your Supabase project owner. Citizen
          accounts cannot access this portal.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Official email</Label>
            <Input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign in to admin portal
          </Button>
        </form>

        <Link
          to="/auth"
          className="mt-6 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Not municipal staff? Citizen sign in
        </Link>
      </div>
    </div>
  );
}
