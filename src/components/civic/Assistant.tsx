import { useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAssistant } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "bot"; text: string };

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hi! Ask me how to report an issue, what a status means, or about live report counts.",
    },
  ]);
  const ask = useServerFn(askAssistant);

  async function send() {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const { data: rows } = await supabase
        .from("complaints")
        .select("display_id, title, status, category, priority_score")
        .order("created_at", { ascending: false })
        .limit(15);
      const context = (rows ?? [])
        .map(
          (r) =>
            `${r.display_id} | ${r.title} | ${r.category} | ${r.status} | priority ${r.priority_score}`,
        )
        .join("\n");
      const result = await ask({ data: { question, context } });
      setMessages((m) => [...m, { role: "bot", text: result.answer }]);
    } catch (error) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: error instanceof Error ? error.message : "Something went wrong." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Open CivicPulse assistant"
      >
        <Bot className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed right-5 bottom-5 z-40 flex h-[420px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Bot className="h-4 w-4 text-primary" /> CivicPulse Assistant
        </span>
        <button onClick={() => setOpen(false)} aria-label="Close assistant">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                : "w-fit max-w-[90%] rounded-lg bg-secondary px-3 py-2 text-secondary-foreground"
            }
          >
            {m.text}
          </div>
        ))}
        {busy ? <p className="text-xs text-muted-foreground">Thinking…</p> : null}
      </div>
      <div className="flex gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="Ask a question…"
        />
        <Button size="icon" onClick={() => void send()} disabled={busy} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
