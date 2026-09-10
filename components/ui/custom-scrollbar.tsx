// ============================================================================
// Forgeworks - Custom Scrollbar
// Global custom scrollbar component with smooth styling
// ============================================================================

"use client";

import { useEffect } from "react";

const scrollbarStyles = `
  /* ── Light theme scrollbar (default) ─────────────────────────── */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: #f0eef5;
    border-radius: 10px;
    border: 1px solid #e0dde8;
  }

  ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #c4c0d0, #b0acc0);
    border-radius: 10px;
    border: 2px solid #f0eef5;
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.06);
  }

  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #a8a4b8, #9894a8);
    border: 2px solid #f0eef5;
  }

  ::-webkit-scrollbar-thumb:active {
    background: linear-gradient(180deg, #908ca0, #807c90);
  }

  ::-webkit-scrollbar-corner {
    background: #f0eef5;
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: #b0acc0 #f0eef5;
  }

  /* ── Dark theme scrollbar ────────────────────────────────────── */
  .dark ::-webkit-scrollbar-track {
    background: #1a1a2e;
    border: 1px solid #2a2a3e;
  }

  .dark ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #4a4a6a, #3a3a5a);
    border: 2px solid #1a1a2e;
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

  .dark ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #5a5a7a, #4a4a6a);
    border: 2px solid #1a1a2e;
  }

  .dark ::-webkit-scrollbar-thumb:active {
    background: linear-gradient(180deg, #6a6a8a, #5a5a7a);
  }

  .dark ::-webkit-scrollbar-corner {
    background: #1a1a2e;
  }

  .dark * {
    scrollbar-color: #4a4a6a #1a1a2e;
  }

  /* ── Shared utilities ────────────────────────────────────────── */
  html {
    scroll-behavior: smooth;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Thin scrollbar variant */
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    border: none;
  }

  /* Primary colored scrollbar */
  .scrollbar-primary::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #7c3aed, #6d28d9);
  }
  .scrollbar-primary::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #8b5cf6, #7c3aed);
  }
  .scrollbar-primary {
    scrollbar-color: #7c3aed transparent;
  }
`;

export function CustomScrollbar() {
  useEffect(() => {
    // Inject styles into head
    const style = document.createElement("style");
    style.id = "janitorforge-custom-scrollbar";
    style.textContent = scrollbarStyles;
    document.head.appendChild(style);

    return () => {
      const existing = document.getElementById("janitorforge-custom-scrollbar");
      if (existing) existing.remove();
    };
  }, []);

  return null;
}
