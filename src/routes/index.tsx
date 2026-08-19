import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b-2 border-primary px-5 py-5">
        <span className="flex items-center gap-3 font-display text-2xl font-bold">
          <span className="grid h-10 w-10 place-items-center bg-primary text-primary-foreground">
            <Activity />
          </span>
          CivicPulse AI
        </span>
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Prototype
        </span>
      </header>
      <section className="mx-auto max-w-5xl px-5 py-16 text-center md:py-24">
        <p className="page-kicker">A citizen-first civic service</p>
        <h1 className="mt-4 text-4xl font-bold md:text-6xl">How would you like to continue?</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Choose the workspace that matches your role. CivicPulse AI is an independent prototype,
          not an official government service.
        </p>
        <div className="mt-12 grid gap-6 text-left md:grid-cols-2">
          <Link
            to="/auth"
            className="group border-2 border-primary bg-card p-8 shadow-[6px_6px_0_0_oklch(0.31_0.07_250)] transition-transform hover:-translate-y-1"
          >
            <MapPin className="h-10 w-10 text-primary" />
            <p className="mt-8 font-mono text-xs font-bold tracking-widest text-primary">
              CITIZEN LOGIN
            </p>
            <h2 className="mt-3 text-3xl font-bold">Report and track civic issues</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Submit an issue, follow its progress, and verify the final resolution.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 font-bold">
              Continue as citizen{" "}
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            to="/admin-login"
            className="group border-2 border-foreground bg-primary p-8 text-primary-foreground shadow-[6px_6px_0_0_oklch(0.68_0.15_48)] transition-transform hover:-translate-y-1"
          >
            <Building2 className="h-10 w-10" />
            <p className="mt-8 font-mono text-xs font-bold tracking-widest text-primary-foreground/75">
              AUTHORITY LOGIN
            </p>
            <h2 className="mt-3 text-3xl font-bold">Manage and resolve civic complaints</h2>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
              Assign work, add evidence, and keep citizens informed.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 font-bold">
              Continue as authority{" "}
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
        <Button asChild variant="link" className="mt-10">
          <Link to="/auth">Already have an account? Sign in</Link>
        </Button>
      </section>
    </main>
  );
}
