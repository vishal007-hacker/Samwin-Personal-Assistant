// Proactive notifications sent via WhatsApp to whitelisted admin phones.
// Schedule time is read from AISettings (singleton). Designed to be safe-to-skip:
// if WhatsApp isn't ready, jobs log and continue.

const cron = require('node-cron');
const AllowedNumber = require('../models/AllowedNumber');
const AISettings = require('../models/AISettings');
const whatsappBot = require('./whatsappBotService');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Account = require('../models/Account');
const Credit = require('../models/Credit');

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Convert "HH:MM" to cron expression "M H * * *"
function timeToCron(timeStr) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr || '').trim());
  if (!m) return '30 8 * * *'; // safe fallback
  const hh = Math.max(0, Math.min(23, Number(m[1])));
  const mm = Math.max(0, Math.min(59, Number(m[2])));
  return `${mm} ${hh} * * *`;
}

async function getAdminPhones() {
  const docs = await AllowedNumber.find({ isActive: true, role: 'admin' });
  return docs.map((d) => d.phone);
}

async function sendToAdmins(text) {
  const status = whatsappBot.getStatus();
  if (!status.ready) {
    console.log('[AI-NOTIF] WhatsApp not ready, skipping:', text.slice(0, 60));
    return;
  }
  const phones = await getAdminPhones();
  for (const p of phones) {
    try {
      await whatsappBot.send(p, text);
    } catch (err) {
      console.error(`[AI-NOTIF] send failed to ${p}:`, err.message);
    }
  }
}

// Yesterday's business summary
async function buildDailySummary() {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const dateLabel = start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const [salesAgg, expenseAgg, accounts, dueCredits] = await Promise.all([
    Sale.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Account.find({}),
    Credit.find({ status: 'open', dueDate: { $lte: new Date(Date.now() + 7 * 86400000) } })
      .populate('customer', 'name phone').limit(10),
  ]);

  const salesTotal = salesAgg[0]?.total || 0;
  const salesCount = salesAgg[0]?.count || 0;
  const expTotal = expenseAgg[0]?.total || 0;
  const expCount = expenseAgg[0]?.count || 0;
  const net = salesTotal - expTotal;

  const sections = { recharge: 0, banking: 0, aeps: 0, cash: 0 };
  for (const a of accounts) sections[a.section] = (sections[a.section] || 0) + (a.balance || 0);
  const grandTotal = Object.values(sections).reduce((s, v) => s + v, 0);

  const lines = [
    `📊 *Daily Summary — ${dateLabel}*`,
    ``,
    `*Sales:* ${salesCount} (${inr(salesTotal)})`,
    `*Expenses:* ${expCount} (${inr(expTotal)})`,
    `*Net:* ${inr(net)}`,
    ``,
    `*Wallet balances:*`,
    `  Cash: ${inr(sections.cash)}`,
    `  Recharge: ${inr(sections.recharge)}`,
    `  Banking: ${inr(sections.banking)}`,
    `  AEPS: ${inr(sections.aeps)}`,
    `  *Total:* ${inr(grandTotal)}`,
  ];

  if (dueCredits.length > 0) {
    lines.push('', `⚠️ *${dueCredits.length} credit(s) due in next 7 days:*`);
    for (const c of dueCredits.slice(0, 5)) {
      lines.push(`  • ${c.customer?.name || '?'} — ${inr(c.balanceAmount)} (${new Date(c.dueDate).toLocaleDateString('en-IN')})`);
    }
  }

  lines.push('', '_Samwin Infotech AI Assistant_');
  return lines.join('\n');
}

// Cron job handle so we can stop/restart on settings change
let dailySummaryJob = null;
let started = false;

async function registerDailySummaryJob() {
  if (dailySummaryJob) {
    try { dailySummaryJob.stop(); } catch { /* ignore */ }
    dailySummaryJob = null;
  }
  const settings = await AISettings.get();
  if (!settings.dailySummaryEnabled) {
    console.log('[AI-NOTIF] Daily summary disabled in settings');
    return;
  }
  const cronExpr = timeToCron(settings.dailySummaryTime);
  dailySummaryJob = cron.schedule(cronExpr, async () => {
    try {
      console.log('[AI-NOTIF] Daily summary cron firing');
      const msg = await buildDailySummary();
      await sendToAdmins(msg);
    } catch (err) {
      console.error('[AI-NOTIF] Daily summary failed:', err.message);
    }
  });
  console.log(`AI notification service: daily summary scheduled for ${settings.dailySummaryTime} (cron: ${cronExpr})`);
}

async function startAINotifications() {
  if (started) return;
  started = true;
  try {
    await registerDailySummaryJob();
  } catch (err) {
    console.error('[AI-NOTIF] Failed to start:', err.message);
  }
}

// Re-read settings and re-register the cron (called after PUT /api/ai/settings)
async function reloadSchedule() {
  await registerDailySummaryJob();
}

// Expose builder for manual testing via /api/ai/test-notification
async function runNotification(type) {
  if (type === 'daily-summary') {
    const msg = await buildDailySummary();
    await sendToAdmins(msg);
    return msg;
  }
  throw new Error(`Unknown notification type: ${type}`);
}

module.exports = { startAINotifications, reloadSchedule, runNotification };
