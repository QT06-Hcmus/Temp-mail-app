'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import CodeBadge from '@/components/CodeBadge';
import LoadingSpinner from '@/components/LoadingSpinner';

interface DetectedCode {
  code: string;
  type: 'numeric' | 'alphanumeric';
  context: string;
}

interface MessageDetail {
  id: string;
  fromAddress: string;
  fromName: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  receivedAt: string;
  detectedCodes: DetectedCode[];
}

function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove event handlers
  clean = clean.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  // Remove javascript: URLs
  clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  // Remove data: URLs in src attributes (potential XSS)
  clean = clean.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');
  return clean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function MessageDetailPage() {
  const params = useParams();
  const mailboxId = params.id as string;
  const messageId = params.messageId as string;
  const { addToast } = useToast();

  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');

  const fetchMessage = useCallback(async () => {
    try {
      const res = await fetch(`/api/mailboxes/${mailboxId}/messages/${messageId}`);
      if (!res.ok) throw new Error('Message not found');
      const data = await res.json();
      setMessage(data);
      // Default to text mode if no HTML
      if (!data.htmlBody) setViewMode('text');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải email');
    } finally {
      setLoading(false);
    }
  }, [mailboxId, messageId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchMessage();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchMessage]);

  const htmlBody = message?.htmlBody ?? '';
  const sanitizedHtml = useMemo(() => {
    if (!htmlBody) return '';
    return sanitizeHtml(htmlBody);
  }, [htmlBody]);

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error || 'Email không tìm thấy'}</p>
        <Link href={`/mailbox/${mailboxId}`} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition">
          ← Về hộp thư
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href={`/mailbox/${mailboxId}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Về hộp thư
      </Link>

      {/* Message Header */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <h1 className="text-xl font-bold text-zinc-100 mb-4">{message.subject}</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
              {(message.fromName || message.fromAddress).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-zinc-200">{message.fromName || message.fromAddress}</p>
              <p className="text-xs text-zinc-500">{message.fromAddress}</p>
            </div>
          </div>
          <span className="text-xs text-zinc-500 sm:ml-auto">
            {formatDate(message.receivedAt)}
          </span>
        </div>
      </div>

      {/* Detected Codes */}
      {message.detectedCodes && message.detectedCodes.length > 0 && (
        <div className="mb-6 rounded-xl p-5 border border-emerald-500/30 bg-emerald-950/20">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            <h2 className="text-base font-semibold text-emerald-300">
              Mã code phát hiện được ({message.detectedCodes.length})
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {message.detectedCodes.map((code, i) => (
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
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-zinc-900 rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode('html')}
          disabled={!message.htmlBody}
          className={`px-4 py-2 rounded-md text-sm font-medium transition cursor-pointer
            ${viewMode === 'html' ? 'bg-violet-500/30 text-violet-300' : 'text-zinc-400 hover:text-zinc-200'}
            ${!message.htmlBody ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          HTML
        </button>
        <button
          onClick={() => setViewMode('text')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition cursor-pointer
            ${viewMode === 'text' ? 'bg-violet-500/30 text-violet-300' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          Plain Text
        </button>
      </div>

      {/* Email Body */}
      <div className="glass-card rounded-xl overflow-hidden">
        {viewMode === 'html' && sanitizedHtml ? (
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,-apple-system,sans-serif;color:#e4e4e7;background:#18181b;padding:20px;margin:0;font-size:14px;line-height:1.6}a{color:#a78bfa}img{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}td,th{padding:8px}</style></head><body>${sanitizedHtml}</body></html>`}
            className="w-full min-h-[400px] border-0"
            sandbox="allow-same-origin"
            title="Email content"
            style={{ height: '60vh' }}
          />
        ) : (
          <div className="p-6">
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
              {message.textBody || '(Không có nội dung text)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
