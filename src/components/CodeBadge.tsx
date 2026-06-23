'use client';

import { useState } from 'react';

interface CodeBadgeProps {
  code: string;
  type?: 'numeric' | 'alphanumeric';
  onCopy?: (code: string) => void;
}

export default function CodeBadge({ code, type = 'numeric', onCopy }: CodeBadgeProps) {
  const [copied, setCopied] = useState(false);

  const isNumeric = type === 'numeric';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.(code);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      onCopy?.(code);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`
        group relative flex flex-col items-center gap-2 p-4 rounded-xl
        bg-zinc-900/80 backdrop-blur-sm border cursor-pointer
        transition-all duration-300 hover:scale-105
        ${isNumeric
          ? 'border-emerald-500/30 hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-500/10'
          : 'border-cyan-500/30 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/10'
        }
      `}
    >
      {/* Gradient top accent */}
      <div
        className={`absolute top-0 left-4 right-4 h-[2px] rounded-full ${
          isNumeric
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : 'bg-gradient-to-r from-blue-400 to-cyan-500'
        }`}
      />

      {/* Type label */}
      <span
        className={`text-[10px] uppercase tracking-widest font-medium ${
          isNumeric ? 'text-emerald-400/70' : 'text-cyan-400/70'
        }`}
      >
        {isNumeric ? 'Numeric Code' : 'Alphanumeric Code'}
      </span>

      {/* Code value */}
      <span
        className={`text-2xl font-mono font-bold tracking-[0.2em] ${
          isNumeric ? 'text-emerald-300' : 'text-cyan-300'
        }`}
      >
        {code}
      </span>

      {/* Copy indicator */}
      <div className="flex items-center gap-1.5">
        {copied ? (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Copied!
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
              />
            </svg>
            Click to copy
          </span>
        )}
      </div>
    </button>
  );
}
