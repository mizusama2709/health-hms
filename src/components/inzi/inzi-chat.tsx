"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Message = { role: "user" | "assistant"; content: string };

export function InziChat({
  askAction,
  title,
  placeholder,
}: {
  askAction: (question: string, historyText: string) => Promise<string>;
  title: string;
  placeholder: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const question = input.trim();
    if (!question) return;

    const historyText = messages.map((m) => `${m.role === "user" ? "User" : "InZi"}: ${m.content}`).join("\n");

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");

    startTransition(async () => {
      try {
        const answer = await askAction(question, historyText);
        setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="flex max-w-2xl flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ask a question to get started.</p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "self-end whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "self-start whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm"
                }
              >
                {m.content}
              </div>
            ))
          )}
          {isPending && (
            <div className="self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking…</div>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            Ask
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
