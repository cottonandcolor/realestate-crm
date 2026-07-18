"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-label={alt}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        cursor: "zoom-out",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          color: "#fff",
          borderRadius: "0.5rem",
          padding: "0.4rem 0.75rem",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}
      >
        Close ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "min(1100px, 100%)",
          maxHeight: "92vh",
          width: "auto",
          height: "auto",
          borderRadius: "0.5rem",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          cursor: "default",
        }}
      />
    </div>,
    document.body
  );
}
