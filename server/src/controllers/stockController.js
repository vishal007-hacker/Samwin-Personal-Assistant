const Stock = require('../models/Stock');
const { success, paginated, error } = require('../utils/responseHelper');

// GET /api/stock — list with pagination, search, filter
exports.getStocks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      brand,
      category,
      sortBy = 'uniqueCode',
      sortOrder = 'asc',
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (brand) query.brand = { $regex: brand, $options: 'i' };
    if (search) {
      query.$or = [
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      Stock.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Stock.countDocuments(query),
    ]);

    paginated(res, { docs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/stock/:id
exports.getStock = async (req, res, next) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return error(res, 'Stock item not found', 404);
    success(res, stock);
  } catch (err) {
    next(err);
  }
};

// POST /api/stock — add new stock item
exports.createStock = async (req, res, next) => {
  try {
    const stock = await Stock.create({ ...req.body, createdBy: req.user._id });
    success(res, stock, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/stock/:id — update stock details
exports.updateStock = async (req, res, next) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return error(res, 'Stock item not found', 404);
    if (stock.status === 'sold') return error(res, 'Cannot edit a sold item', 400);

    Object.assign(stock, req.body);
    await stock.save();
    success(res, stock);
  } catch (err) {
    next(err);
  }
};

// PUT /api/stock/:id/sell — mark as sold
exports.sellStock = async (req, res, next) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return error(res, 'Stock item not found', 404);
    if (stock.status === 'sold') return error(res, 'Item already sold', 400);

    const { customerName, contactNumber, finalPrice, complements } = req.body;
    stock.status = 'sold';
    stock.soldTo = { customerName, contactNumber, finalPrice, complements };
    stock.soldAt = new Date();
    await stock.save();
    success(res, stock);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/stock/:id
exports.deleteStock = async (req, res, next) => {
  try {
    const stock = await Stock.findByIdAndDelete(req.params.id);
    if (!stock) return error(res, 'Stock item not found', 404);
    success(res, { message: 'Stock item deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/stock/brands — distinct brand list
exports.getBrands = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const brands = await Stock.distinct('brand', filter);
    success(res, brands.sort());
  } catch (err) {
    next(err);
  }
};

// GET /api/stock/report/summary — purchase/sell summary
exports.getReport = async (req, res, next) => {
  try {
    const { from, to, brand, status, category } = req.query;
    const match = {};
    if (category) match.category = category;
    if (brand) match.brand = { $regex: brand, $options: 'i' };
    if (status) match.status = status;
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
    }

    const items = await Stock.find(match).sort({ createdAt: -1 });

    const totalPurchase = items.reduce((s, i) => s + i.purchasePrice, 0);
    const soldItems = items.filter((i) => i.status === 'sold');
    const totalSold = soldItems.reduce((s, i) => s + (i.soldTo?.finalPrice || 0), 0);
    const totalProfit = totalSold - soldItems.reduce((s, i) => s + i.purchasePrice, 0);
    const inStockCount = items.filter((i) => i.status === 'in_stock').length;

    success(res, {
      items,
      summary: {
        totalItems: items.length,
        inStockCount,
        soldCount: soldItems.length,
        totalPurchase,
        totalSold,
        totalProfit,
      },
    });
  } catch (err) {
    next(err);
  }
};
