"use client";

import { useCallback } from "react";
import { useSpeechInput, type SpeechState } from "@/hooks/useSpeechInput";

const STATE_STYLE: Record<SpeechState, { bg: string; title: string; label: string }> = {
  idle:        { bg: "rgba(255,255,255,0.08)", title: "Click to dictate",       label: "🎤" },
  listening:   { bg: "rgba(251,113,133,0.25)", title: "Listening… click to stop", label: "⏹" },
  processing:  { bg: "rgba(251,191,36,0.2)",   title: "Processing…",             label: "⌛" },
  unsupported: { bg: "rgba(100,116,139,0.15)", title: "Voice not supported in this browser", label: "🎤" },
};

export function MicButton({
  onTranscript,
  size = "md",
  className,
}: {
  onTranscript: (text: string) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const handleResult = useCallback(
    (text: string) => { onTranscript(text); },
    [onTranscript]
  );

  const { state, start, stop, supported } = useSpeechInput(handleResult);

  if (!supported) return null;

  const meta = STATE_STYLE[state];
  const isListening = state === "listening";
  const sz = size === "sm" ? "0.9rem" : "1rem";
  const pad = size === "sm" ? "0.3rem 0.55rem" : "0.45rem 0.75rem";

  return (
    <button
      type="button"
      title={meta.title}
      className={className}
      onClick={isListening ? stop : start}
      style={{
        background: meta.bg,
        border: `1.5px solid ${isListening ? "rgba(251,113,133,0.6)" : "var(--color-border)"}`,
        borderRadius: "var(--radius-sm)",
        padding: pad,
        cursor: "pointer",
        fontSize: sz,
        lineHeight: 1,
        color: "var(--color-text)",
        transition: "background 0.15s, border-color 0.15s",
        animation: isListening ? "mic-pulse 1.2s ease-in-out infinite" : "none",
        flexShrink: 0,
      }}
    >
      {meta.label}
    </button>
  );
}
