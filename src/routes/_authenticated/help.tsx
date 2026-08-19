import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  HelpCircle,
  MapPin,
  Mic,
  PhoneCall,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — CivicPulse AI" },
      {
        name: "description",
        content: "Learn how to report civic issues, track resolution, and get emergency guidance.",
      },
    ],
  }),
  component: HelpPage,
});

const FAQ_ITEMS = [
  {
    id: "item-1",
    question: "How do I report an issue?",
    answer:
      "Navigate to the Report page and upload a clear photo of the issue. Our AI automatically identifies the issue type and urgency. Confirm or adjust the location on the map, add an optional voice note or extra details, and click Submit.",
    icon: FileText,
  },
  {
    id: "item-2",
    question: "How does the AI verification work?",
    answer:
      "When you upload a photo, CivicPulse AI checks for visible hazards, determines severity, and assigns an initial priority score. It also checks for duplicate reports nearby so duplicate issues can be grouped efficiently.",
    icon: Sparkles,
  },
  {
    id: "item-3",
    question: "How do I track and confirm resolution?",
    answer:
      "Open any filed report from your Dashboard to see live department updates and resolution proof images uploaded by city officials. Once resolved, you can accept the fix or reopen the report if work is incomplete.",
    icon: CheckCircle2,
  },
  {
    id: "item-4",
    question: "Is the app accessible for non-technical users?",
    answer:
      "Yes. You can attach voice notes in your local language instead of typing long descriptions. Large visual buttons, automatic location detection, and high-contrast styling ensure ease of use.",
    icon: Mic,
  },
];

function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="page-shell max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
          <HelpCircle className="h-4 w-4" />
          <span>Support Center</span>
        </div>
        <h1 className="page-title mt-1">Help & Knowledge Base</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Find answers on filing civic reports, tracking resolutions, and app accessibility.
        </p>
      </div>

      {/* Quick Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search help articles (e.g. tracking, voice notes, emergency)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 text-sm bg-card shadow-sm"
        />
      </div>

      {/* Quick Action Navigation */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/report"
          className="group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary hover:shadow-md"
        >
          <div className="space-y-2">
            <div className="inline-flex rounded-lg bg-primary/10 p-2 text-primary transition-transform group-hover:scale-110">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground">File a Report</h3>
            <p className="text-xs text-muted-foreground">
              Snap a picture and pin the issue on the map using AI assistance.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center text-xs font-medium text-primary">
            Start report &rarr;
          </span>
        </Link>

        <Link
          to="/community"
          className="group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary hover:shadow-md"
        >
          <div className="space-y-2">
            <div className="inline-flex rounded-lg bg-primary/10 p-2 text-primary transition-transform group-hover:scale-110">
              <UserCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground">Community Hub</h3>
            <p className="text-xs text-muted-foreground">
              Upvote existing issues in your area to help prioritize fixes.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center text-xs font-medium text-primary">
            View community &rarr;
          </span>
        </Link>

        <a
          href="#emergency"
          className="group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-destructive/50 hover:shadow-md"
        >
          <div className="space-y-2">
            <div className="inline-flex rounded-lg bg-destructive/10 p-2 text-destructive transition-transform group-hover:scale-110">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground">Urgent Guidance</h3>
            <p className="text-xs text-muted-foreground">
              Steps to follow if there is immediate physical danger or risk to life.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center text-xs font-medium text-destructive">
            Read guidelines &rarr;
          </span>
        </a>
      </div>

      {/* Frequently Asked Questions */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Frequently Asked Questions</h2>
        {filteredFaqs.length > 0 ? (
          <Accordion type="single" collapsible className="w-full space-y-2">
            {filteredFaqs.map((faq) => {
              const Icon = faq.icon;
              return (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="rounded-xl border bg-card px-4 shadow-sm"
                >
                  <AccordionTrigger className="hover:no-underline py-4 text-sm font-semibold">
                    <div className="flex items-center gap-3 text-left">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span>{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground pb-4 leading-relaxed pl-7">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No matching help topics found for "{searchQuery}".
            </p>
          </div>
        )}
      </section>

      {/* Emergency Callout Card */}
      <section
        id="emergency"
        className="relative overflow-hidden rounded-xl border-2 border-destructive/40 bg-destructive/5 p-6 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-destructive">Emergency Guidance</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              For immediate threats to life, active electrical hazards, severe gas leaks, or fire,
              please contact local emergency responder lines directly. CivicPulse AI routes
              non-emergency civic issues and cannot guarantee instant dispatch.
            </p>
          </div>
        </div>
      </section>

      {/* Support Contact Footer */}
      <section className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2.5 text-primary">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Need direct assistance?</p>
            <p className="text-xs text-muted-foreground">Prototype Helpline: +91-1800-XXX-XXXX</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="tel:+911800000000">Call Support</a>
        </Button>
      </section>
    </div>
  );
}
