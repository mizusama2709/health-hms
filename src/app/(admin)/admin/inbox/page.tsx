import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listWhatsAppMessages } from "@/lib/whatsappInbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WhatsAppDirection, WhatsAppMessageStatus } from "@prisma/client";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; status?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;

  const messages = await listWhatsAppMessages(tenantId, {
    direction: params.direction ? (params.direction as WhatsAppDirection) : undefined,
    status: params.status ? (params.status as WhatsAppMessageStatus) : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Inbox</h1>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp messages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap gap-2">
            <NativeSelect name="direction" defaultValue={params.direction ?? ""} className="w-40">
              <option value="">All directions</option>
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
            </NativeSelect>
            <NativeSelect name="status" defaultValue={params.status ?? ""} className="w-40">
              <option value="">All statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="PARSED">Parsed</option>
              <option value="PROCESSED">Processed</option>
              <option value="FAILED">Failed</option>
              <option value="SENT">Sent</option>
              <option value="SIMULATED">Simulated</option>
            </NativeSelect>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>

          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Badge variant={m.direction === "INBOUND" ? "default" : "secondary"}>{m.direction}</Badge>
                    </TableCell>
                    <TableCell>{m.direction === "INBOUND" ? m.fromPhone : m.toPhone}</TableCell>
                    <TableCell>{m.status}</TableCell>
                    <TableCell>{m.parsedIntent ?? "—"}</TableCell>
                    <TableCell>{m.createdAt.toLocaleString()}</TableCell>
                    <TableCell>
                      <Link href={`/admin/inbox/${m.id}`} className="text-sm font-medium text-primary hover:underline">
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
