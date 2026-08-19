import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/help")({ component: HelpPage });

function HelpPage() {
  return (
    <main className="page-shell max-w-4xl">
      <p className="page-kicker">CivicPulse AI • Prototype</p>
      <h1 className="page-title">Help & Support</h1>
      <div className="mt-8 grid gap-4">
        <section className="civic-panel-soft">
          <h2 className="text-xl font-bold">How to report an issue</h2>
          <p className="mt-2 text-sm">
            Add a clear photo, explain the problem in simple words, and choose the exact issue
            location. You can also add a voice note and extra photos.
          </p>
        </section>
        <section className="civic-panel-soft">
          <h2 className="text-xl font-bold">Track and verify</h2>
          <p className="mt-2 text-sm">
            Open your report to see department actions and evidence. When final evidence is
            uploaded, confirm the issue is resolved or reopen it with a reason.
          </p>
        </section>
        <section className="civic-panel-soft">
          <h2 className="text-xl font-bold">Accessibility</h2>
          <p className="mt-2 text-sm">
            Use large controls, voice notes, and your preferred language. Ask a trusted person to
            help if needed.
          </p>
        </section>
        <section className="border border-warning bg-warning/10 p-5">
          <h2 className="text-xl font-bold">Emergency guidance</h2>
          <p className="mt-2 text-sm">
            For immediate danger to life or safety, contact your local emergency services.
            CivicPulse is a prototype and cannot guarantee emergency response.
          </p>
        </section>
        <section className="civic-panel-soft">
          <h2 className="text-xl font-bold">Support contact</h2>
          <p className="mt-2 text-sm">Prototype Support: +91-XXXXXXXXXX</p>
          <p className="text-xs text-muted-foreground">
            Replace with a verified local helpline before deployment.
          </p>
        </section>
      </div>
    </main>
  );
}
