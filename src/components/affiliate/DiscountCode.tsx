"use client";

import { useState } from "react";

/** Copy-to-clipboard pill. Copying is not an affiliate click and isn't logged. */
export function DiscountCode({ code, className = "" }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context): the code is still visible to copy by hand.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-2 rounded-full border border-dashed border-rainbow-yellow/60 bg-rainbow-yellow/10 px-4 py-1.5 font-mono text-sm font-semibold text-rainbow-yellow hover:bg-rainbow-yellow/20 transition-colors ${className}`}
      aria-label={`Copy discount code ${code}`}
    >
      <span>{code}</span>
      <span className="font-sans text-xs font-medium text-surface-300" aria-live="polite">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}
