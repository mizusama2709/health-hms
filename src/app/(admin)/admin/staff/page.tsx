import { requireTenantId } from "@/lib/tenant";
import { listStaff } from "@/lib/staff";
import { createStaff, changeStaffRole, changeStaffStatus } from "./actions";

const STAFF_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN", "NURSE", "RECEPTIONIST", "LAB", "PHARMACIST"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export default async function StaffPage() {
  const tenantId = await requireTenantId();
  const staff = await listStaff(tenantId);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Staff</h1>

      <section style={{ marginTop: 24 }}>
        <h2>Add staff</h2>
        <form action={createStaff} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
          <input name="name" placeholder="Full name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="phone" placeholder="Phone (optional)" />
          <select name="role" required>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input name="password" type="password" placeholder="Temporary password" required minLength={8} />
          <button type="submit">Add staff</button>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>All staff ({staff.length})</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {staff.map((u) => (
            <li key={u.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div>
                <b>{u.name}</b> — {u.email} {u.phone && `· ${u.phone}`}
              </div>
              <div>
                Role: {u.role} · Status: {u.status}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <form action={changeStaffRole} style={{ display: "flex", gap: 4 }}>
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="role" defaultValue={u.role}>
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button type="submit">Change role</button>
                </form>
                <form action={changeStaffStatus} style={{ display: "flex", gap: 4 }}>
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="status" defaultValue={u.status}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button type="submit">Change status</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
