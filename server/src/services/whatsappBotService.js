// Wraps whatsapp-web.js Client with safe lifecycle: session persistence,
// graceful failure (server keeps running even if WhatsApp init fails),
// pluggable message handler, status/QR exposure for the dashboard.
//
// Status states: 'disconnected' | 'initializing' | 'qr' | 'authenticated' | 'ready' | 'error'

const path = require('path');
const QRCode = require('qrcode');

let Client, LocalAuth;
try {
  ({ Client, LocalAuth } = require('whatsapp-web.js'));
} catch (e) {
  // Module not installed — service will degrade gracefully
  console.warn('[WA] whatsapp-web.js not installed:', e.message);
}

const state = {
  client: null,
  status: 'disconnected',
  qrDataUrl: null,        // PNG data URL for the dashboard
  qrRaw: null,            // the raw QR string
  lastError: null,
  startedAt: null,
  messageHandler: null,
  outboundCount: 0,
  inboundCount: 0,
};

function getStatus() {
  return {
    status: state.status,
    hasQR: !!state.qrDataUrl,
    startedAt: state.startedAt,
    lastError: state.lastError,
    outboundCount: state.outboundCount,
    inboundCount: state.inboundCount,
    ready: state.status === 'ready',
  };
}

function getQR() {
  return state.qrDataUrl;
}

function onMessage(handler) {
  state.messageHandler = handler;
}

async function init() {
  if (!Client) {
    state.status = 'error';
    state.lastError = 'whatsapp-web.js not installed';
    return;
  }
  if (state.client) {
    console.log('[WA] init called but client already exists');
    return;
  }

  state.status = 'initializing';
  state.startedAt = new Date();
  state.lastError = null;

  const dataPath = path.join(__dirname, '../..');

  state.client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'samwin',
      dataPath, // creates dataPath/.wwebjs_auth/
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  });

  state.client.on('qr', async (qr) => {
    state.qrRaw = qr;
    try {
      state.qrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 1 });
    } catch (err) {
      console.error('[WA] QR encode error:', err.message);
    }
    state.status = 'qr';
    console.log('[WA] QR ready — scan via /ai-assistant page or terminal:');
    try {
      const qrTerm = require('qrcode-terminal');
      qrTerm.generate(qr, { small: true });
    } catch { /* optional */ }
  });

  state.client.on('authenticated', () => {
    state.status = 'authenticated';
    state.qrDataUrl = null;
    state.qrRaw = null;
    console.log('[WA] Authenticated');
  });

  state.client.on('auth_failure', (msg) => {
    state.status = 'error';
    state.lastError = `auth_failure: ${msg}`;
    console.error('[WA] auth_failure:', msg);
  });

  state.client.on('ready', () => {
    state.status = 'ready';
    console.log('[WA] Client ready');
  });

  state.client.on('disconnected', (reason) => {
    state.status = 'disconnected';
    state.lastError = `disconnected: ${reason}`;
    console.warn('[WA] Disconnected:', reason);
    // Auto-reinitialize after short delay
    setTimeout(() => {
      state.client = null;
      init().catch((e) => console.error('[WA] reinit failed:', e.message));
    }, 5000);
  });

  state.client.on('message', async (msg) => {
    try {
      if (msg.fromMe) return;             // ignore our own messages
      if (msg.from.endsWith('@g.us')) return; // ignore groups for now
      if (msg.type !== 'chat') return;    // only text messages for now
      state.inboundCount += 1;
      if (state.messageHandler) {
        await state.messageHandler({ from: msg.from, body: msg.body, raw: msg });
      }
    } catch (err) {
      console.error('[WA] message handler error:', err.message);
    }
  });

  try {
    await state.client.initialize();
  } catch (err) {
    state.status = 'error';
    state.lastError = err.message;
    console.error('[WA] init failed:', err.message);
  }
}

async function destroy() {
  if (state.client) {
    try {
      await state.client.destroy();
    } catch { /* ignore */ }
    state.client = null;
  }
  state.status = 'disconnected';
}

// Send a text message. `phone` is digits-only (no +), 10-digit local numbers
// will have '91' prefixed automatically.
async function send(phone, text) {
  if (state.status !== 'ready') {
    throw new Error(`WhatsApp not ready (status: ${state.status})`);
  }
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) throw new Error('No phone number');
  const normalized = digits.length === 10 ? '91' + digits : digits;
  const chatId = `${normalized}@c.us`;
  await state.client.sendMessage(chatId, String(text));
  state.outboundCount += 1;
}

// Extract digits-only phone from whatsapp-web.js chat id (e.g., "919566181510@c.us")
function phoneFromChatId(chatId) {
  return String(chatId || '').split('@')[0].replace(/\D/g, '');
}

module.exports = {
  init,
  destroy,
  getStatus,
  getQR,
  onMessage,
  send,
  phoneFromChatId,
};
