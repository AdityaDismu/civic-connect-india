import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Building2, CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <div className="tricolour-rule" />
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <span className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/15">
            <Activity />
          </span>
          CivicPulse AI
        </span>
        <span className="hidden rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:block">
          Independent prototype
        </span>
      </header>
      <section className="service-grid relative mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="page-kicker">A citizen-first civic platform</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
            Make every civic issue impossible to ignore.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-muted-foreground">
            Report what you see, follow its progress and help verify a real resolution — in one
            clear civic record.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 text-left md:grid-cols-2">
          <Link
            to="/auth"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-[0_20px_45px_-32px_oklch(.29_.08_254_/_65%)] transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_24px_48px_-30px_oklch(.29_.08_254_/_75%)]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-primary">
              <MapPin className="h-6 w-6" />
            </span>
            <p className="mt-7 text-[10px] font-bold tracking-[.18em] text-primary uppercase">
              CITIZEN LOGIN
            </p>
            <h2 className="mt-3 text-3xl font-bold">Your neighbourhood, in your hands.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Submit an issue, follow its progress, and verify the final resolution.
            </p>
            <span className="mt-7 inline-flex items-center gap-2 font-bold text-primary">
              Continue as citizen{" "}
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            to="/admin-login"
            className="group relative overflow-hidden rounded-2xl bg-primary p-7 text-primary-foreground shadow-[0_20px_45px_-28px_oklch(.29_.08_254_/_85%)] transition-all hover:-translate-y-1"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-foreground/12 text-accent">
              <Building2 className="h-6 w-6" />
            </span>
            <p className="mt-7 text-[10px] font-bold tracking-[.18em] text-primary-foreground/65 uppercase">
              AUTHORITY LOGIN
            </p>
            <h2 className="mt-3 text-3xl font-bold">An operational view of civic action.</h2>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
              Assign work, add evidence, and keep citizens informed.
            </p>
            <span className="mt-7 inline-flex items-center gap-2 font-bold text-accent">
              Continue as authority{" "}
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
        <div className="mx-auto mt-10 flex max-w-5xl flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" /> Transparent status and citizen
            verification
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" /> Not an official government service
          </span>
        </div>
        <Button asChild variant="link" className="mt-4">
          <Link to="/auth">Already have an account? Sign in</Link>
        </Button>
      </section>
    </main>
  );
}
