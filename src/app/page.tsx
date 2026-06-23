'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';

interface Mailbox {
  id: string;
  email: string;
  provider: string;
  createdAt: string;
  _count: { messages: number };
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function DashboardPage() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchMailboxes = useCallback(async () => {
    try {
      const res = await fetch('/api/mailboxes');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMailboxes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMailboxes(); }, [fetchMailboxes]);

  const createMailbox = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/mailboxes', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Tạo email thất bại');
      }
      const newMailbox = await res.json();
      setMailboxes(prev => [newMailbox, ...prev]);
      addToast(`Đã tạo: ${newMailbox.email}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Lỗi tạo email', 'error');
    } finally {
      setCreating(false);
    }
  };

  const deleteMailbox = async (id: string, email: string) => {
    if (!confirm(`Xóa mailbox ${email}?`)) return;
    try {
      const res = await fetch(`/api/mailboxes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa thất bại');
      setMailboxes(prev => prev.filter(m => m.id !== id));
      addToast(`Đã xóa: ${email}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Lỗi xóa', 'error');
    }
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    addToast(`Đã copy: ${email}`, 'success');
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold gradient-text mb-3">
          TempMail Manager
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-8">
          Tạo email tạm thời, nhận mail thật, tự động phát hiện mã OTP
        </p>
        <button
          onClick={createMailbox}
          disabled={creating}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-base shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {creating ? (
            <>
              <LoadingSpinner size="sm" />
              Đang tạo...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Tạo Temp Mail
            </>
          )}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-xl p-5 space-y-3">
              <div className="h-5 w-3/4 rounded animate-shimmer" />
              <div className="h-4 w-1/2 rounded animate-shimmer" />
              <div className="h-8 w-full rounded animate-shimmer" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchMailboxes} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer">
            Thử lại
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && mailboxes.length === 0 && (
        <EmptyState
          icon="mail"
          title="Chưa có email tạm thời nào"
          description="Bấm nút 'Tạo Temp Mail' để bắt đầu nhận email"
        />
      )}

      {/* Mailbox Grid */}
      {!loading && !error && mailboxes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mailboxes.map((mb, idx) => (
            <div
              key={mb.id}
              className="glass-card-hover rounded-xl p-5 flex flex-col gap-3"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* Top: status + provider */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">Active</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-medium">
                  {mb.provider}
                </span>
              </div>

              {/* Email */}
              <p className="text-sm font-mono text-zinc-200 truncate" title={mb.email}>
                {mb.email}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>{timeAgo(mb.createdAt)}</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  {mb._count.messages} mail
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-zinc-800/50">
                <button
                  onClick={() => copyEmail(mb.email)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer"
                  title="Sao chép email"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Copy
                </button>
                <Link
                  href={`/mailbox/${mb.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-medium transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Chi tiết
                </Link>
                <button
                  onClick={() => deleteMailbox(mb.id, mb.email)}
                  className="px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 text-xs transition cursor-pointer"
                  title="Xóa mailbox"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
