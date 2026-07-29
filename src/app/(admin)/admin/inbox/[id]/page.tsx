import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantId } from "@/lib/tenant";
import { getWhatsAppMessage } from "@/lib/whatsappInbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function InboxMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await params;
  const message = await getWhatsAppMessage(id, tenantId);

  if (!message) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/inbox" className="text-sm font-medium text-primary hover:underline">
          ← Back to Inbox
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Message detail</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant={message.direction === "INBOUND" ? "default" : "secondary"}>{message.direction}</Badge>
            {message.status}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div>
            <span className="font-medium">From:</span> {message.fromPhone ?? "—"}
          </div>
          <div>
            <span className="font-medium">To:</span> {message.toPhone ?? "—"}
          </div>
          <div>
            <span className="font-medium">Parsed intent:</span> {message.parsedIntent ?? "—"}
          </div>
          {message.errorMessage && (
            <div className="text-destructive">
              <span className="font-medium">Error:</span> {message.errorMessage}
            </div>
          )}
          <div>
            <span className="font-medium">Date:</span> {message.createdAt.toLocaleString()}
          </div>
          <div>
            <div className="font-medium">Raw payload</div>
            <pre className="mt-1 max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">
              {JSON.stringify(message.rawPayload, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
