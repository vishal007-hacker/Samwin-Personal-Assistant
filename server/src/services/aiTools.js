// Registry of tools the AI agent can call.
// Each tool has:
//   - name (snake_case)
//   - description (shown to the LLM)
//   - parameters (JSON schema describing args)
//   - execute(args, ctx) -> Promise<{ ok, data?, error? }>
//   - isWrite (boolean) — write tools require confirmation flow

const Sale = require('../models/Sale');
const SalesCategory = require('../models/SalesCategory');
const Customer = require('../models/Customer');
const Credit = require('../models/Credit');
const Stock = require('../models/Stock');
const Expense = require('../models/Expense');
const ExpenseCategory = require('../models/ExpenseCategory');
const Account = require('../models/Account');
const DeviceService = require('../models/DeviceService');
const VehicleInsurance = require('../models/VehicleInsurance');

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';

function parseDateRange(from, to) {
  const out = {};
  if (from) out.from = new Date(from);
  if (to) {
    const t = new Date(to);
    t.setHours(23, 59, 59, 999);
    out.to = t;
  }
  return out;
}

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { from: start, to: end };
}

// ── Read-only tools ────────────────────────────────────────────────────────

const tools = {
  get_sales_summary: {
    description: 'Get sales totals for a date range. Use this for "today\'s sales", "this month sales", or any sales question.',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date YYYY-MM-DD (optional, defaults to today)' },
        to: { type: 'string', description: 'End date YYYY-MM-DD (optional, defaults to today)' },
      },
    },
    isWrite: false,
    async execute(args) {
      let { from, to } = args || {};
      if (!from && !to) {
        const r = todayRange();
        from = r.from; to = r.to;
      } else {
        const r = parseDateRange(from, to);
        from = r.from; to = r.to;
      }
      const match = { date: { $gte: from, $lte: to } };
      const [total, byCategory, byPayment] = await Promise.all([
        Sale.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
        Sale.aggregate([{ $match: match }, { $group: { _id: '$categoryName', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 5 }]),
        Sale.aggregate([{ $match: match }, { $group: { _id: '$paymentMethod', total: { $sum: '$amount' } } }]),
      ]);
      return {
        ok: true,
        data: {
          totalAmount: total[0]?.total || 0,
          count: total[0]?.count || 0,
          dateRange: { from: from.toISOString(), to: to.toISOString() },
          topCategories: byCategory.map((c) => ({ name: c._id, total: c.total, count: c.count })),
          byPaymentMethod: byPayment.map((p) => ({ method: p._id, total: p.total })),
          formatted: `${total[0]?.count || 0} sales, ${inr(total[0]?.total || 0)} total`,
        },
      };
    },
  },

  get_customer_credit: {
    description: 'Look up a customer\'s outstanding credit/loan balance by their name or phone number.',
    parameters: {
      type: 'object',
      properties: {
        nameOrPhone: { type: 'string', description: 'Customer name or phone number to search for' },
      },
      required: ['nameOrPhone'],
    },
    isWrite: false,
    async execute(args) {
      const q = String(args?.nameOrPhone || '').trim();
      if (!q) return { ok: false, error: 'nameOrPhone is required' };
      const customers = await Customer.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { phone: { $regex: q.replace(/\D/g, ''), $options: 'i' } },
        ],
      }).limit(5);

      if (customers.length === 0) return { ok: true, data: { found: false, message: `No customer matching "${q}"` } };

      const results = await Promise.all(customers.map(async (c) => {
        const credits = await Credit.find({ customer: c._id, status: 'open' });
        const balance = credits.reduce((s, cr) => s + (cr.balanceAmount || 0), 0);
        return {
          name: c.name,
          phone: c.phone,
          openCredits: credits.length,
          totalBalance: balance,
          credits: credits.map((cr) => ({ reason: cr.reason, balance: cr.balanceAmount, dueDate: cr.dueDate })),
        };
      }));
      return { ok: true, data: { found: true, results } };
    },
  },

  get_stock_summary: {
    description: 'Get inventory counts and values. Optionally filter by category (mobile, phone_accessory, computer_accessory).',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['mobile', 'phone_accessory', 'computer_accessory'], description: 'Optional category filter' },
      },
    },
    isWrite: false,
    async execute(args) {
      const match = {};
      if (args?.category) match.category = args.category;
      const [inStock, sold, byBrand] = await Promise.all([
        Stock.aggregate([{ $match: { ...match, status: 'in_stock' } }, { $group: { _id: null, count: { $sum: 1 }, totalCost: { $sum: '$purchasePrice' }, totalValue: { $sum: '$sellingPrice' } } }]),
        Stock.aggregate([{ $match: { ...match, status: 'sold' } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$soldTo.finalPrice', '$sellingPrice'] } } } }]),
        Stock.aggregate([{ $match: { ...match, status: 'in_stock' } }, { $group: { _id: '$brand', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      ]);
      return {
        ok: true,
        data: {
          inStockCount: inStock[0]?.count || 0,
          inStockCost: inStock[0]?.totalCost || 0,
          inStockSellingValue: inStock[0]?.totalValue || 0,
          soldCount: sold[0]?.count || 0,
          soldRevenue: sold[0]?.revenue || 0,
          topBrands: byBrand.map((b) => ({ brand: b._id, count: b.count })),
          formatted: `${inStock[0]?.count || 0} in stock (worth ${inr(inStock[0]?.totalValue || 0)}), ${sold[0]?.count || 0} sold`,
        },
      };
    },
  },

  get_pending_device_services: {
    description: 'List devices currently being serviced (status = pending or ready).',
    parameters: { type: 'object', properties: {} },
    isWrite: false,
    async execute() {
      const docs = await DeviceService.find({ status: { $in: ['pending', 'ready'] } }).sort({ date: 1 }).limit(20);
      return {
        ok: true,
        data: {
          count: docs.length,
          devices: docs.map((d) => ({
            id: String(d._id),
            date: d.date,
            deviceType: d.deviceType,
            serialNo: d.serialNo,
            customerName: d.customerName,
            customerPhone: d.customerPhone,
            problem: d.problem,
            status: d.status,
            amount: d.amount,
          })),
        },
      };
    },
  },

  get_account_balances: {
    description: 'Get current wallet balances across Recharge / Banking / AEPS / Cash sections.',
    parameters: { type: 'object', properties: {} },
    isWrite: false,
    async execute() {
      const all = await Account.find({}).sort({ section: 1, order: 1 });
      const sections = { recharge: 0, banking: 0, aeps: 0, cash: 0 };
      const items = [];
      for (const a of all) {
        sections[a.section] = (sections[a.section] || 0) + (a.balance || 0);
        items.push({ section: a.section, name: a.name, balance: a.balance || 0 });
      }
      const grandTotal = Object.values(sections).reduce((s, v) => s + v, 0);
      return {
        ok: true,
        data: {
          sections,
          grandTotal,
          items,
          formatted: `Grand Total: ${inr(grandTotal)} (Recharge ${inr(sections.recharge)} · Banking ${inr(sections.banking)} · AEPS ${inr(sections.aeps)} · Cash ${inr(sections.cash)})`,
        },
      };
    },
  },

  get_expiring_insurance: {
    description: 'List vehicle insurance policies expiring within the next N days (default 30).',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days ahead to check (default 30)' },
      },
    },
    isWrite: false,
    async execute(args) {
      const days = Number(args?.days) || 30;
      const future = new Date();
      future.setDate(future.getDate() + days);
      const docs = await VehicleInsurance.find({
        policyExpiryDate: { $lte: future },
        status: { $ne: 'renewed' },
      }).populate('customer', 'name phone').sort({ policyExpiryDate: 1 }).limit(30);
      return {
        ok: true,
        data: {
          count: docs.length,
          policies: docs.map((p) => ({
            customer: p.customer?.name,
            phone: p.customer?.phone,
            vehicleNumber: p.vehicleNumber,
            insuranceType: p.insuranceType,
            policyNumber: p.policyNumber,
            expiryDate: p.policyExpiryDate,
            daysLeft: Math.ceil((new Date(p.policyExpiryDate) - new Date()) / 86400000),
          })),
        },
      };
    },
  },

  get_expenses_summary: {
    description: 'Get expense totals for a date range (defaults to today).',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date YYYY-MM-DD' },
        to: { type: 'string', description: 'End date YYYY-MM-DD' },
      },
    },
    isWrite: false,
    async execute(args) {
      let { from, to } = args || {};
      if (!from && !to) {
        const r = todayRange();
        from = r.from; to = r.to;
      } else {
        const r = parseDateRange(from, to);
        from = r.from; to = r.to;
      }
      const match = { date: { $gte: from, $lte: to } };
      const [total, byCategory] = await Promise.all([
        Expense.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
        Expense.aggregate([{ $match: match }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }, { $limit: 5 }]),
      ]);
      return {
        ok: true,
        data: {
          totalAmount: total[0]?.total || 0,
          count: total[0]?.count || 0,
          topCategories: byCategory.map((c) => ({ name: c._id, total: c.total })),
          formatted: `${total[0]?.count || 0} expenses, ${inr(total[0]?.total || 0)} total`,
        },
      };
    },
  },

  // ── Write tools (require confirmation) ─────────────────────────────────

  add_sale: {
    description: 'Record a new sale. The user MUST be asked to confirm before this is actually executed.',
    parameters: {
      type: 'object',
      properties: {
        categoryName: { type: 'string', description: 'Sales category name (must match an existing category)' },
        amount: { type: 'number', description: 'Sale amount in rupees' },
        quantity: { type: 'number', description: 'Quantity (default 1)' },
        paymentMethod: { type: 'string', enum: ['cash', 'upi', 'bank_transfer', 'card', 'other'], description: 'How was it paid (default cash)' },
        customerName: { type: 'string', description: 'Optional customer name' },
        notes: { type: 'string' },
      },
      required: ['categoryName', 'amount'],
    },
    isWrite: true,
    async preview(args) {
      const cat = await SalesCategory.findOne({ name: { $regex: `^${args.categoryName}$`, $options: 'i' } });
      if (!cat) {
        const all = await SalesCategory.find({}).limit(20);
        return { ok: false, error: `Category "${args.categoryName}" not found. Available: ${all.map((c) => c.name).join(', ')}` };
      }
      return {
        ok: true,
        data: {
          summary: `Add ${inr(args.amount)} ${args.paymentMethod || 'cash'} sale under "${cat.name}"${args.customerName ? ` for ${args.customerName}` : ''}`,
          resolved: { categoryId: cat._id, categoryName: cat.name },
        },
      };
    },
    async execute(args, ctx) {
      const cat = await SalesCategory.findOne({ name: { $regex: `^${args.categoryName}$`, $options: 'i' } });
      if (!cat) return { ok: false, error: 'Category not found' };
      const amount = Number(args.amount);
      const quantity = Number(args.quantity) || 1;
      const sale = await Sale.create({
        category: cat._id,
        categoryName: cat.name,
        quantity,
        unitPrice: quantity > 0 ? amount / quantity : amount,
        amount,
        paymentMethod: args.paymentMethod || 'cash',
        date: new Date(),
        customerName: args.customerName || '',
        notes: args.notes || '',
        createdBy: ctx?.userId,
      });
      return { ok: true, data: { id: String(sale._id), summary: `Recorded sale of ${inr(amount)}` } };
    },
  },

  add_expense: {
    description: 'Record a new business expense. Must confirm with user before executing.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short description of the expense' },
        category: { type: 'string', description: 'Expense category name' },
        amount: { type: 'number' },
        paymentMethod: { type: 'string', enum: ['cash', 'upi', 'bank_transfer', 'card', 'other'] },
        notes: { type: 'string' },
      },
      required: ['title', 'category', 'amount'],
    },
    isWrite: true,
    async preview(args) {
      const cat = await ExpenseCategory.findOne({ name: { $regex: `^${args.category}$`, $options: 'i' } });
      if (!cat) {
        const all = await ExpenseCategory.find({}).limit(20);
        return { ok: false, error: `Category "${args.category}" not found. Available: ${all.map((c) => c.name).join(', ') || '(none — add categories from the website first)'}` };
      }
      return { ok: true, data: { summary: `Add ${inr(args.amount)} expense "${args.title}" under "${cat.name}"`, resolved: { category: cat.name } } };
    },
    async execute(args, ctx) {
      const cat = await ExpenseCategory.findOne({ name: { $regex: `^${args.category}$`, $options: 'i' } });
      if (!cat) return { ok: false, error: 'Category not found' };
      const doc = await Expense.create({
        title: args.title,
        category: cat.name,
        amount: Number(args.amount),
        date: new Date(),
        paymentMethod: args.paymentMethod || 'cash',
        notes: args.notes || '',
        createdBy: ctx?.userId,
      });
      return { ok: true, data: { id: String(doc._id), summary: `Recorded expense of ${inr(args.amount)}` } };
    },
  },

  mark_device_service_status: {
    description: 'Change the status of a device-service entry (e.g., mark as ready / delivered / returned).',
    parameters: {
      type: 'object',
      properties: {
        idOrSerial: { type: 'string', description: 'Device service ID or serial number' },
        status: { type: 'string', enum: ['pending', 'ready', 'delivered', 'returned'] },
      },
      required: ['idOrSerial', 'status'],
    },
    isWrite: true,
    async preview(args) {
      const doc = await findDevice(args.idOrSerial);
      if (!doc) return { ok: false, error: `Device service "${args.idOrSerial}" not found` };
      return { ok: true, data: { summary: `Change ${doc.deviceType} (${doc.customerName})'s status from "${doc.status}" to "${args.status}"`, resolved: { id: String(doc._id) } } };
    },
    async execute(args) {
      const doc = await findDevice(args.idOrSerial);
      if (!doc) return { ok: false, error: 'Not found' };
      doc.status = args.status;
      await doc.save();
      return { ok: true, data: { id: String(doc._id), summary: `Status updated to ${args.status}` } };
    },
  },

  update_account_balance: {
    description: 'Update a wallet balance (recharge/banking/aeps/cash sections).',
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: ['recharge', 'banking', 'aeps', 'cash'] },
        name: { type: 'string', description: 'Account name (e.g., "Airtel", "Union", "Available Cash")' },
        balance: { type: 'number', description: 'New balance value' },
      },
      required: ['section', 'name', 'balance'],
    },
    isWrite: true,
    async preview(args) {
      const acc = await Account.findOne({ section: args.section, name: { $regex: `^${args.name}$`, $options: 'i' } });
      if (!acc) {
        const all = await Account.find({ section: args.section });
        return { ok: false, error: `"${args.name}" not found in ${args.section}. Available: ${all.map((a) => a.name).join(', ')}` };
      }
      return { ok: true, data: { summary: `Update ${args.section} → ${acc.name} balance from ${inr(acc.balance)} to ${inr(args.balance)}`, resolved: { id: String(acc._id) } } };
    },
    async execute(args) {
      const acc = await Account.findOne({ section: args.section, name: { $regex: `^${args.name}$`, $options: 'i' } });
      if (!acc) return { ok: false, error: 'Account not found' };
      acc.balance = Number(args.balance);
      await acc.save();
      return { ok: true, data: { id: String(acc._id), summary: `${acc.name} balance set to ${inr(args.balance)}` } };
    },
  },
};

async function findDevice(idOrSerial) {
  if (/^[0-9a-fA-F]{24}$/.test(String(idOrSerial))) {
    return DeviceService.findById(idOrSerial);
  }
  return DeviceService.findOne({ serialNo: idOrSerial });
}

// ── Convert tool registry to Ollama tool-call format ────────────────────────

function getOllamaTools() {
  return Object.entries(tools).map(([name, t]) => ({
    type: 'function',
    function: {
      name,
      description: t.description,
      parameters: t.parameters || { type: 'object', properties: {} },
    },
  }));
}

function getTool(name) {
  return tools[name] || null;
}

module.exports = { tools, getOllamaTools, getTool };
