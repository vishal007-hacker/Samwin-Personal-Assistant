import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Minimize2 } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';

export default function AIChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello! I am your AI Assistant powered by Phi-3. Ask me about today\'s sales, expenses, or stock!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Only show to admins
  if (user?.role !== 'admin') {
    return null;
  }

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text.trim() }]);
    setLoading(true);

    try {
      const baseURL = import.meta.env.VITE_API_URL || '/api';
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${baseURL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text.trim() })
      });

      if (!res.ok) {
        let errorMsg = 'Failed to connect to AI. Ensure Ollama is running.';
        try {
          const json = await res.json();
          if (json.message) errorMsg = json.message;
        } catch(e) {}
        throw new Error(errorMsg);
      }

      // Keep loading spinner until first chunk arrives
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          if (isFirstChunk) {
            isFirstChunk = false;
            setLoading(false); // Turn off spinner now that stream started
            setMessages((prev) => [...prev, { role: 'ai', content: chunk }]);
          } else {
            setMessages((prev) => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1] = {
                ...newMsgs[newMsgs.length - 1],
                content: newMsgs[newMsgs.length - 1].content + chunk
              };
              return newMsgs;
            });
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: err.message || 'Failed to connect to AI.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const suggestions = [
    "What are today's sales?",
    "Any overdue credits?",
    "Show low stock items",
    "Summarize today's expenses"
  ];

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-600 text-white rounded-full shadow-xl hover:bg-emerald-700 transition-transform hover:scale-110 flex items-center justify-center"
          title="Chat with AI Assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden transition-all h-[500px] max-h-[80vh]">
          {/* Header */}
          <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <h3 className="font-semibold text-sm">Samwin AI Assistant</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-emerald-100 hover:text-white hover:bg-emerald-700 p-1.5 rounded transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-emerald-50/50 flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}
              >
                <div 
                  className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-br-sm shadow-md' 
                      : msg.role === 'error'
                      ? 'bg-red-50 text-red-700 rounded-bl-sm border border-red-200'
                      : 'bg-white text-gray-800 rounded-bl-sm border border-emerald-100 shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="self-start px-4 py-2.5 bg-white border border-emerald-100 shadow-sm rounded-2xl rounded-bl-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                <span className="text-xs text-gray-500 font-medium tracking-wide uppercase">Thinking...</span>
              </div>
            )}

            {/* Suggestions */}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(suggestion)}
                    className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-full text-xs font-medium hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-emerald-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2.5 bg-gray-50 border-transparent focus:bg-white border focus:border-emerald-500 rounded-xl text-sm outline-none transition-colors"
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:bg-gray-400 transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
