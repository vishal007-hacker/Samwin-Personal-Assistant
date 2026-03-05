import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy hh:mm a');
};

export const formatCurrency = (amount) => {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const timeAgo = (date) => {
  if (!date) return '-';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const getDaysUntil = (date) => {
  if (!date) return null;
  return differenceInDays(new Date(date), new Date());
};

export const maskAadhaar = (aadhaar) => {
  if (!aadhaar) return '-';
  return 'XXXX-XXXX-' + aadhaar.slice(-4);
};

export const generateWhatsAppLink = (phone, message) => {
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const frequencyLabel = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'half-yearly': 'Half-Yearly',
  yearly: 'Yearly',
};

export const statusColors = {
  active: 'bg-green-100 text-green-800',
  matured: 'bg-blue-100 text-blue-800',
  lapsed: 'bg-red-100 text-red-800',
  surrendered: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-800',
};
