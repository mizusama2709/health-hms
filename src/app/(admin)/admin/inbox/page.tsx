import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listConversations, getConversationThread } from "@/lib/whatsappInbox";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Inbox",
};

function timeLabel(d: Date) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function maskPhone(phone: string) {
  if (phone.length <= 4) return phone;
  return `+${phone.slice(0, 2)} •••• ${phone.slice(-4)}`;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; search?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;

  const conversations = await listConversations(tenantId, params.search);
  const activePhone = params.phone ?? conversations[0]?.phone;
  const thread = activePhone ? await getConversationThread(tenantId, activePhone) : null;
  const activeConversation = conversations.find((c) => c.phone === activePhone);

  return (
    <div className="-m-6 flex h-[calc(100vh-1px)] min-h-[720px] overflow-hidden bg-background">
      {/* Conversation list */}
      <div className="flex w-[320px] shrink-0 flex-col border-r">
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Inbox</h1>
          <form method="get" className="mt-2">
            <input
              name="search"
              placeholder="Search name or phone..."
              defaultValue={params.search ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </form>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No WhatsApp messages yet.</p>
          ) : (
            conversations.map((c) => {
              const query = new URLSearchParams();
              query.set("phone", c.phone);
              if (params.search) query.set("search", params.search);
              const isActive = c.phone === activePhone;
              return (
                <Link
                  key={c.phone}
                  href={`/admin/inbox?${query.toString()}`}
                  className={cn(
                    "block border-b border-l-4 px-4 py-3 hover:bg-muted/50",
                    isActive ? "border-l-primary bg-muted/50" : "border-l-transparent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.patientName ?? maskPhone(c.phone)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeLabel(c.lastMessage.createdAt)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{maskPhone(c.phone)}</div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {c.lastMessage.direction === "OUTBOUND" ? "You: " : ""}
                    {typeof c.lastMessage.rawPayload === "object" &&
                    c.lastMessage.rawPayload &&
                    "body" in (c.lastMessage.rawPayload as Record<string, unknown>)
                      ? String((c.lastMessage.rawPayload as Record<string, unknown>).body)
                      : (c.lastMessage.parsedIntent ?? c.lastMessage.status)}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">WA</span>
                    {c.hasFailed && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                        Failed
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!thread || !activePhone ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">{activeConversation?.patientName ?? maskPhone(activePhone)}</h2>
                <p className="text-sm text-muted-foreground">{activePhone}</p>
              </div>
              {thread.patient && (
                <Link
                  href={`/admin/patients/${thread.patient.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View patient chart →
                </Link>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="flex flex-col gap-3">
                {thread.messages.map((m) => {
                  const isOutbound = m.direction === "OUTBOUND";
                  const body =
                    typeof m.rawPayload === "object" && m.rawPayload && "body" in (m.rawPayload as Record<string, unknown>)
                      ? String((m.rawPayload as Record<string, unknown>).body)
                      : (m.parsedIntent ?? "(no text)");
                  return (
                    <div key={m.id} className={cn("flex flex-col", isOutbound ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "max-w-md rounded-2xl px-4 py-2 text-sm shadow-sm",
                          isOutbound ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        {body}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{timeLabel(m.createdAt)}</span>
                        <span>·</span>
                        <span>{m.status.toLowerCase()}</span>
                        {m.errorMessage && <span className="text-destructive">· {m.errorMessage}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
              This inbox mirrors WhatsApp messages sent/received via the webhook — replying from here isn&apos;t wired up yet.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
