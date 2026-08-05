import Link from "next/link";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireTenantId } from "@/lib/tenant";
import { listPatientsPaged, listDoctorsForFilter, type PatientStatus } from "@/lib/patients";
import { listLeads } from "@/lib/leads";
import {
  createPatientAction,
  createLeadAction,
  importLeadsActionResult,
  updateLeadStatusAction,
  convertLeadAction,
} from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { TabsContent } from "@/components/ui/tabs";
import { PatientsTabs } from "@/components/patients-tabs";
import { ActionForm } from "@/components/action-form";
import { BulkImportField } from "@/components/bulk-import-field";
import { Avatar } from "@/components/avatar";
import type { LeadStatus } from "@prisma/client";

export const metadata = {
  title: "Patients",
};

const STATUS_FILTERS: { value: PatientStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "appointment_booked", label: "Appointment Booked" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "payment_collected", label: "Payment Collected" },
  { value: "follow_up", label: "Follow Up" },
  { value: "new", label: "New" },
];

const LEAD_STATUS_FILTERS: { value: LeadStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "ENQUIRY", label: "Enquiry" },
  { value: "SYMPTOMS_COLLECTED", label: "Symptoms Collected" },
  { value: "DOCTOR_RECOMMENDED", label: "Doctor Recommended" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "PAYMENT_COLLECTED", label: "Payment Collected" },
  { value: "APPOINTMENT_BOOKED", label: "Appointment Booked" },
  { value: "FOLLOW_UP", label: "Follow Up" },
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
  searchParams: Promise<{
    search?: string;
    sort?: string;
    doctorId?: string;
    status?: string;
    tab?: string;
    leadStatus?: string;
    page?: string;
  }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const status = (params.status || undefined) as PatientStatus | undefined;
  const tab = params.tab === "enquiry" ? "enquiry" : "patients";
  const leadStatus = (params.leadStatus || undefined) as LeadStatus | undefined;
  const page = Number(params.page) || 1;

  const [{ patients, total, totalPages }, doctors, leads] = await Promise.all([
    listPatientsPaged(tenantId, {
      search: params.search,
      sort,
      doctorId: params.doctorId || undefined,
      status,
      page,
      pageSize: 50,
    }),
    listDoctorsForFilter(tenantId),
    listLeads(tenantId, { search: tab === "enquiry" ? params.search : undefined, status: leadStatus }),
  ]);

  function pageHref(p: number) {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.sort) q.set("sort", params.sort);
    if (params.doctorId) q.set("doctorId", params.doctorId);
    if (status) q.set("status", status);
    q.set("page", String(p));
    return `/admin/patients?${q.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Patients</h1>

      <PatientsTabs tab={tab}>
        <TabsContent value="enquiry" className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Add lead</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createLeadAction} className="flex flex-col gap-2">
                  <Label htmlFor="leadName">Full name</Label>
                  <Input id="leadName" name="name" required />
                  <Label htmlFor="leadPhone">Mobile number</Label>
                  <Input id="leadPhone" name="phone" type="tel" placeholder="+91…" required />
                  <Label htmlFor="leadEmail">Email (optional)</Label>
                  <Input id="leadEmail" name="email" type="email" />
                  <Button type="submit" className="mt-2 self-start">
                    Add lead
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import leads</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={importLeadsActionResult} className="flex flex-col gap-2">
                  <Label htmlFor="rows">One lead per line: name, phone, email (optional)</Label>
                  <BulkImportField
                    id="rows"
                    rowsFieldName="rows"
                    placeholder={"Priya Sharma, +919876543210\nRahul Verma, +919812345678, rahul@example.com"}
                  />
                  <Button type="submit" className="mt-2 self-start">
                    Import leads
                  </Button>
                </ActionForm>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enquiry ({leads.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form method="get" className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="tab" value="enquiry" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Search</span>
                  <Input name="search" placeholder="Name or phone" defaultValue={params.search ?? ""} className="w-64" />
                </div>
                <Button type="submit" variant="outline">
                  Apply
                </Button>
              </form>

              <div className="flex flex-wrap gap-2">
                {LEAD_STATUS_FILTERS.map((f) => {
                  const query = new URLSearchParams();
                  query.set("tab", "enquiry");
                  if (params.search) query.set("search", params.search);
                  if (f.value) query.set("leadStatus", f.value);
                  const isActive = (leadStatus ?? "") === f.value;
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

              {leads.length === 0 ? (
                <EmptyState icon={Users} message={<>No leads found.</>} />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.phone}</TableCell>
                          <TableCell>{lead.email ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{lead.source}</TableCell>
                          <TableCell>
                            <StatusBadge status={lead.status} type="lead" />
                          </TableCell>
                          <TableCell>{formatDate(lead.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <form action={updateLeadStatusAction} className="flex items-center gap-1">
                                <input type="hidden" name="leadId" value={lead.id} />
                                <NativeSelect name="status" defaultValue={lead.status} className="w-40">
                                  {LEAD_STATUS_FILTERS.filter((f) => f.value).map((f) => (
                                    <option key={f.value} value={f.value}>
                                      {f.label}
                                    </option>
                                  ))}
                                </NativeSelect>
                                <Button type="submit" size="sm" variant="outline">
                                  Save
                                </Button>
                              </form>
                              <details>
                                <summary className="cursor-pointer text-xs font-medium text-primary">Convert to patient</summary>
                                <form action={convertLeadAction} className="mt-2 flex flex-col gap-2 rounded-md border p-2">
                                  <input type="hidden" name="leadId" value={lead.id} />
                                  <Label htmlFor={`email-${lead.id}`} className="text-xs">
                                    Email
                                  </Label>
                                  <Input id={`email-${lead.id}`} name="email" type="email" required className="w-56" />
                                  <Label htmlFor={`password-${lead.id}`} className="text-xs">
                                    Temporary password
                                  </Label>
                                  <Input id={`password-${lead.id}`} name="password" type="password" required className="w-56" />
                                  <Button type="submit" size="sm" variant="outline" className="self-start">
                                    Create patient
                                  </Button>
                                </form>
                              </details>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="flex flex-col gap-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add patient</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPatientAction} className="flex flex-col gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required />
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
            <Label htmlFor="phone">Mobile number</Label>
            <Input id="phone" name="phone" type="tel" placeholder="+91…" required />
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" name="password" type="password" required />
            <Label htmlFor="dateOfBirth">Date of birth (optional)</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" />
            <Label htmlFor="gender">Gender (optional)</Label>
            <NativeSelect id="gender" name="gender" defaultValue="">
              <option value="">— not specified —</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </NativeSelect>
            <Button type="submit" className="mt-2 self-start">
              Add patient
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory ({total})</CardTitle>
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
            <EmptyState icon={Users} message={<>No patients found.</>} />
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
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar name={p.user.name} size="sm" />
                          {p.user.name}
                        </div>
                      </TableCell>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={pageHref(page - 1)} className="font-medium text-primary hover:underline">
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={pageHref(page + 1)} className="font-medium text-primary hover:underline">
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </PatientsTabs>
    </div>
  );
}
