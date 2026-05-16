// Thin HTTP client for Ollama (https://ollama.com).
// Uses /api/chat for messages + tool calling. Falls back to a structured-JSON
// prompt if the model doesn't support native tool calling.

const { ollamaUrl, ollamaModel } = require('../config/env');

const DEFAULT_TIMEOUT_MS = 180_000; // 3 min — first call may be slow on low-RAM PCs

async function isAvailable() {
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Preload the model into RAM so the first user message replies quickly.
// Safe to call multiple times. Logs and continues on failure.
async function preloadModel() {
  try {
    if (!(await isAvailable())) {
      console.log('[Ollama] Not available, skipping preload');
      return;
    }
    console.log(`[Ollama] Preloading model "${ollamaModel}"...`);
    const start = Date.now();
    await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
        keep_alive: '30m',
      }),
      signal: AbortSignal.timeout(120_000),
    });
    console.log(`[Ollama] Preload complete in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error('[Ollama] Preload failed:', err.message);
  }
}

// messages: [{ role: 'system'|'user'|'assistant'|'tool', content, tool_calls?, tool_call_id? }]
// tools: [{ type:'function', function:{ name, description, parameters:{type:'object',properties,required} } }]
// returns: { content, toolCalls: [{ name, arguments }] }
async function chat({ messages, tools, model }) {
  try {
    return await chatOnce({ messages, tools, model });
  } catch (err) {
    // Some small models (e.g. qwen2.5:1.5b) can't reliably emit valid JSON for
    // tool arguments. Ollama responds with HTTP 400 + a parse error. Fall back
    // to a plain chat call (no tools) so the user at least gets a text answer.
    const msg = String(err.message || '');
    const isToolParseError = msg.includes('Ollama 400') && (msg.includes('closing') || msg.includes('object') || msg.includes('parse'));
    if (tools && tools.length && isToolParseError) {
      console.warn('[Ollama] Tool-call parse error — retrying without tools:', msg.slice(0, 120));
      return await chatOnce({ messages, tools: null, model });
    }
    throw err;
  }
}

async function chatOnce({ messages, tools, model }) {
  const usedModel = model || ollamaModel;
  const body = {
    model: usedModel,
    messages,
    stream: false,
    keep_alive: '30m', // keep model in RAM for 30 min — avoids cold-load on next query
    options: { temperature: 0.2, num_ctx: 4096 },
  };
  if (tools && tools.length) body.tools = tools;

  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama ${res.status}: ${text || res.statusText}`);
  }

  const data = await res.json();
  const message = data?.message || {};
  const content = message.content || '';
  const toolCalls = Array.isArray(message.tool_calls)
    ? message.tool_calls.map((tc) => ({
        name: tc.function?.name,
        arguments: typeof tc.function?.arguments === 'string'
          ? safeParse(tc.function.arguments)
          : (tc.function?.arguments || {}),
      })).filter((t) => t.name)
    : [];

  return { content, toolCalls, raw: data };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

module.exports = { chat, isAvailable, preloadModel };
