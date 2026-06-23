'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import CodeBadge from '@/components/CodeBadge';

interface Mailbox {
  id: string;
  email: string;
  provider: string;
  createdAt: string;
  token?: string;
}

interface DetectedCode {
  code: string;
  type: 'numeric' | 'alphanumeric';
  context: string;
}

interface Message {
  id: string;
  providerMessageId: string;
  fromAddress: string;
  fromName: string;
  subject: string;
  preview: string;
  receivedAt: string;
  detectedCodes: DetectedCode[];
  isRead: boolean;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h trước`;
  const days = Math.floor(hours / 24);
  return `${days}d trước`;
}

export default function MailboxDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { addToast } = useToast();

  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMailbox = useCallback(async () => {
    try {
      const res = await fetch(`/api/mailboxes/${id}`);
      if (!res.ok) throw new Error('Mailbox not found');
      const data = await res.json();
      setMailbox(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải mailbox');
    }
  }, [id]);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/mailboxes/${id}/messages`);
      if (!res.ok) throw new Error('Lỗi tải inbox');
      const data = await res.json();
      setMessages(data.messages || []);
      if (data.warning && !silent) {
        addToast(data.warning, 'warning');
      }
      setError(null);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Lỗi');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchMailbox();
    fetchMessages();
  }, [fetchMailbox, fetchMessages]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchMessages(true), 5000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchMessages]);

  const copyEmail = () => {
    if (mailbox) {
      navigator.clipboard.writeText(mailbox.email);
      addToast('Đã copy email!', 'success');
    }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      const res = await fetch(`/api/mailboxes/${id}/messages/${msgId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa thất bại');
      setMessages(prev => prev.filter(m => m.id !== msgId));
      addToast('Đã xóa email', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Lỗi xóa', 'error');
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-8 w-48 rounded animate-shimmer mb-6" />
        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="h-6 w-96 rounded animate-shimmer mb-3" />
          <div className="h-4 w-48 rounded animate-shimmer" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-xl p-5">
              <div className="h-4 w-3/4 rounded animate-shimmer mb-2" />
              <div className="h-3 w-1/2 rounded animate-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !mailbox) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/" className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition">
          ← Về Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Về Dashboard
      </Link>

      {/* Mailbox Header Card */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xl font-mono font-bold text-zinc-100 truncate">{mailbox?.email}</p>
                <p className="text-xs text-zinc-500">
                  {mailbox?.provider} • Tạo {mailbox ? timeAgo(mailbox.createdAt) : ''}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={copyEmail}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 font-medium text-sm transition cursor-pointer flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            Copy Email
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-lg font-semibold text-zinc-200">
          Hộp thư ({messages.length})
        </h2>
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative w-10 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-violet-500' : 'bg-zinc-700'} cursor-pointer`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-5' : ''}`} />
            </button>
            Auto-refresh {autoRefresh && <span className="text-violet-400 text-xs">(5s)</span>}
          </label>

          {/* Refresh button */}
          <button
            onClick={() => fetchMessages()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition cursor-pointer disabled:opacity-50"
          >
            {refreshing ? <LoadingSpinner size="sm" /> : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            )}
            Làm mới
          </button>
        </div>
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Chưa có email nào"
          description={autoRefresh ? "Đang chờ email... tự động refresh mỗi 5 giây" : "Bật auto-refresh hoặc bấm 'Làm mới' để kiểm tra"}
        />
      ) : (
        <div className="space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className="glass-card-hover rounded-xl p-5 animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!msg.isRead && <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />}
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {msg.fromName || msg.fromAddress}
                    </p>
                    <span className="text-xs text-zinc-500 flex-shrink-0">{timeAgo(msg.receivedAt)}</span>
                  </div>
                  <p className={`text-sm truncate mb-1 ${msg.isRead ? 'text-zinc-400' : 'text-zinc-200 font-semibold'}`}>
                    {msg.subject}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{msg.preview}</p>

                  {/* Detected codes */}
                  {msg.detectedCodes && msg.detectedCodes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.detectedCodes.map((code, i) => (
                        <CodeBadge
                          key={i}
                          code={code.code}
                          type={code.type}
                          onCopy={() => {
                            navigator.clipboard.writeText(code.code);
                            addToast(`Đã copy mã: ${code.code}`, 'success');
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/mailbox/${id}/message/${msg.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-medium transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Đọc
                  </Link>
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 text-xs transition cursor-pointer"
                    title="Xóa email"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
