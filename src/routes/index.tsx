import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Index });

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

// Custom Waving Flag Component
function WavingFlag() {
  return (
    <motion.div
      className="flex h-6 w-9 flex-col overflow-hidden rounded-sm border border-border shadow-sm"
      animate={{
        y: [0, -2, 0, 2, 0],
        rotate: [0, 2, 0, -2, 0],
      }}
      transition={{
        repeat: Infinity,
        duration: 3,
        ease: "easeInOut",
      }}
    >
      <div className="h-1/3 w-full bg-[#FF9933]" /> {/* Saffron */}
      <div className="relative flex h-1/3 w-full items-center justify-center bg-white">
        {/* Simplified Ashok Chakra */}
        <div className="h-2 w-2 rounded-full border-[0.5px] border-[#000080]" />
      </div>
      <div className="h-1/3 w-full bg-[#138808]" /> {/* Green */}
    </motion.div>
  );
}

function Index() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background selection:bg-orange-500/20">
      {/* Subtle background illumination */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/5 via-background to-green-500/5" />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background shadow-lg">
            <Activity className="h-5 w-5" />
          </span>
          CivicPulse AI
        </motion.span>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <WavingFlag />
          <span className="hidden rounded-full border border-border bg-card px-4 py-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:flex sm:items-center sm:gap-2">
            <Sparkles className="h-3 w-3" />
            Independent prototype
          </span>
        </motion.div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-3xl text-center"
        >
          <motion.p
            variants={itemVariants}
            className="page-kicker flex items-center justify-center gap-2 text-sm font-bold tracking-widest text-muted-foreground uppercase"
          >
            A citizen-first civic platform
          </motion.p>
          <motion.h1
            variants={itemVariants}
            className="mt-6 text-5xl font-extrabold tracking-tight md:text-7xl lg:leading-[1.1]"
          >
            Make every civic issue <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-[#FF9933] via-foreground to-[#138808] bg-clip-text text-transparent">
              impossible to ignore.
            </span>
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            Report what you see, follow its progress, and help verify a real resolution — in one
            clear, immutable civic record for the nation.
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mx-auto mt-16 grid max-w-5xl gap-6 text-left md:grid-cols-2"
        >
          {/* Citizen Card - Saffron Theme */}
          <motion.div variants={itemVariants} className="h-full">
            <Link
              to="/auth"
              className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/50 bg-card p-8 shadow-sm transition-all hover:-translate-y-1.5 hover:border-[#FF9933]/40 hover:shadow-xl hover:shadow-[#FF9933]/5"
            >
              <div className="flex-1">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FF9933]/10 text-[#FF9933] transition-colors group-hover:bg-[#FF9933] group-hover:text-white">
                  <MapPin className="h-6 w-6" />
                </span>
                <p className="mt-8 text-xs font-bold tracking-[0.2em] text-[#FF9933] uppercase">
                  Citizen Portal
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                  Your neighbourhood,
                  <br />
                  in your hands.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Submit an issue, follow its progress, and verify the final resolution directly
                  with the authorities.
                </p>
              </div>
              <span className="mt-8 flex w-fit items-center gap-2 font-semibold text-[#FF9933]">
                Continue as citizen{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
              </span>
            </Link>
          </motion.div>

          {/* Authority Card - Green Theme */}
          <motion.div variants={itemVariants} className="h-full">
            <Link
              to="/admin-login"
              className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-foreground p-8 text-background shadow-lg transition-all hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#138808]/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#138808]/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative z-10 flex-1">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-background/10 text-background backdrop-blur-sm transition-colors group-hover:bg-[#138808] group-hover:text-white">
                  <Building2 className="h-6 w-6" />
                </span>
                <p className="mt-8 text-xs font-bold tracking-[0.2em] text-background/60 uppercase">
                  Authority Portal
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                  An operational view <br />
                  of civic action.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-background/80">
                  Assign work to departments, upload resolution evidence, and keep citizens informed
                  at every step.
                </p>
              </div>
              <span className="relative z-10 mt-8 flex w-fit items-center gap-2 font-semibold text-background group-hover:text-[#138808]">
                Continue as authority{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
              </span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 rounded-2xl border border-border/50 bg-muted/30 px-6 py-4 text-sm font-medium text-muted-foreground backdrop-blur-sm sm:justify-between">
            <span className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-[#138808]" />
              Transparent status & verification
            </span>
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[#FF9933]" />
              Independent non-governmental service
            </span>
            <Button
              asChild
              variant="link"
              className="h-auto p-0 font-medium text-foreground hover:no-underline"
            >
              <Link to="/auth" className="flex items-center gap-1">
                Already have an account? Sign in <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
