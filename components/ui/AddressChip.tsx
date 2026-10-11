"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

/**
 * Truncated contract-address pill with copy + explorer actions - the header
 * chip from the token/pool detail pattern. Copy flips to a check for 1.5s.
 */
export function AddressChip({
  address,
  href,
  className = "",
}: {
  address: string;
  href?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full border border-line-strong bg-fill pl-2.5 text-[11.5px] font-medium text-dim ${className}`}
    >
      <span className="tnum">
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
      <button
        type="button"
        aria-label="Copy contract address"
        onClick={copy}
        className={`px-1 transition-colors ${
          copied ? "text-accent" : "text-dim hover:text-accent"
        }`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" strokeWidth={1.7} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={1.7} />
        )}
      </button>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label="View on BscScan"
          className="pr-2 text-dim transition-colors hover:text-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
        </a>
      ) : null}
    </span>
  );
}
