// Orchestrates a single AI conversation turn:
//   1. Look up sender in the whitelist (skip if bypassWhitelist)
//   2. Detect YES/NO replies to a pending confirmation
//   3. Load short history from MongoDB
//   4. Call Ollama with tools; loop on tool_calls; execute read tools immediately,
//      and queue write tools as "pending confirmation"
//   5. Persist user / assistant / tool turns to AIConversation
//   6. Return the final assistant text

const AllowedNumber = require('../models/AllowedNumber');
const AIConversation = require('../models/AIConversation');
const ollama = require('./ollamaService');
const { getOllamaTools, getTool } = require('./aiTools');

const HISTORY_LIMIT = 8;       // last N turns fed back to the LLM
const MAX_TOOL_LOOPS = 4;

const SYSTEM_PROMPT = `You are Samwin Infotech's friendly business assistant. You help the shop's admin and staff query their business data and record sales/expenses via WhatsApp.

You have tools to look up sales, customer credits, stock, device services, account balances, expiring vehicle insurance, and expenses. You can also record new sales / expenses, change device-service status, and update account balances — but write tools ALWAYS require the user to confirm by replying YES.

Style:
- Replies must be SHORT and clear (WhatsApp screen).
- Always use ₹ for rupees. Be specific with numbers and dates.
- If a user asks about "today", "this week", "this month", convert to dates and call get_sales_summary / get_expenses_summary.
- For write actions, summarize what you'll do in one sentence and end with: "Reply YES to confirm, or NO to cancel."
- If a tool returns no data, say so plainly; don't make up numbers.
- Today's date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

async function isAllowed(phone) {
  const entry = await AllowedNumber.findActiveByPhone(phone);
  return entry;
}

function isYes(text) {
  return /^\s*(yes|y|ok|okay|confirm|haa|aan|sure|yep|yeah|true)\b/i.test(String(text || ''));
}
function isNo(text) {
  return /^\s*(no|n|cancel|stop|abort|nope|nahi)\b/i.test(String(text || ''));
}

async function getPendingConfirm(phone) {
  // Most recent assistant turn carrying pendingConfirm that hasn't expired
  const turn = await AIConversation.findOne({
    phone,
    role: 'assistant',
    'pendingConfirm.toolName': { $ne: null },
  }).sort({ createdAt: -1 });
  if (!turn) return null;
  if (turn.pendingConfirm.expiresAt && new Date() > turn.pendingConfirm.expiresAt) return null;
  // Check if there's any newer message — confirmation must be the immediate next message
  const newer = await AIConversation.findOne({
    phone,
    createdAt: { $gt: turn.createdAt },
  });
  if (newer) return null;
  return turn;
}

async function loadHistory(phone) {
  const turns = await AIConversation.find({
    phone,
    role: { $in: ['user', 'assistant'] },
  })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();
  return turns
    .reverse()
    .map((t) => ({ role: t.role, content: t.content }))
    .filter((m) => m.content);
}

async function handleMessage({ phone, text, source = 'whatsapp', bypassWhitelist = false, userId = null }) {
  if (!text || !String(text).trim()) return null;
  text = String(text).trim();

  // 1. Whitelist check
  let allowed = null;
  if (!bypassWhitelist) {
    allowed = await isAllowed(phone);
    if (!allowed) {
      // Silent ignore — don't reveal bot to outsiders.
      console.log(`[AI] Ignored message from non-whitelisted phone: ${phone}`);
      return null;
    }
  }

  // Persist user turn
  await AIConversation.create({ phone, role: 'user', content: text, source });

  // 2. YES/NO confirmation handling
  const pending = await getPendingConfirm(phone);
  if (pending) {
    if (isYes(text)) {
      const { toolName, args } = pending.pendingConfirm;
      const tool = getTool(toolName);
      if (!tool) {
        const reply = `Sorry, that confirmation expired.`;
        await persistAssistant(phone, reply);
        return reply;
      }
      try {
        const result = await tool.execute(args, { userId: allowed?.createdBy || userId });
        await AIConversation.create({
          phone, role: 'tool', toolName, toolArgs: args, toolResult: result, source,
        });
        const reply = result.ok
          ? `✓ Done. ${result.data?.summary || ''}`
          : `Failed: ${result.error || 'unknown error'}`;
        await persistAssistant(phone, reply);
        return reply;
      } catch (err) {
        const reply = `Error: ${err.message}`;
        await persistAssistant(phone, reply);
        return reply;
      }
    }
    if (isNo(text)) {
      const reply = `Cancelled.`;
      await persistAssistant(phone, reply);
      return reply;
    }
    // Fall through to normal LLM processing if neither yes/no
  }

  // 3. Verify Ollama is up
  if (!(await ollama.isAvailable())) {
    const reply = `AI service is offline. Please make sure Ollama is running on this PC (http://localhost:11434).`;
    await persistAssistant(phone, reply);
    return reply;
  }

  // 4. Build messages: system + history + new user text
  const history = await loadHistory(phone);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
  ];
  // The history already includes our new user turn (just persisted), so don't double it.

  // 5. Tool-call loop
  let finalContent = '';
  for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
    let response;
    try {
      response = await ollama.chat({ messages, tools: getOllamaTools() });
    } catch (err) {
      // Friendly error wording instead of raw stack
      const msg = String(err.message || '');
      let friendly = 'The AI is having trouble right now.';
      if (msg.includes('timeout') || msg.includes('aborted')) {
        friendly = 'The AI took too long to respond. Your PC may be low on free RAM — try closing some browser tabs or set ENABLE_WHATSAPP_BOT=false to free memory, then try again.';
      } else if (msg.includes('Ollama 404')) {
        friendly = 'The configured Ollama model is not installed. Run: ollama pull <model-name>';
      } else if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        friendly = 'Cannot reach Ollama. Make sure it is running (http://localhost:11434).';
      }
      const reply = friendly;
      await persistAssistant(phone, reply);
      return reply;
    }

    const { content, toolCalls } = response;

    if (!toolCalls || toolCalls.length === 0) {
      finalContent = content?.trim()
        || "I couldn't generate a response. The AI model may be too small for this question — try a simpler phrasing, or upgrade to qwen2.5:3b or qwen2.5:7b for richer answers.";
      break;
    }

    // Execute each tool call (or stage write tools for confirmation)
    let pendingWrite = null;
    const toolResults = [];

    for (const call of toolCalls) {
      const tool = getTool(call.name);
      if (!tool) {
        toolResults.push({ name: call.name, content: JSON.stringify({ error: 'Unknown tool' }) });
        continue;
      }
      try {
        if (tool.isWrite) {
          // Get preview — feed back to LLM so it can compose a confirmation message
          const preview = tool.preview ? await tool.preview(call.arguments) : { ok: true, data: { summary: `Will call ${call.name}` } };
          if (!preview.ok) {
            toolResults.push({ name: call.name, content: JSON.stringify(preview) });
            continue;
          }
          pendingWrite = { toolName: call.name, args: call.arguments };
          toolResults.push({
            name: call.name,
            content: JSON.stringify({
              ok: true,
              action: 'awaiting_confirmation',
              previewSummary: preview.data?.summary,
              instructions: 'Tell the user this exact action will happen and ask them to reply YES to confirm or NO to cancel.',
            }),
          });
        } else {
          const result = await tool.execute(call.arguments, { userId });
          await AIConversation.create({ phone, role: 'tool', toolName: call.name, toolArgs: call.arguments, toolResult: result, source });
          toolResults.push({ name: call.name, content: JSON.stringify(result) });
        }
      } catch (err) {
        toolResults.push({ name: call.name, content: JSON.stringify({ ok: false, error: err.message }) });
      }
    }

    // Append assistant tool_call turn + tool results, loop again
    messages.push({ role: 'assistant', content: content || '', tool_calls: toolCalls.map((tc) => ({ function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } })) });
    for (const r of toolResults) {
      messages.push({ role: 'tool', content: r.content, name: r.name });
    }

    // If we have a pending write and the LLM also gave text, we may break early —
    // but typically LLM will give a final message after seeing the awaiting_confirmation result.
    if (pendingWrite) {
      // Persist a stub assistant turn that carries the pending confirmation
      // Will be replaced with proper text after next loop, but in case we break:
      const ttl = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await AIConversation.create({
        phone, role: 'system', content: '[Pending write staged]',
        pendingConfirm: { toolName: pendingWrite.toolName, args: pendingWrite.args, expiresAt: ttl },
        source,
      });
    }
  }

  // Persist final assistant reply
  const pendingWriteForLatestTurn = await mostRecentPendingFromSystem(phone);
  await AIConversation.create({
    phone,
    role: 'assistant',
    content: finalContent || '(no response)',
    pendingConfirm: pendingWriteForLatestTurn || { toolName: null, args: null, expiresAt: null },
    source,
  });

  return finalContent || '(no response)';
}

// Pull the most recent 'system' [Pending write staged] turn back into the assistant's pendingConfirm.
async function mostRecentPendingFromSystem(phone) {
  const sysTurn = await AIConversation.findOne({
    phone,
    role: 'system',
    'pendingConfirm.toolName': { $ne: null },
  }).sort({ createdAt: -1 });
  if (!sysTurn) return null;
  // Delete the system stub so it isn't reused
  await AIConversation.deleteOne({ _id: sysTurn._id });
  return sysTurn.pendingConfirm;
}

async function persistAssistant(phone, content) {
  await AIConversation.create({ phone, role: 'assistant', content });
}

module.exports = { handleMessage };
