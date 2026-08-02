import { requireTenantId } from "@/lib/tenant";
import { listStaff } from "@/lib/staff";
import { createStaff, changeStaffRole, changeStaffStatus } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";

export const metadata = {
  title: "Staff",
};

const STAFF_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN", "NURSE", "RECEPTIONIST", "LAB", "PHARMACIST"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export default async function StaffPage() {
  const tenantId = await requireTenantId();
  const staff = await listStaff(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Staff</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add staff</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStaff} className="flex flex-col gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" placeholder="Full name" required />
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="Email" required />
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" name="phone" placeholder="Phone (optional)" />
            <Label htmlFor="role">Role</Label>
            <NativeSelect id="role" name="role" required>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </NativeSelect>
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" name="password" type="password" placeholder="Temporary password" required minLength={8} />
            <Button type="submit" className="mt-2">
              Add staff
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All staff ({staff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>
                    {u.email}
                    {u.phone && ` · ${u.phone}`}
                  </TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} type="user" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <form action={changeStaffRole} className="flex items-center gap-1">
                        <input type="hidden" name="userId" value={u.id} />
                        <NativeSelect name="role" defaultValue={u.role} className="w-40">
                          {STAFF_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </NativeSelect>
                        <Button type="submit" size="sm" variant="outline">
                          Save
                        </Button>
                      </form>
                      <form action={changeStaffStatus} className="flex items-center gap-1">
                        <input type="hidden" name="userId" value={u.id} />
                        <NativeSelect name="status" defaultValue={u.status} className="w-40">
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </NativeSelect>
                        <Button type="submit" size="sm" variant="outline">
                          Save
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
