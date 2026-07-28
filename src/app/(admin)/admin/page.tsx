import { requireTenantId } from "@/lib/tenant";
import { listAppointmentsForTenant, listDoctorsForTenant } from "@/lib/appointments";
import { bookWalkIn, addDoctor } from "./actions";

export default async function AdminHome() {
  const tenantId = await requireTenantId();
  const [appointments, doctors] = await Promise.all([
    listAppointmentsForTenant(tenantId),
    listDoctorsForTenant(tenantId),
  ]);

  return (
    <main style={{ maxWidth: 800, margin: "40px auto" }}>
      <h1>Admin / reception console</h1>

      <section style={{ marginTop: 24 }}>
        <h2>Doctors</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {doctors.map((d) => (
            <li key={d.id}>{d.user.name} — {d.specialty} ({d.user.email})</li>
          ))}
        </ul>
        <form action={addDoctor} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360, marginTop: 12 }}>
          <input name="name" placeholder="Full name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="specialty" placeholder="Specialty" required />
          <input name="password" type="password" placeholder="Temporary password" required minLength={8} />
          <button type="submit">Add doctor</button>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Book a walk-in</h2>
        <form action={bookWalkIn} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
          <select name="doctorId" required>
            <option value="">Select doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.user.name} — {d.specialty}</option>
            ))}
          </select>
          <input name="patientEmail" type="email" placeholder="Patient email" required />
          <input name="datetime" type="datetime-local" required />
          <button type="submit">Book appointment</button>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>All appointments</h2>
        {appointments.length === 0 && <p>No appointments yet.</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {appointments.map((appt) => (
            <li key={appt.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div><b>{appt.patient.user.name}</b> with Dr. {appt.doctor.user.name} — {new Date(appt.datetime).toLocaleString()}</div>
              <div>Type: {appt.type} · Status: {appt.status}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
