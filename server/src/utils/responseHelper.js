const success = (res, data, statusCode = 200) => {
  res.status(statusCode).json({ success: true, data });
};

const paginated = (res, { docs, total, page, limit }) => {
  res.status(200).json({
    success: true,
    data: docs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
};

const error = (res, message, statusCode = 500) => {
  res.status(statusCode).json({ success: false, message });
};

module.exports = { success, paginated, error };
