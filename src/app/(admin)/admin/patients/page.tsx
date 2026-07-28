import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listPatients } from "@/lib/patients";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const patients = await listPatients(tenantId, { search: params.search });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Patients</h1>

      <Card>
        <CardHeader>
          <CardTitle>Directory ({patients.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex gap-2">
            <Input name="search" placeholder="Search name, email, phone" defaultValue={params.search ?? ""} className="max-w-sm" />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No patients found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.user.name}</TableCell>
                    <TableCell>{p.user.email}</TableCell>
                    <TableCell>{p.user.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Link href={`/admin/patients/${p.id}`} className="text-sm font-medium text-primary hover:underline">
                        View chart
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
