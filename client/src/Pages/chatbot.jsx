import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, User, Send, Loader2, Sparkles, Trash2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SimpleIcons from '../components/SimpleIcons';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const STORAGE_KEY = 'dhanSarthiChat';

const WELCOME = {
  id: 1,
  role: 'bot',
  content: "Hello! I'm **Dhan Sarthi** 🙏, your personal financial advisor.\n\nI can help you with:\n- 💰 Budgeting & saving strategies\n- 📈 Investments (SIP, mutual funds, stocks)\n- 🏛️ Government schemes (PM Kisan, MUDRA, Jan Dhan)\n- 🧾 Tax planning & ITR filing\n- 📊 Debt management & credit scores\n\nWhat would you like to know today?",
  timestamp: new Date().toISOString()
};

const SUGGESTIONS = [
  { label: '💰 Best SIP for ₹1000/month', text: 'What is the best SIP to start with ₹1000 per month?' },
  { label: '🏛️ PM Kisan eligibility', text: 'Who is eligible for PM Kisan Yojana and how to apply?' },
  { label: '📊 Improve CIBIL score', text: 'How can I improve my CIBIL credit score quickly?' },
  { label: '🧾 File ITR for free', text: 'How to file income tax return for free online?' },
  { label: '🏦 MUDRA loan process', text: 'How to apply for a MUDRA loan for my small business?' },
  { label: '💡 Save tax under 80C', text: 'What are the best tax saving options under Section 80C?' },
];

export default function Chatbot({ transactions = [], stats = null }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [WELCOME];
    } catch { return [WELCOME]; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Persist chat to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Build financial context from transactions
  const buildContext = useCallback(() => {
    if (!stats && transactions.length === 0) return '';
    const income = stats?.totalIncome || 0;
    const expense = stats?.totalExpense || 0;
    const balance = stats?.balance || 0;
    const topCats = stats?.topCategories?.slice(0, 3).map(c => `${c.category} ₹${c.amount}`).join(', ') || '';
    return `\n\n[User's financial snapshot: Monthly income ₹${income.toLocaleString()}, expenses ₹${expense.toLocaleString()}, balance ₹${balance.toLocaleString()}${topCats ? `, top spending: ${topCats}` : ''}. Use this context to give personalized advice when relevant.]`;
  }, [transactions, stats]);

  const sendMessage = async (text) => {
    const msg = text.trim();
    if (!msg || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const contextualMsg = msg + buildContext();

      const res = await fetch(`${BACKEND}/api/financial-advice/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: contextualMsg, conversationHistory: history })
      });

      if (!res.ok) throw new Error('Server error');
      const data = await res.json();

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        content: data.response,
        timestamp: data.timestamp || new Date().toISOString()
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        content: "I'm having trouble connecting right now. Please try again in a moment. 🙏",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Real Web Speech API voice input
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in your browser. Please use Chrome.');
      return;
    }

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setRecording(true);
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      sendMessage(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const copyMessage = (id, content) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const clearChat = () => {
    if (window.confirm('Clear all chat history?')) {
      setMessages([WELCOME]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const fmt = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 min-h-full max-w-3xl mx-auto p-1">
      <div className="bg-white rounded-lg shadow-md min-h-full flex flex-col overflow-hidden border border-green-200">

        {/* Header */}
        <div className="p-3 border-b bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <SimpleIcons.Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold flex items-center gap-1">
                  Dhan Sarthi <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-green-100 text-xs">Your Personal Financial Guide</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <button onClick={clearChat} title="Clear chat history"
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition text-white">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-gray-50 to-white"
          style={{ scrollbarWidth: 'none' }}>
          <style>{`.no-scrollbar::-webkit-scrollbar{display:none}
            @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
            .fade-up{animation:fadeUp 0.3s ease both}`}
          </style>

          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-2 fade-up ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'bot' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow">
                  <SimpleIcons.Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`max-w-[85%] group relative ${msg.role === 'user'
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl rounded-tr-sm px-3 py-2'
                : 'bg-white border border-green-100 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm'}`}>

                {msg.role === 'bot' ? (
                  <div className="text-xs text-gray-800 prose prose-sm max-w-none
                    prose-headings:text-green-700 prose-headings:font-bold prose-headings:text-sm
                    prose-strong:text-gray-900 prose-li:text-gray-700 prose-p:leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs text-white">{msg.content}</p>
                )}

                <div className="flex items-center justify-between mt-1 gap-2">
                  <p className={`text-xs ${msg.role === 'user' ? 'text-green-100' : 'text-gray-400'}`}>
                    {fmt(msg.timestamp)}
                  </p>
                  {msg.role === 'bot' && (
                    <button onClick={() => copyMessage(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-green-600 p-0.5">
                      {copiedId === msg.id
                        ? <Check className="w-3 h-3 text-green-500" />
                        : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2 fade-up">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow animate-pulse">
                <SimpleIcons.Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-green-100 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-green-600 animate-spin" />
                  <span className="text-xs text-gray-500">Dhan Sarthi is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-green-100 p-2 bg-gradient-to-r from-green-50 to-emerald-50">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex items-center gap-2">
            <button type="button" onClick={toggleVoice} disabled={loading}
              title={recording ? 'Stop recording' : 'Voice input'}
              className={`p-1.5 rounded-full transition shadow-sm flex-shrink-0 ${recording
                ? 'bg-red-100 text-red-500 animate-pulse'
                : 'bg-green-100 text-green-600 hover:bg-green-200'}`}>
              {recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <input ref={inputRef} type="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? '🎤 Listening...' : 'Ask about finance, investments, schemes...'}
              disabled={loading || recording}
              className="flex-1 p-1.5 text-xs border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 bg-white" />

            <button type="submit" disabled={!input.trim() || loading || recording}
              className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick suggestions */}
          <div className="mt-2 flex flex-wrap gap-1">
            {SUGGESTIONS.map((s) => (
              <button key={s.text} onClick={() => sendMessage(s.text)}
                disabled={loading || recording}
                className="px-2 py-0.5 text-xs bg-white border border-green-200 rounded-full hover:bg-green-50 hover:border-green-400 transition disabled:opacity-40 whitespace-nowrap">
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
