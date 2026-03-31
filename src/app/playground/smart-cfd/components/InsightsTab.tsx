'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface InsightsTabProps {
  insightsUrl?: string;
  readOnly?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function InsightsTab({ insightsUrl, readOnly }: InsightsTabProps = {}) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const baseUrl = insightsUrl || '/api/smart-cfd/insights';

  const fetchInsights = useCallback(async (regenerate = false) => {
    if (regenerate) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const url = regenerate ? `${baseUrl}?regenerate=true` : baseUrl;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate insights');
      }
      const data = await res.json();
      setNarrative(data.narrative);
      setGeneratedAt(data.generatedAt || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading || !narrative) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: message }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/smart-cfd/insights/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          currentInsights: narrative,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const data = await res.json();
      setChatMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch {
      setChatMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  };

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4 animate-pulse">🧠</div>
        <h3 className="text-lg font-semibold text-white mb-2">Loading insights...</h3>
        <p className="text-surface-400 text-sm">Checking for your training analysis</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={() => fetchInsights()}
          className="px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white text-sm rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!narrative) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-surface-400 text-sm">
            AI-generated analysis of your training data
          </p>
          {generatedAt && (
            <p className="text-surface-500 text-xs mt-0.5">
              Generated {formatRelativeTime(generatedAt)}
            </p>
          )}
        </div>
        {!readOnly && (
          <button
            onClick={() => fetchInsights(true)}
            disabled={regenerating}
            className="text-accent-400 hover:text-accent-300 text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {regenerating ? (
              <>
                <span className="animate-spin inline-block w-3 h-3 border border-accent-400 border-t-transparent rounded-full" />
                Regenerating...
              </>
            ) : (
              'Regenerate'
            )}
          </button>
        )}
      </div>

      <div className="card p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rainbow-purple to-rainbow-cyan" />
        <div className="prose-invert max-w-none">
          <NarrativeRenderer markdown={narrative} />
        </div>
      </div>

      {/* Chat section */}
      {!readOnly && (
        <div className="space-y-4">
          {!showChat ? (
            <button
              onClick={() => {
                setShowChat(true);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="card p-4 w-full text-left hover:border-surface-600 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">💬</span>
                <div>
                  <p className="text-white text-sm font-medium group-hover:text-accent-300 transition-colors">
                    Ask about your insights
                  </p>
                  <p className="text-surface-500 text-xs">
                    Get specific feedback on your training, ask follow-up questions, or dig deeper into any area
                  </p>
                </div>
              </div>
            </button>
          ) : (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💬</span>
                  <span className="text-white text-sm font-medium">Chat about your insights</span>
                </div>
                <button
                  onClick={() => {
                    setShowChat(false);
                    setChatMessages([]);
                    setChatInput('');
                  }}
                  className="text-surface-500 hover:text-surface-300 text-xs transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Messages */}
              {chatMessages.length > 0 && (
                <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-accent-600/30 text-white'
                            : 'bg-surface-800 text-surface-200'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <NarrativeRenderer markdown={msg.content} />
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-surface-800 rounded-lg px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <span className="w-1.5 h-1.5 bg-surface-500 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-surface-500 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-surface-500 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-surface-700">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about your training, lifts, weaknesses..."
                    disabled={chatLoading}
                    className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-accent-500 disabled:opacity-50 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-4 py-2.5 bg-accent-600 hover:bg-accent-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-accent-600"
                  >
                    Send
                  </button>
                </form>
                {chatMessages.length === 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      'What should I focus on this month?',
                      'How can I improve my Rx rate?',
                      'Break down my strength progress',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setChatInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="text-xs px-3 py-1.5 rounded-full border border-surface-700 text-surface-400 hover:text-white hover:border-surface-500 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NarrativeRenderer({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-lg font-semibold text-white mt-6 mb-2 first:mt-0">
          {line.replace('## ', '')}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-base font-medium text-white mt-4 mb-2">
          {line.replace('### ', '')}
        </h3>
      );
    } else if (line.trim() === '') {
      // skip blank lines
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={key++} className="text-surface-300 text-sm leading-relaxed ml-4 list-disc">
          <InlineMarkdown text={line.replace('- ', '')} />
        </li>
      );
    } else {
      elements.push(
        <p key={key++} className="text-surface-300 text-sm leading-relaxed mb-3">
          <InlineMarkdown text={line} />
        </p>
      );
    }
  }

  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white font-medium">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
