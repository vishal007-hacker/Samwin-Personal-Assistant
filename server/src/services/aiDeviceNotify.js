// AI-composed WhatsApp messages sent to customers on device-service events.
//
// composeMessage(device, status, tone) — asks Ollama for a short friendly
// WhatsApp message. Falls back to a deterministic template if Ollama is
// unavailable or returns garbage. Never throws — returns null on failure.
//
// notifyDeviceStatus(device, prevStatus, newStatus) — orchestrator: checks
// settings, decides whether to notify, composes, sends. Fire-and-forget.

const ollama = require('./ollamaService');
const whatsappBot = require('./whatsappBotService');
const AISettings = require('../models/AISettings');

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function fallbackMessage(device, status) {
  const name = device.customerName || 'Customer';
  const dev = device.deviceType || 'device';
  const charge = device.amount ? ` Service charge: ${inr(device.amount)}.` : '';
  if (status === 'ready') {
    return [
      `Hi ${name},`,
      ``,
      `Your *${dev}* is ready for pickup at our shop.${charge}`,
      ``,
      `Please collect it at your convenience.`,
      ``,
      `Thank you,`,
      `*Samwin Infotech*`,
      `Ph: +91 9566181510`,
    ].join('\n');
  }
  if (status === 'delivered') {
    return [
      `Hi ${name},`,
      ``,
      `Thank you for collecting your *${dev}*. Hope it's working well!`,
      ``,
      `If you have any issues, please reach out to us.`,
      ``,
      `*Samwin Infotech*`,
      `Ph: +91 9566181510`,
    ].join('\n');
  }
  return null;
}

async function composeMessage(device, status, tone = 'friendly') {
  // Fast path: if Ollama is offline, use the template.
  if (!(await ollama.isAvailable())) {
    return fallbackMessage(device, status);
  }

  const customerName = device.customerName || 'Customer';
  const deviceLabel = device.deviceType || 'device';
  const facts = [
    `Customer: ${customerName}`,
    `Device: ${deviceLabel}`,
    device.serialNo ? `Serial: ${device.serialNo}` : null,
    device.problem ? `Problem: ${device.problem}` : null,
    device.amount ? `Service charge: ${inr(device.amount)}` : null,
    `New status: ${status}`,
  ].filter(Boolean).join('\n');

  const toneInstruction = tone === 'formal'
    ? 'Use a polite formal tone.'
    : tone === 'short'
    ? 'Keep it under 3 short lines.'
    : 'Use a friendly, warm tone.';

  const systemPrompt = `You write short customer-facing WhatsApp messages for Samwin Infotech, a mobile/computer/CCTV service shop. ${toneInstruction}

Rules — these are STRICT:
- Output ONLY the message text. No preamble, no quotes, no explanations.
- Address the customer by their name.
- Mention the specific device type.
- If the status is "ready" — tell them their device is ready for pickup and (if amount > 0) mention the service charge.
- If the status is "delivered" — thank them and offer help if they face any issue.
- End with the signature "*Samwin Infotech*" on one line and "Ph: +91 9566181510" on the next line.
- 5-8 lines maximum. Plain text. Use *bold* sparingly (only on key facts).
- DO NOT make up details that are not in the facts below.`;

  try {
    const { content } = await ollama.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Compose a WhatsApp message for the customer with these facts:\n\n${facts}` },
      ],
    });
    const text = (content || '').trim();
    // Sanity check: must mention the customer name and signature
    if (text.length < 20 || text.length > 800) return fallbackMessage(device, status);
    if (!text.toLowerCase().includes(customerName.toLowerCase().split(' ')[0])) {
      // Doesn't address the customer — fall back
      return fallbackMessage(device, status);
    }
    return text;
  } catch (err) {
    console.error('[AI-DEV] compose failed, using fallback:', err.message);
    return fallbackMessage(device, status);
  }
}

// Returns { sent: bool, reason?: string, message?: string }
async function notifyDeviceStatus(device, prevStatus, newStatus) {
  try {
    if (!device) return { sent: false, reason: 'no device' };
    if (prevStatus === newStatus) return { sent: false, reason: 'no status change' };
    if (!device.customerPhone) return { sent: false, reason: 'no customer phone' };

    const settings = await AISettings.get();
    const shouldNotify =
      (newStatus === 'ready' && settings.deviceReadyAutoNotify) ||
      (newStatus === 'delivered' && settings.deviceDeliveredAutoNotify);
    if (!shouldNotify) return { sent: false, reason: 'auto-notify disabled for this status' };

    const status = whatsappBot.getStatus();
    if (!status.ready) {
      console.log('[AI-DEV] WhatsApp not ready, skipping notification');
      return { sent: false, reason: 'whatsapp not ready' };
    }

    const message = await composeMessage(device, newStatus, settings.deviceMessageTone);
    if (!message) return { sent: false, reason: 'no message generated' };

    await whatsappBot.send(device.customerPhone, message);
    console.log(`[AI-DEV] Notified ${device.customerName} (${device.customerPhone}) — status=${newStatus}`);
    return { sent: true, message };
  } catch (err) {
    console.error('[AI-DEV] notifyDeviceStatus error:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { composeMessage, notifyDeviceStatus };
