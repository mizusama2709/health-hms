import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAppointmentForCalendar } from "@/lib/appointments";

function formatDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DoctorCalendar({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;
  const tenantId = session!.user.tenantId!;

  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    return <main><h1>Calendar</h1><p>No doctor profile linked to this account.</p></main>;
  }

  const day = date ? new Date(date) : new Date();
  const prev = new Date(day);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);

  const appointments = await getAppointmentForCalendar(doctor.id, tenantId, day);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto" }}>
      <h1>Calendar</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "16px 0" }}>
        <a href={`/doctor/calendar?date=${formatDateParam(prev)}`}>&larr; Prev</a>
        <b>{day.toDateString()}</b>
        <a href={`/doctor/calendar?date=${formatDateParam(next)}`}>Next &rarr;</a>
        <a href="/doctor" style={{ marginLeft: "auto" }}>Back to schedule</a>
      </div>

      {appointments.length === 0 && <p>No appointments on this day.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {appointments.map((appt) => (
          <li key={appt.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div>
              <b>{new Date(appt.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>
              {" — "}
              {appt.patient.user.name}
            </div>
            <div>Type: {appt.type} · Status: {appt.status}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
