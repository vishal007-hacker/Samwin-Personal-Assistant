const generateWhatsAppLink = (phone, message) => {
  // Remove non-digit characters and ensure country code
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone; // Add India country code
  }
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

const generateReminderMessage = (customerName, policyNumber, amount, dueDate) => {
  return `Dear ${customerName},\n\nThis is a reminder that your insurance premium of Rs.${amount} for policy ${policyNumber} is due on ${dueDate}.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\nSamwin Infotech`;
};

const generateOverdueMessage = (customerName, policyNumber, amount, dueDate) => {
  return `Dear ${customerName},\n\nYour insurance premium of Rs.${amount} for policy ${policyNumber} was due on ${dueDate} and is now overdue.\n\nPlease make the payment immediately to avoid policy lapse.\n\nThank you,\nSamwin Infotech`;
};

module.exports = { generateWhatsAppLink, generateReminderMessage, generateOverdueMessage };
