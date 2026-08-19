import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CivicPulse AI" },
      {
        name: "description",
        content:
          "Sign in or create a CivicPulse AI account to report civic issues, track resolutions and verify municipal work.",
      },
      { property: "og:title", content: "Sign in — CivicPulse AI" },
      {
        property: "og:description",
        content:
          "Citizen and municipal admin access to the CivicPulse AI civic reporting platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: isAdmin ? "/admin/queue" : "/dashboard", replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back to CivicPulse.");
  }

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name.trim() },
      },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    setBusy(false);
    if (!data.session) {
      toast.success("Account created. Check your email to confirm, then sign in.");
    } else {
      toast.success("Account created.");
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute left-0 top-0 h-1 w-full bg-accent" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full border-[40px] border-primary-foreground/5" />
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6" />
          <span className="font-display text-2xl font-bold">CivicPulse</span>
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[.2em] text-accent uppercase">
            Residents’ civic ledger
          </p>
          <h1 className="mt-5 font-display text-6xl leading-[.96] font-bold tracking-tight">
            Report it. Prioritize it.
            <br />
            Track it. Verify it.
          </h1>
          <p className="mt-5 max-w-md leading-7 text-primary-foreground/78">
            Photograph a civic issue, let AI classify severity, watch a transparent priority score
            route it to the right department, and confirm the fix yourself.
          </p>
        </div>
        <p className="flex items-center gap-2 text-sm text-primary-foreground/70">
          <CheckCircle2 className="h-4 w-4 text-accent" /> Every report is yours to track and
          verify.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_24px_50px_-36px_oklch(.29_.08_254_/_75%)] md:p-8">
          <p className="page-kicker">Citizen access</p>
          <h2 className="mt-2 font-display text-4xl font-bold">Welcome in.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your account to file and follow civic reports.
          </p>

          <Tabs defaultValue="login" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="space-y-4 pt-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4 pt-4" onSubmit={handleSignup}>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>

          <a
            href="/admin-login"
            className="mt-6 block w-full text-center text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Municipal staff? Go to the Admin Portal login
          </a>
        </div>
      </div>
    </div>
  );
}
