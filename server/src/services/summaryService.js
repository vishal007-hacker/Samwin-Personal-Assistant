// Template-based summary builder. NO AI/LLM — pure Prisma queries + string
// formatting. Produces audience-specific WhatsApp summaries:
//   - owner:    full business stats (sales, expenses, balances, alerts)
//   - worker:   per-employee task list (attendance, maintenance, pending services)
//   - customer: per-customer account info (credits, services, insurance)
//
// Each builder returns { recipients: [{ phone, name, message }], skipped: [...] }
// so the broadcast endpoint just sends them through the bot.

const prisma = require('../config/prisma');

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';

function todayRange() {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 999);
  return { from: s, to: e };
}

// ── OWNER summary ───────────────────────────────────────────────────────────

async function buildOwnerSummary({ ownerPhones } = {}) {
  const recipients = [];
  const skipped = [];

  // If caller provided explicit phones, use them. Otherwise fall back to
  // admin users with a phone number in the User table.
  let owners;
  if (Array.isArray(ownerPhones) && ownerPhones.length > 0) {
    owners = ownerPhones
      .map((p) => ({
        phone: String(p || '').replace(/\D/g, ''),
        name: 'Merlin S',
      }))
      .filter((o) => o.phone.length >= 7);
    if (owners.length === 0) {
      return { recipients, skipped: [{ reason: 'No valid phone numbers provided' }] };
    }
  } else {
    owners = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });
    owners = owners.filter((u) => u.phone && String(u.phone).replace(/\D/g, '').length >= 7);
    if (owners.length === 0) {
      return { recipients, skipped: [{ reason: 'No admin user with a phone number found. Provide phones manually.' }] };
    }
  }

  const { from, to } = todayRange();
  const sevenDays = new Date(); sevenDays.setDate(sevenDays.getDate() + 7);
  const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);

  const [salesAgg, expenseAgg, accounts, openCredits, pendingDevices, expiringInsurance] = await Promise.all([
    prisma.sale.aggregate({
      where: { date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.account.findMany({}),
    prisma.credit.findMany({
      where: { status: 'open', dueDate: { lte: sevenDays } },
      include: { customer: { select: { id: true, name: true } } },
    }),
    prisma.deviceService.findMany({ where: { status: { in: ['pending', 'ready'] } }, take: 20 }),
    prisma.vehicleInsurance.findMany({
      where: { policyExpiryDate: { lte: thirtyDays }, status: { not: 'renewed' } },
      take: 20,
    }),
  ]);

  const salesTotal = salesAgg._sum.amount || 0;
  const salesCount = salesAgg._count || 0;
  const expTotal = expenseAgg._sum.amount || 0;
  const expCount = expenseAgg._count || 0;
  const net = salesTotal - expTotal;

  const sums = { recharge: 0, banking: 0, aeps: 0, cash: 0 };
  for (const a of accounts) sums[a.section] = (sums[a.section] || 0) + (a.balance || 0);
  const grandTotal = sums.recharge + sums.banking + sums.aeps + sums.cash;

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  for (const owner of owners) {
    const lines = [
      `*Samwin Infotech — Daily Summary*`,
      `${dateLabel}`,
      ``,
      `📊 *Today's Business*`,
      `• Sales: ${salesCount} (${inr(salesTotal)})`,
      `• Expenses: ${expCount} (${inr(expTotal)})`,
      `• Net: ${inr(net)}`,
      ``,
      `💰 *Wallet Balances*`,
      `• Cash: ${inr(sums.cash)}`,
      `• Banking: ${inr(sums.banking)}`,
      `• Recharge: ${inr(sums.recharge)}`,
      `• AEPS: ${inr(sums.aeps)}`,
      `• *Total: ${inr(grandTotal)}*`,
    ];

    if (openCredits.length || pendingDevices.length || expiringInsurance.length) {
      lines.push('', '⚠️ *Needs Attention*');
      if (openCredits.length) lines.push(`• ${openCredits.length} credit(s) due ≤ 7 days`);
      if (pendingDevices.length) lines.push(`• ${pendingDevices.length} pending device service(s)`);
      if (expiringInsurance.length) lines.push(`• ${expiringInsurance.length} insurance expiring ≤ 30 days`);
    }

    if (openCredits.length > 0) {
      lines.push('', '*Top credit dues:*');
      for (const c of openCredits.slice(0, 5)) {
        lines.push(`  - ${c.customer?.name || '?'} ${inr(c.balanceAmount)} (${fmtDate(c.dueDate)})`);
      }
    }

    lines.push('', '— Samwin Infotech');

    recipients.push({
      phone: owner.phone,
      name: owner.name,
      message: lines.join('\n'),
    });
  }

  return { recipients, skipped };
}
// ── WORKER summary ──────────────────────────────────────────────────────────

async function buildWorkerSummary() {
  const recipients = [];
  const skipped = [];

  const employees = await prisma.employee.findMany({ where: { isActive: true } });
  const filteredEmps = employees.filter((e) => e.phone && String(e.phone).replace(/\D/g, '').length >= 7);
  if (filteredEmps.length === 0) {
    return { recipients, skipped: [{ reason: 'No active employees with phone numbers' }] };
  }

  // Today's attendance for all employees
  const { from, to } = todayRange();
  const todayAttendance = await prisma.attendance.findMany({ where: { date: { gte: from, lte: to } } });
  const attendanceByEmp = {};
  for (const a of todayAttendance) attendanceByEmp[String(a.employeeId)] = a;

  // Maintenance due in next 7 days (shared task list — everyone sees the same)
  const sevenDays = new Date(); sevenDays.setDate(sevenDays.getDate() + 7);
  const upcomingMaintenance = await prisma.maintenanceProduct.findMany({
    where: { isActive: true, nextMaintenanceDate: { lte: sevenDays } },
    take: 10,
  });

  // Devices ready for delivery (likely the staff is involved)
  const readyDevices = await prisma.deviceService.findMany({ where: { status: 'ready' }, take: 15 });
  // Devices still pending
  const pendingDevices = await prisma.deviceService.findMany({ where: { status: 'pending' }, take: 15 });

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  for (const emp of filteredEmps) {
    const today = attendanceByEmp[String(emp.id)];
    const lines = [
      `Hi *${emp.name}*,`,
      ``,
      `📋 *Tasks — ${dateLabel}*`,
      ``,
      today
        ? `✅ Attendance marked (${today.status})`
        : `⚠️ Attendance NOT marked yet`,
    ];

    if (readyDevices.length > 0) {
      lines.push('', `📦 *${readyDevices.length} device(s) ready for delivery:*`);
      for (const d of readyDevices.slice(0, 5)) {
        lines.push(`  - ${d.customerName} — ${d.deviceType}${d.serialNo ? ` (${d.serialNo})` : ''}`);
      }
    }

    if (pendingDevices.length > 0) {
      lines.push('', `🔧 *${pendingDevices.length} device(s) pending service*`);
    }

    if (upcomingMaintenance.length > 0) {
      lines.push('', `🛠️ *Maintenance due this week:*`);
      for (const m of upcomingMaintenance.slice(0, 5)) {
        lines.push(`  - ${m.name} — ${fmtDate(m.nextMaintenanceDate)}`);
      }
    }

    lines.push('', '— Samwin Infotech');

    recipients.push({
      phone: emp.phone,
      name: emp.name,
      message: lines.join('\n'),
    });
  }

  return { recipients, skipped };
}
// ── CUSTOMER summary ────────────────────────────────────────────────────────

async function buildCustomerSummary() {
  const recipients = [];
  const skipped = [];

  // Get customers with a phone number (bulk, then filter)
  const allCustomers = await prisma.customer.findMany({});
  const customers = allCustomers.filter((c) => c.phone && String(c.phone).replace(/\D/g, '').length >= 7);
  if (customers.length === 0) {
    return { recipients, skipped: [{ reason: 'No customers with phone numbers' }] };
  }

  const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);

  const customerIds = customers.map((c) => c.id);
  const customerPhones = customers.map((c) => c.phone).filter(Boolean);

  // Bulk-fetch related data and index by customer id / phone
  const [openCredits, pendingDevices, expiringIns] = await Promise.all([
    prisma.credit.findMany({ where: { customerId: { in: customerIds }, status: 'open' } }),
    // device service uses customerPhone (not ref), so we filter on phone
    prisma.deviceService.findMany({
      where: { status: { in: ['pending', 'ready'] }, customerPhone: { in: customerPhones } },
    }),
    prisma.vehicleInsurance.findMany({
      where: { customerId: { in: customerIds }, policyExpiryDate: { lte: thirtyDays }, status: { not: 'renewed' } },
    }),
  ]);

  const creditsByCustomer = {};
  for (const cr of openCredits) {
    const k = String(cr.customerId);
    (creditsByCustomer[k] = creditsByCustomer[k] || []).push(cr);
  }
  const devicesByPhone = {};
  for (const d of pendingDevices) {
    const k = String(d.customerPhone || '').replace(/\D/g, '');
    if (k) (devicesByPhone[k] = devicesByPhone[k] || []).push(d);
  }
  const insByCustomer = {};
  for (const ins of expiringIns) {
    const k = String(ins.customerId);
    (insByCustomer[k] = insByCustomer[k] || []).push(ins);
  }

  for (const c of customers) {
    const myCredits = creditsByCustomer[String(c.id)] || [];
    const myDevices = devicesByPhone[String(c.phone || '').replace(/\D/g, '')] || [];
    const myIns = insByCustomer[String(c.id)] || [];

    // Skip customers with nothing relevant to report
    if (myCredits.length === 0 && myDevices.length === 0 && myIns.length === 0) {
      skipped.push({ name: c.name, phone: c.phone, reason: 'no actionable items' });
      continue;
    }

    const lines = [
      `Hi *${c.name}*,`,
      ``,
      `📋 *Your account update from Samwin Infotech:*`,
    ];

    if (myCredits.length > 0) {
      const totalDue = myCredits.reduce((s, cr) => s + (cr.balanceAmount || 0), 0);
      lines.push('', `💰 *Outstanding credit:* ${inr(totalDue)}`);
      for (const cr of myCredits.slice(0, 3)) {
        lines.push(`  - ${cr.reason}: ${inr(cr.balanceAmount)} (due ${fmtDate(cr.dueDate)})`);
      }
    }

    if (myDevices.length > 0) {
      lines.push('', `🔧 *Your device(s) in service:*`);
      for (const d of myDevices.slice(0, 3)) {
        const stat = d.status === 'ready' ? 'Ready for pickup ✓' : 'Being serviced';
        lines.push(`  - ${d.deviceType}: ${stat}`);
      }
    }

    if (myIns.length > 0) {
      lines.push('', `🚗 *Insurance expiring soon:*`);
      for (const ins of myIns.slice(0, 3)) {
        lines.push(`  - ${ins.vehicleBrand} ${ins.model || ''} — ${fmtDate(ins.policyExpiryDate)}`);
      }
    }

    lines.push('', 'For any questions, please contact us.', '', '— *Samwin Infotech*', 'Ph: +91 9566181510');

    recipients.push({
      phone: c.phone,
      name: c.name,
      message: lines.join('\n'),
    });
  }

  return { recipients, skipped };
}
// ── Dispatcher ──────────────────────────────────────────────────────────────

async function buildSummary(audience, opts = {}) {
  switch (audience) {
    case 'owners':    return buildOwnerSummary(opts);
    case 'workers':   return buildWorkerSummary();
    case 'customers': return buildCustomerSummary();
    default:          throw new Error(`Unknown audience: ${audience}`);
  }
}

module.exports = { buildOwnerSummary, buildWorkerSummary, buildCustomerSummary, buildSummary };