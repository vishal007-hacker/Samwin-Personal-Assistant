const app = require('./app');
const connectDB = require('./config/db');
const { port, enableWhatsappBot } = require('./config/env');
const { startReminderService } = require('./services/reminderService');
const { startAINotifications } = require('./services/aiNotificationService');
const { preloadModel } = require('./services/ollamaService');
const whatsappBot = require('./services/whatsappBotService');

const start = async () => {
  await connectDB();
  startReminderService();
  startAINotifications();
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  // Preload Ollama model into RAM so the first chat reply is fast.
  // Non-blocking — server keeps working if Ollama is offline.
  preloadModel().catch(() => { /* logged inside */ });

  // Initialize WhatsApp bot AFTER server starts so HTTP keeps working even if
  // WhatsApp fails. The init is non-blocking and logs failure rather than
  // crashing the process.
  if (enableWhatsappBot) {
    // Wire incoming messages to the AI agent (if loaded). The agent module is
    // loaded lazily so Phase 1 boots even before Phase 2 exists.
    try {
      const aiAgent = require('./services/aiAgentService');
      if (aiAgent && aiAgent.handleMessage) {
        whatsappBot.onMessage(async ({ from, body }) => {
          const phone = whatsappBot.phoneFromChatId(from);
          const reply = await aiAgent.handleMessage({ phone, text: body, source: 'whatsapp' });
          if (reply) {
            await whatsappBot.send(phone, reply);
          }
        });
      } else {
        console.log('[WA] AI agent not available — incoming messages will be ignored');
      }
    } catch (e) {
      console.log('[WA] aiAgentService not yet implemented:', e.message);
    }

    whatsappBot.init().catch((err) => {
      console.error('[WA] init error (non-fatal):', err.message);
    });
  } else {
    console.log('[WA] WhatsApp bot disabled via ENABLE_WHATSAPP_BOT=false');
  }
};

start();
