const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const getNextPremiumDate = (currentDate, frequency) => {
  const monthsMap = {
    monthly: 1,
    quarterly: 3,
    'half-yearly': 6,
    yearly: 12,
  };
  const months = monthsMap[frequency];
  if (!months) throw new Error(`Invalid frequency: ${frequency}`);
  return addMonths(currentDate, months);
};

const isOverdue = (nextPremiumDate) => {
  return new Date(nextPremiumDate) < new Date();
};

const getDaysUntil = (date) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

module.exports = { addMonths, getNextPremiumDate, isOverdue, getDaysUntil };
