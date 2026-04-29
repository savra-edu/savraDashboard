'use client';

import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AssistantMessageContent } from '@/components/agent/AssistantMessageContent';
import { Send, Sparkles, Database, ChevronRight, AlertCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** Fixes common LLM markdown issues so GFM tables parse (glued rows, etc.). */
function normalizeMarkdownContent(raw: string): string {
  let s = raw.replace(/\r\n/g, '\n');
  // Glued rows: "|foo||||bar|" typos → row breaks (avoid touching escaped pipes inside code blocks minimally)
  s = s.replace(/\|\|/g, '|\n|');
  return s;
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your Savra Data Agent. I can query the database directly to help you analyze platform metrics, track instructor behavior, and make data-driven decisions. What would you like to know?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: normalizeMarkdownContent(String(data.content).replace(/\\n/g, '\n')),
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `**Error:** ${err.message || 'Something went wrong while fetching the answer.'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQueries = [
    "How many teachers signed up in the last 7 days?",
    "Which schools have the highest number of active classes?",
    "Show me the most common artifact types generated this month.",
    "What is the average number of students per class?"
  ];

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0, background: 'var(--background)', position: 'relative' }}>

        {/* Scrollable area: header scrolls away with messages (not sticky / fixed) */}
        <div className="custom-scrollbar agent-chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '2rem clamp(1rem, 3vw, 2.5rem) 120px', display: 'flex', flexDirection: 'column', gap: '2rem', scrollBehavior: 'smooth' }}>
          <header className="agent-page-header">
            <div className="agent-page-header-inner">
              <div className="agent-page-header-icon" aria-hidden>
                <Sparkles size={22} strokeWidth={2} />
              </div>
              <div className="agent-page-header-copy">
                <h1 className="agent-page-title">Data Agent</h1>
                <p className="agent-page-subtitle">
                  Ask in plain English—read-only SQL, tables, charts, and short takeaways.
                </p>
              </div>
            </div>
          </header>

          {messages.map((msg, i) => (
            <article
              key={i}
              className={msg.role === 'assistant' ? 'agent-msg agent-msg--assistant' : 'agent-msg agent-msg--user'}
            >
              {msg.role === 'assistant' ? (
                <>
                  <div className="agent-msg-rail" aria-hidden />
                  <div className="agent-msg-stack">
                    <span className="agent-msg-label">Savra</span>
                    <div className="agent-msg-surface agent-msg-surface--assistant">
                      <div className="markdown-body agent-markdown">
                        <AssistantMessageContent content={msg.content} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="agent-msg-stack agent-msg-stack--user">
                  <span className="agent-msg-label agent-msg-label--user">You</span>
                  <div className="agent-msg-surface agent-msg-surface--user">
                    <p className="agent-msg-user-text">{msg.content}</p>
                  </div>
                </div>
              )}
            </article>
          ))}

          {isLoading && (
            <div className="agent-msg agent-msg--assistant">
              <div className="agent-msg-rail agent-msg-rail--pulse" aria-hidden />
              <div className="agent-msg-stack">
                <span className="agent-msg-label">Savra</span>
                <div className="agent-msg-loading" aria-live="polite">
                  <span className="agent-msg-loading-dot" />
                  <span className="agent-msg-loading-dot" />
                  <span className="agent-msg-loading-dot" />
                  <span className="agent-msg-loading-text">Analyzing your data…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} style={{ height: '20px' }} />
        </div>

        {/* Input Bar Fixed at Bottom */}
        <div style={{ 
          position: 'absolute', bottom: 0, left: 0, right: 0, 
          padding: '1.5rem clamp(1rem, 3vw, 2.5rem)', 
          background: 'linear-gradient(to top, var(--background) 80%, transparent)',
          pointerEvents: 'none' // Let clicks pass through gradient area
        }}>
          <div style={{ width: '100%', maxWidth: '100%', margin: 0, pointerEvents: 'auto' }}>
            {messages.length === 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {suggestedQueries.map((q, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(q)}
                    style={{ 
                      background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '9999px', 
                      padding: '0.5rem 1rem', fontSize: '0.825rem', color: 'var(--muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--muted)'; }}
                  >
                    {q} <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--card-bg)', borderRadius: '1.25rem', border: '1px solid var(--card-border)', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
              <Database size={20} style={{ position: 'absolute', left: '1.5rem', color: 'var(--muted)' }} />
              <input 
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask your data a question..."
                disabled={isLoading}
                style={{ 
                  width: '100%', padding: '1.25rem 4.5rem 1.25rem 4rem', borderRadius: '1.25rem', 
                  border: 'none', background: 'transparent', 
                  fontSize: '1rem', outline: 'none', color: 'var(--foreground)'
                }}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                style={{ 
                  position: 'absolute', right: '0.75rem', background: input.trim() && !isLoading ? 'var(--primary)' : 'var(--card-border)', 
                  color: 'white', border: 'none', borderRadius: '0.75rem', width: '2.75rem', height: '2.75rem', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  transform: input.trim() && !isLoading ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <Send size={18} />
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <AlertCircle size={12} />
              Data Agent generates database queries via LLM. Verify critical operational data.
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .agent-msg--assistant {
          display: flex;
          align-items: stretch;
          gap: 1rem;
          width: 100%;
          min-width: 0;
        }
        .agent-msg--user {
          display: flex;
          justify-content: flex-end;
          width: 100%;
          min-width: 0;
        }
        .agent-msg-rail {
          width: 3px;
          flex-shrink: 0;
          border-radius: 999px;
          align-self: stretch;
          min-height: 2.75rem;
          background: linear-gradient(180deg, var(--primary) 0%, #93c5fd 100%);
          opacity: 0.9;
        }
        .agent-msg-rail--pulse {
          animation: agentRailPulse 1.4s ease-in-out infinite;
        }
        @keyframes agentRailPulse {
          0%, 100% { opacity: 0.45; transform: scaleY(0.96); }
          50% { opacity: 1; transform: scaleY(1); }
        }
        .agent-msg-stack {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .agent-msg-stack--user {
          flex: 0 1 auto;
          max-width: min(100%, 560px);
          align-items: flex-end;
        }
        .agent-msg-label {
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--muted);
          user-select: none;
        }
        .agent-msg-label--user {
          text-align: right;
        }
        .agent-msg-surface--assistant {
          padding: 0;
        }
        .agent-msg-surface--user {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 1rem;
          padding: 0.875rem 1.125rem;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          width: 100%;
          box-sizing: border-box;
        }
        .agent-msg-user-text {
          margin: 0;
          font-size: 1rem;
          line-height: 1.55;
          color: var(--foreground);
        }
        .agent-msg-loading {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.35rem 0.5rem;
          padding: 0.25rem 0 0.35rem;
        }
        .agent-msg-loading-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--muted);
          animation: agentDot 1.15s infinite ease-in-out both;
        }
        .agent-msg-loading-dot:nth-child(2) { animation-delay: 0.18s; }
        .agent-msg-loading-dot:nth-child(3) { animation-delay: 0.36s; }
        @keyframes agentDot {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40% { transform: scale(1); opacity: 1; }
        }
        .agent-msg-loading-text {
          font-size: 0.875rem;
          color: var(--muted);
          margin-left: 0.15rem;
        }
        .agent-chart-block {
          margin: 1.35rem 0;
          width: 100%;
          max-width: 100%;
        }
        .agent-chart-title {
          margin: 0 0 0.6rem 0;
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--muted);
        }
        .agent-chart-inner {
          border-radius: 0.75rem;
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          padding: 0.35rem 0.25rem 0;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          width: 100%;
          min-height: 260px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--card-border);
          border-radius: 20px;
        }
        .agent-page-header {
          flex-shrink: 0;
          margin: 0;
          padding: 0;
        }
        .agent-page-header-inner {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          border-radius: 1rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248, 250, 252, 0.92) 100%);
          border: 1px solid var(--card-border);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }
        .agent-page-header-icon {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
        }
        .agent-page-header-copy {
          min-width: 0;
          flex: 1;
          padding-top: 2px;
        }
        .agent-page-title {
          margin: 0;
          font-size: 1.375rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--foreground);
          line-height: 1.2;
        }
        .agent-page-subtitle {
          margin: 0.5rem 0 0 0;
          font-size: 0.875rem;
          line-height: 1.55;
          color: var(--muted);
          max-width: 52ch;
        }
        .agent-markdown {
          color: var(--foreground);
          width: 100%;
          min-width: 0;
          overflow-wrap: break-word;
        }
        .agent-markdown p {
          margin-bottom: 1rem;
          color: var(--muted);
          line-height: 1.65;
        }
        .agent-markdown h3 {
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          color: var(--foreground);
          font-size: 1.125rem;
          font-weight: 600;
        }
        .agent-markdown code {
          background: #f1f5f9;
          padding: 0.15rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
          color: var(--primary);
        }
        .agent-markdown strong {
          color: var(--foreground);
          font-weight: 600;
        }
        .agent-markdown .agent-table-scroll {
          overflow-x: auto;
          margin: 1.25rem 0;
          width: 100%;
          max-width: none;
          border-radius: 0.625rem;
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          -webkit-overflow-scrolling: touch;
        }
        .agent-markdown table.agent-md-table {
          width: 100%;
          min-width: 720px;
          border-collapse: collapse;
          font-size: 0.9375rem;
          line-height: 1.5;
          table-layout: auto;
        }
        .agent-markdown table.agent-md-table thead {
          background: #f1f5f9;
        }
        .agent-markdown table.agent-md-table th {
          padding: 0.85rem 1.125rem;
          text-align: left;
          font-weight: 600;
          color: var(--foreground);
          white-space: normal;
          word-break: break-word;
          border-bottom: 2px solid var(--card-border);
          border-right: 1px solid var(--card-border);
          vertical-align: bottom;
          min-width: 8rem;
        }
        .agent-markdown table.agent-md-table th:last-child {
          border-right: none;
        }
        .agent-markdown table.agent-md-table td {
          padding: 0.7rem 1.125rem;
          color: var(--muted);
          border-bottom: 1px solid var(--card-border);
          border-right: 1px solid var(--card-border);
          vertical-align: top;
          word-break: break-word;
          white-space: normal;
          min-width: 7rem;
        }
        .agent-markdown table.agent-md-table td:last-child {
          border-right: none;
        }
        .agent-markdown table.agent-md-table tbody tr:nth-child(even) td {
          background: rgba(248, 250, 252, 0.85);
        }
        .agent-markdown table.agent-md-table tbody tr:last-child td {
          border-bottom: none;
        }
        .agent-markdown ul, .agent-markdown ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
          color: var(--muted);
        }
        .agent-markdown li {
          margin-bottom: 0.35rem;
        }
      `}} />
    </DashboardLayout>
  );
}
