const mongoose = require('mongoose');

// Per-turn log of bot conversations. Used for chat history (last N turns fed back
// to the LLM) and admin audit. TTL: 30 days, then auto-removed by MongoDB.
const aiConversationSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ['user', 'assistant', 'tool', 'system'],
      required: true,
    },
    content: { type: String, default: '' },
    toolName: { type: String, default: null },     // when role === 'tool', the tool that was called
    toolArgs: { type: mongoose.Schema.Types.Mixed, default: null },
    toolResult: { type: mongoose.Schema.Types.Mixed, default: null },
    // Pending-write confirmation: when present on an assistant turn, the next
    // 'YES'-like reply from the user should execute this tool.
    pendingConfirm: {
      toolName: { type: String, default: null },
      args: { type: mongoose.Schema.Types.Mixed, default: null },
      expiresAt: { type: Date, default: null },
    },
    source: { type: String, enum: ['whatsapp', 'web-test'], default: 'whatsapp' },
  },
  { timestamps: true }
);

// Auto-delete after 30 days (cleans up old conversations)
aiConversationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
aiConversationSchema.index({ phone: 1, createdAt: -1 });

module.exports = mongoose.model('AIConversation', aiConversationSchema);
