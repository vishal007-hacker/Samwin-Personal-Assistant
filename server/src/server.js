const app = require('./app');
const connectDB = require('./config/db');
const { port, enableWhatsappBot } = require('./config/env');
const { startReminderService } = require('./services/reminderService');
const whatsappBot = require('./services/whatsappBotService');

const start = async () => {
  await connectDB();
  startReminderService();
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  // Initialize WhatsApp bot AFTER server starts. The bot is now SEND-ONLY:
  // it can deliver outbound messages programmatically (no AI agent to handle
  // incoming chats). Incoming messages are logged and ignored.
  if (enableWhatsappBot) {
    whatsappBot.onMessage(({ from, body }) => {
      console.log(`[WA] Incoming from ${from}: ${String(body).slice(0, 80)} (ignored — bot is send-only)`);
    });
    whatsappBot.init().catch((err) => {
      console.error('[WA] init error (non-fatal):', err.message);
    });
  } else {
    console.log('[WA] WhatsApp bot disabled via ENABLE_WHATSAPP_BOT=false');
  }
};

start();
