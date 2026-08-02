import { db } from "@/lib/db";

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getOpdToday(tenantId: string) {
  const start = startOfToday();
  const end = endOfToday();

  const [awaiting, completed] = await Promise.all([
    db.appointment.count({
      where: { tenantId, datetime: { gte: start, lte: end }, status: "BOOKED" },
    }),
    db.appointment.count({
      where: { tenantId, datetime: { gte: start, lte: end }, status: "COMPLETED" },
    }),
  ]);

  return { awaiting, completed };
}

export async function getOpdPipeline(tenantId: string, days = 30) {
  const since = daysAgo(days);

  const [newPatients, appointmentBooked, paymentPending, paymentCollected, followUp, enquiry] = await Promise.all([
    db.patient.count({ where: { tenantId, user: { createdAt: { gte: since } } } }),
    db.appointment.count({ where: { tenantId, status: "BOOKED", createdAt: { gte: since } } }),
    db.invoice.count({ where: { tenantId, status: { in: ["UNPAID", "PARTIALLY_PAID"] }, createdAt: { gte: since } } }),
    db.invoice.count({ where: { tenantId, status: "PAID", createdAt: { gte: since } } }),
    db.followUp.count({ where: { appointment: { tenantId }, status: "pending" } }),
    db.whatsAppMessage.count({
      where: { tenantId, direction: "INBOUND", parsedIntent: "UNKNOWN", createdAt: { gte: since } },
    }),
  ]);

  const rows = [
    { label: "New Patients", value: newPatients },
    { label: "Appointment Booked", value: appointmentBooked },
    { label: "Payment Pending", value: paymentPending },
    { label: "Enquiry", value: enquiry },
    { label: "Payment Collected", value: paymentCollected },
    { label: "Follow Up", value: followUp },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));
  return rows.map((r) => ({ ...r, pct: Math.round((r.value / max) * 100) }));
}

export async function getDoctorPerformance(tenantId: string, days = 30) {
  const since = daysAgo(days);

  const doctors = await db.doctor.findMany({
    where: { tenantId },
    include: { user: true },
  });

  const performance = await Promise.all(
    doctors.map(async (doctor) => {
      const appointments = await db.appointment.findMany({
        where: { tenantId, doctorId: doctor.id, createdAt: { gte: since } },
        select: { status: true, feeAmount: true },
      });

      const completed = appointments.filter((a) => a.status === "COMPLETED");
      const cancelled = appointments.filter((a) => a.status === "CANCELLED" || a.status === "NO_SHOW");
      const revenue = completed.reduce((sum, a) => sum + Number(a.feeAmount ?? 0), 0);
      const avgFee = completed.length > 0 ? revenue / completed.length : 0;

      return {
        doctorId: doctor.id,
        name: doctor.user.name,
        specialty: doctor.specialty,
        total: appointments.length,
        completed: completed.length,
        cancelled: cancelled.length,
        revenue,
        avgFee,
      };
    })
  );

  return performance.sort((a, b) => b.total - a.total);
}

export async function getPharmacyStats(tenantId: string, days = 30) {
  const since = daysAgo(days);
  const expiryHorizon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [pharmacyInvoices, medicines, goodsReceiptLines, dispensedItems, unpricedCount, expiringBatches] =
    await Promise.all([
      db.invoice.findMany({
        where: { tenantId, serviceType: "PHARMACY", createdAt: { gte: since } },
        select: { totalAmount: true },
      }),
      db.medicine.findMany({ where: { tenantId }, select: { id: true, name: true, unitPrice: true, stockQuantity: true } }),
      db.goodsReceiptLineItem.findMany({
        where: { goodsReceipt: { tenantId } },
        select: { medicineId: true, unitCost: true, quantityReceived: true },
      }),
      db.prescriptionItem.findMany({
        where: {
          prescription: { tenantId, status: "DISPENSED", updatedAt: { gte: since } },
        },
        select: { medicineId: true, quantity: true, medicine: { select: { name: true, unitPrice: true } } },
      }),
      db.medicine.count({ where: { tenantId, unitPrice: 0 } }),
      db.medicineBatch.findMany({
        where: { tenantId, expiryDate: { lte: expiryHorizon }, availableQty: { gt: 0 } },
        select: { availableQty: true, medicine: { select: { unitPrice: true } } },
      }),
    ]);

  const expiringSoonCount = expiringBatches.reduce((sum, b) => sum + b.availableQty, 0);
  const expiringSoonValueAtMrp = expiringBatches.reduce(
    (sum, b) => sum + b.availableQty * Number(b.medicine.unitPrice),
    0
  );

  const revenue = pharmacyInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  // Weighted-average cost per medicine from goods receipts.
  const costTotals = new Map<string, { totalCost: number; totalQty: number }>();
  for (const line of goodsReceiptLines) {
    const entry = costTotals.get(line.medicineId) ?? { totalCost: 0, totalQty: 0 };
    entry.totalCost += Number(line.unitCost) * line.quantityReceived;
    entry.totalQty += line.quantityReceived;
    costTotals.set(line.medicineId, entry);
  }

  let inventoryAtCost = 0;
  let inventoryAtMrp = 0;
  const movedMedicineIds = new Set(dispensedItems.map((i) => i.medicineId));
  let deadStockAtCost = 0;

  for (const medicine of medicines) {
    const costEntry = costTotals.get(medicine.id);
    const avgCost = costEntry && costEntry.totalQty > 0 ? costEntry.totalCost / costEntry.totalQty : Number(medicine.unitPrice);
    inventoryAtCost += avgCost * medicine.stockQuantity;
    inventoryAtMrp += Number(medicine.unitPrice) * medicine.stockQuantity;

    if (medicine.stockQuantity > 0 && !movedMedicineIds.has(medicine.id)) {
      deadStockAtCost += avgCost * medicine.stockQuantity;
    }
  }

  const topMovingMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const item of dispensedItems) {
    const entry = topMovingMap.get(item.medicineId) ?? { name: item.medicine.name, qty: 0, revenue: 0 };
    entry.qty += item.quantity;
    entry.revenue += item.quantity * Number(item.medicine.unitPrice);
    topMovingMap.set(item.medicineId, entry);
  }
  const topMoving = [...topMovingMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  return {
    revenue,
    billsCount: pharmacyInvoices.length,
    inventoryAtCost,
    inventoryAtMrp,
    deadStockAtCost,
    skuCount: medicines.length,
    topMoving,
    unpricedCount,
    expiringSoonCount,
    expiringSoonValueAtMrp,
  };
}

export async function getDashboardSummary(tenantId: string) {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const monthStart = startOfMonth();

  const [
    totalPatients,
    appointmentsToday,
    confirmedToday,
    completedToday,
    monthInvoices,
    consultationsThisMonth,
  ] = await Promise.all([
    db.patient.count({ where: { tenantId } }),
    db.appointment.count({ where: { tenantId, datetime: { gte: todayStart, lte: todayEnd } } }),
    db.appointment.count({
      where: { tenantId, datetime: { gte: todayStart, lte: todayEnd }, status: "BOOKED" },
    }),
    db.appointment.count({
      where: { tenantId, datetime: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" },
    }),
    db.invoice.findMany({
      where: { tenantId, createdAt: { gte: monthStart } },
      select: { totalAmount: true, amountPaid: true, status: true },
    }),
    db.appointment.count({
      where: {
        tenantId,
        serviceType: "CONSULTATION",
        status: "COMPLETED",
        datetime: { gte: monthStart },
      },
    }),
  ]);

  const revenueThisMonth = monthInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
  const pendingThisMonth = monthInvoices
    .filter((inv) => inv.status === "UNPAID" || inv.status === "PARTIALLY_PAID")
    .reduce((sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.amountPaid)), 0);

  return {
    totalPatients,
    appointmentsToday: { completed: completedToday, total: appointmentsToday, confirmed: confirmedToday },
    revenueThisMonth,
    pendingThisMonth,
    consultationsThisMonth,
  };
}

export async function listUpcomingAppointments(tenantId: string, limit = 5) {
  const now = new Date();

  const [upcoming, totalUpcoming] = await Promise.all([
    db.appointment.findMany({
      where: { tenantId, status: "BOOKED", datetime: { gte: now } },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
      orderBy: { datetime: "asc" },
      take: limit,
    }),
    db.appointment.count({ where: { tenantId, status: "BOOKED", datetime: { gte: now } } }),
  ]);

  return { upcoming, totalUpcoming };
}
