import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listAppointmentsForDoctor } from "@/lib/appointments";
import { setAppointmentStatus } from "./actions";

export default async function DoctorHome() {
  const session = await auth();
  const userId = session!.user.id;
  const tenantId = session!.user.tenantId!;

  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    return <main><h1>Doctor dashboard</h1><p>No doctor profile linked to this account.</p></main>;
  }

  const appointments = await listAppointmentsForDoctor(doctor.id, tenantId);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto" }}>
      <h1>Your schedule</h1>
      {appointments.length === 0 && <p>No appointments yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {appointments.map((appt) => (
          <li key={appt.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div><b>{appt.patient.user.name}</b> — {new Date(appt.datetime).toLocaleString()}</div>
            <div>Type: {appt.type} · Status: {appt.status}</div>
            {appt.status === "BOOKED" && (
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <form action={async () => { "use server"; await setAppointmentStatus(appt.id, "COMPLETED"); }}>
                  <button type="submit">Mark completed</button>
                </form>
                <form action={async () => { "use server"; await setAppointmentStatus(appt.id, "NO_SHOW"); }}>
                  <button type="submit">Mark no-show</button>
                </form>
                <form action={async () => { "use server"; await setAppointmentStatus(appt.id, "CANCELLED"); }}>
                  <button type="submit">Cancel</button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
