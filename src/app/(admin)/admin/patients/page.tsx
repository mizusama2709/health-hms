import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listPatients, listDoctorsForFilter, type PatientStatus } from "@/lib/patients";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";

const STATUS_FILTERS: { value: PatientStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "appointment_booked", label: "Appointment Booked" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "payment_collected", label: "Payment Collected" },
  { value: "follow_up", label: "Follow Up" },
  { value: "new", label: "New" },
];

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; sort?: string; doctorId?: string; status?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const status = (params.status || undefined) as PatientStatus | undefined;

  const [patients, doctors] = await Promise.all([
    listPatients(tenantId, {
      search: params.search,
      sort,
      doctorId: params.doctorId || undefined,
      status,
    }),
    listDoctorsForFilter(tenantId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Patients</h1>

      <Card>
        <CardHeader>
          <CardTitle>Directory ({patients.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Search</span>
              <Input
                name="search"
                placeholder="Name, phone, Patient ID, email"
                defaultValue={params.search ?? ""}
                className="w-64"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Sort</span>
              <NativeSelect name="sort" defaultValue={sort} className="w-40">
                <option value="newest">Updated: Newest</option>
                <option value="oldest">Updated: Oldest</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Doctor</span>
              <NativeSelect name="doctorId" defaultValue={params.doctorId ?? ""} className="w-48">
                <option value="">All doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => {
              const query = new URLSearchParams();
              if (params.search) query.set("search", params.search);
              if (params.sort) query.set("sort", params.sort);
              if (params.doctorId) query.set("doctorId", params.doctorId);
              if (f.value) query.set("status", f.value);
              const isActive = (status ?? "") === f.value;
              return (
                <Link
                  key={f.label}
                  href={`/admin/patients?${query.toString()}`}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    isActive ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No patients found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last consultation</TableHead>
                    <TableHead>Last logged in</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.user.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.displayId}</TableCell>
                      <TableCell>{p.user.phone ?? "—"}</TableCell>
                      <TableCell>{p.user.email}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} type="patient" />
                      </TableCell>
                      <TableCell>
                        {p.lastConsultation ? (
                          <div>
                            <div>{formatDateTime(p.lastConsultation.datetime)}</div>
                            <div className="text-xs text-muted-foreground">with Dr. {p.lastConsultation.doctor.user.name}</div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(p.user.lastLoginAt)}</TableCell>
                      <TableCell>{formatDate(p.user.updatedAt)}</TableCell>
                      <TableCell>
                        <Link href={`/admin/patients/${p.id}`} className="text-sm font-medium text-primary hover:underline">
                          View chart
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
