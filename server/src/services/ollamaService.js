// Thin HTTP client for Ollama (https://ollama.com).
// Uses /api/chat for messages + tool calling. Falls back to a structured-JSON
// prompt if the model doesn't support native tool calling.

const { ollamaUrl, ollamaModel } = require('../config/env');

const DEFAULT_TIMEOUT_MS = 60_000;

async function isAvailable() {
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// messages: [{ role: 'system'|'user'|'assistant'|'tool', content, tool_calls?, tool_call_id? }]
// tools: [{ type:'function', function:{ name, description, parameters:{type:'object',properties,required} } }]
// returns: { content, toolCalls: [{ name, arguments }] }
async function chat({ messages, tools, model }) {
  const usedModel = model || ollamaModel;
  const body = {
    model: usedModel,
    messages,
    stream: false,
    options: { temperature: 0.2 },
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

module.exports = { chat, isAvailable };
