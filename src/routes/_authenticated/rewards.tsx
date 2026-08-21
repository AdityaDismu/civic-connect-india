import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Bus, CheckCircle2, GraduationCap, Leaf, Ticket, Train } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({ meta: [{ title: "Civic Rewards — CivicPulse AI" }] }),
  component: RewardsPage,
});

type RewardData = {
  points: number;
  monthly_earned: number;
  history: HistoryItem[];
  redemptions: Redemption[];
};
type HistoryItem = {
  id: string;
  action: string;
  points: number;
  description: string;
  created_at: string;
};
type Redemption = {
  id: string;
  reward_name: string;
  confirmation_code: string;
  created_at: string;
};
const civicDb = supabase as unknown as {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

const rewards = [
  {
    code: "BUS50",
    name: "₹50 public transport voucher",
    cost: 50,
    detail: "Prototype voucher for local bus travel.",
    icon: Bus,
  },
  {
    code: "METRO50",
    name: "₹50 metro / travel voucher",
    cost: 50,
    detail: "Prototype credit for a metro or local journey.",
    icon: Train,
  },
  {
    code: "EDU100",
    name: "₹100 education / library voucher",
    cost: 100,
    detail: "Prototype credit for learning resources.",
    icon: GraduationCap,
  },
  {
    code: "TREE",
    name: "Tree-plantation contribution",
    cost: 30,
    detail: "Fund one civic greening contribution.",
    icon: Leaf,
  },
  {
    code: "BADGE",
    name: "Civic Contributor badge",
    cost: 75,
    detail: "A recognition badge for your CivicPulse profile.",
    icon: Award,
  },
];

function RewardsPage() {
  const client = useQueryClient();
  const summary = useQuery({
    queryKey: ["civic-rewards"],
    queryFn: async () => {
      const { data, error } = await civicDb.rpc("get_civic_rewards");
      if (error) throw new Error(error.message);
      return data as RewardData;
    },
  });
  const data = summary.data ?? { points: 0, monthly_earned: 0, history: [], redemptions: [] };

  async function redeem(reward: (typeof rewards)[number]) {
    const { data: result, error } = await civicDb.rpc("redeem_civic_reward", {
      _reward_code: reward.code,
      _reward_name: reward.name,
      _points_cost: reward.cost,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const row = Array.isArray(result) ? result[0] : result;
    toast.success(
      `Redemption confirmed${row?.confirmation_code ? ` · ${row.confirmation_code}` : ""}`,
    );
    void client.invalidateQueries({ queryKey: ["civic-rewards"] });
  }

  return (
    <div className="page-shell max-w-6xl">
      <p className="page-kicker">Civic participation</p>
      <h1 className="page-title">Civic Rewards</h1>
      <p className="page-subtitle">
        Earn CivicPoints for verified actions that strengthen your city.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <section className="civic-panel bg-primary text-primary-foreground">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-primary-foreground/70">
            Current balance
          </p>
          <p className="mt-2 font-display text-5xl font-bold tabular-nums">{data.points}</p>
          <p className="mt-1 text-sm text-primary-foreground/75">CivicPoints available</p>
        </section>
        <section className="civic-panel">
          <p className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Monthly earning limit
          </p>
          <p className="mt-2 font-display text-5xl font-bold tabular-nums">
            {data.monthly_earned} <span className="text-xl text-muted-foreground">/ 100</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.min(data.monthly_earned, 100)}%` }}
            />
          </div>
        </section>
      </div>

      <section className="mt-7">
        <h2 className="text-xl font-bold">Available rewards</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rewards.map((reward) => {
            const Icon = reward.icon;
            return (
              <article key={reward.code} className="civic-panel flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold">{reward.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{reward.detail}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="font-mono text-sm font-bold text-primary">
                    {reward.cost} points
                  </span>
                  <Button
                    size="sm"
                    disabled={data.points < reward.cost}
                    onClick={() => void redeem(reward)}
                  >
                    <Ticket />
                    Redeem
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="civic-panel">
          <h2 className="text-lg font-bold">Points history</h2>
          {summary.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : data.history.length ? (
            <div className="mt-3 divide-y">
              {data.history.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                  <span
                    className={
                      item.points > 0
                        ? "font-mono font-bold text-success"
                        : "font-mono font-bold text-destructive"
                    }
                  >
                    {item.points > 0 ? "+" : ""}
                    {item.points}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Your verified civic actions will appear here.
            </p>
          )}
        </section>
        <section className="civic-panel">
          <h2 className="text-lg font-bold">How points stay fair</h2>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              20 points for a valid, verified report; 5 for genuine support; 10 for confirming a
              resolution.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Duplicate, spam, and flagged reports do not earn points.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Each supported report and verification can earn points once, up to 100 earned points
              per month.
            </li>
          </ul>
          {data.redemptions.length ? (
            <div className="mt-5 border-t pt-4">
              <p className="text-sm font-semibold">Recent confirmations</p>
              {data.redemptions.slice(0, 2).map((redemption) => (
                <p key={redemption.id} className="mt-2 text-xs text-muted-foreground">
                  {redemption.reward_name} ·{" "}
                  <span className="font-mono">{redemption.confirmation_code}</span>
                </p>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
