// Floating AI chat widget mounted in AppLayout — shows on every page.
// - Collapsed: small circular button bottom-right
// - Expanded: chat panel ~360px wide, 520px tall
// - Per-user history persisted server-side (AIConversation collection)
// - Uses the same AI agent (Ollama + tools) as the WhatsApp bot

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Send, X, Loader2, Trash2, MessageCircle, Minus, ArrowLeft } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../features/auth/AuthContext';

const HISTORY_KEY = 'ai-chat-history';

function useChatHistory(enabled) {
  return useQuery({
    queryKey: [HISTORY_KEY],
    queryFn: async () => (await api.get('/ai/chat/history')).data,
    enabled,
  });
}

function useSendChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message) => (await api.post('/ai/chat', { message })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [HISTORY_KEY] }),
  });
}

function useClearChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.delete('/ai/chat/history')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [HISTORY_KEY] }),
  });
}

// Render *bold* segments
function MessageBody({ text }) {
  const parts = String(text || '').split(/(\*[^*]+\*)/);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
          return <strong key={i}>{p.slice(1, -1)}</strong>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  const { data: historyData, isLoading } = useChatHistory(open);
  const sendChat = useSendChat();
  const clearChat = useClearChat();

  const messages = historyData?.data || [];

  // Auto-scroll to the bottom when new messages arrive or on first open
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, open, sendChat.isPending]);

  // Only show widget to admin users (AI routes are admin-only)
  if (!user || user.role !== 'admin') return null;

  const submit = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sendChat.isPending) return;
    setInput('');
    try {
      await sendChat.mutateAsync(text);
    } catch (err) {
      // Error toast is handled by the user seeing nothing; surface inline:
      console.error('Chat send error:', err);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all chat history?')) return;
    try {
      await clearChat.mutateAsync();
    } catch (err) {
      console.error('Clear error:', err);
    }
  };

  // ── Collapsed button ─────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center group"
        title="Ask the AI Assistant"
      >
        <Bot className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        <span className="hidden lg:block absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Ask the AI
        </span>
      </button>
    );
  }

  // ── Expanded panel ─────────────────────────────────────────────
  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(380px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-2.5rem))] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors shrink-0"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight">AI Assistant</p>
          <p className="text-[11px] opacity-80 leading-tight">Ask anything about your business data</p>
        </div>
        <button
          onClick={handleClear}
          disabled={clearChat.isPending || messages.length === 0}
          className="p-1.5 rounded-lg hover:bg-white/20 disabled:opacity-30 transition-colors"
          title="Clear history"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Bot className="w-10 h-10 mx-auto mb-3 text-purple-300" />
            <p className="text-sm font-medium text-gray-700">Ask me anything!</p>
            <p className="text-xs text-gray-400 mt-1.5 max-w-[14rem] mx-auto">
              I can look up sales, stock, credits, services, and account balances. I can also add records if you confirm.
            </p>
            <div className="mt-4 flex flex-col gap-1.5 max-w-[16rem] mx-auto">
              {[
                'How much sales today?',
                'Current stock count',
                'Account balances',
                'Pending device services',
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => setInput(p)}
                  className="text-left text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-purple-400 hover:text-purple-700 rounded-full transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m._id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                }`}
              >
                <MessageBody text={m.content} />
              </div>
            </div>
          ))
        )}
        {sendChat.isPending && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm text-gray-500 inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={submit} className="border-t border-gray-200 bg-white px-3 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 resize-none px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none max-h-24"
            disabled={sendChat.isPending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sendChat.isPending}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {sendChat.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          Powered by Ollama (local) — same agent that handles WhatsApp queries
        </p>
      </form>
    </div>
  );
}
