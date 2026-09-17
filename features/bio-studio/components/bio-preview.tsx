"use client";

import { useEffect, useMemo, useRef } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { sanitizeBioForPreview } from "../lib/bio-html";
import type { BioPreviewMode, BioViewport } from "../types/bio-types";

const VIEWPORT_WIDTH: Record<BioViewport, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 390,
};

type BioPreviewProps = {
  html: string;
  viewport: BioViewport;
  mode: BioPreviewMode;
  onViewportChange: (viewport: BioViewport) => void;
  onModeChange: (mode: BioPreviewMode) => void;
};

function buildPreviewDocument(html: string, mode: BioPreviewMode) {
  const safeHtml = sanitizeBioForPreview(html);

  if (mode === "canvas") {
    return `
  <!doctype html>
  <html>

  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; form-action 'none'" />
    <style>
      :root {
        color-scheme: dark;
        background: #09080d;
        color: #f7f5fa;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        min-height: 100%;
        background: #09080d;
      }

      body {
        padding: 24px;
        overflow-wrap: anywhere;
      }

      img,
      video,
      iframe,
      svg {
        max-width: 100%;
      }

      .canvas,
      .canvas * {
        min-width: 0;
        box-sizing: border-box;
      }

      .canvas {
        width: min(100%, 900px);
        margin: 0 auto;
        overflow-wrap: anywhere;
        word-break: normal;
      }

      .canvas h1,
      .canvas h2,
      .canvas h3,
      .canvas h4,
      .canvas strong {
        overflow-wrap: anywhere;
      }

      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, .22) transparent;
      }

      *::-webkit-scrollbar {
        width: 7px;
        height: 7px;
      }

      *::-webkit-scrollbar-track {
        background: transparent;
      }

      *::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, .18);
        border-radius: 999px;
      }

      *::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, .28);
      }

      @media(max-width:520px) {
        body {
          padding: 8px;
        }

        .canvas {
          width: 100%;
        }
      }
    </style>
  </head>

  <body>
    <main class="canvas">${safeHtml || '<p style="color:#8d8794">Your bio preview will appear here.</p>'}</main>
  </body>

  </html>`;
  }

  return `
  <!doctype html>
  <html>

  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; form-action 'none'" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Jura:wght@300..700&display=swap');
    </style>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #313338;
        color: #f4f4f6;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        min-height: 100%;
        background: #303136;
      }

      body {
        font-size: 14px;
        overflow-wrap: anywhere;
      }

      img,
      video,
      iframe,
      svg {
        max-width: 100%;
      }

      button,
      input {
        font: inherit;
      }

      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, .15) transparent;
      }

      *::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      *::-webkit-scrollbar-track {
        background: transparent;
      }

      *::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, .12);
        border-radius: 999px;
      }

      *::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, .22);
      }

      .icon {
        width: 16px;
        height: 16px;
        flex: 0 0 auto;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .jai-topbar {
        position: sticky;
        top: 0;
        z-index: 50;
        display: grid;
        grid-template-columns: minmax(150px, 1fr) minmax(260px, 430px) minmax(210px, 1fr);
        align-items: center;
        width: 100%;
        height: 56px;
        padding: 4px 3rem;
        background: #313338;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -2px rgba(0, 0, 0, .1);
      }

      .brand,
      .top-actions,
      .search-shell {
        display: flex;
        align-items: center;
      }

      .brand {
        gap: 18px;
      }

      .brand span {
        font-size: .875rem;
        font-weight: 500;
        cursor: pointer;
        height: 26px;
        line-height: 21px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        padding: 2px 8px;
        color: rgba(255, 255, 255, .7);
        transition: color .25s cubic-bezier(.22, 1, .36, 1);
      }

      .brand span:hover {
        color: #fff;
      }

      .brand-mark {
        display: flex;
        align-items: center;
        flex: 0 0 auto;
        cursor: pointer;
      }

      .search-shell {
        height: 36px;
        gap: 8px;
        padding: 0 12px;
        border: 1px solid rgba(255, 255, 255, .10);
        border-radius: 12px;
        background: #383a40;
        color: #a9abb3;
      }

      .search-shell svg {
        cursor: pointer;
      }

      .search {
        color: rgba(255, 255, 255, .5);
      }

      .search-label {
        flex: 1;
        font-size: .875rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        font-weight: 500;
        min-width: 0;
      }

      .keycap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        height: 1.375rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        cursor: pointer;
        min-width: 2rem;
        padding: 0 .375rem;
        border: 1px solid rgba(255, 255, 255, .15);
        border-radius: .375rem;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05);
        color: rgba(255, 255, 255, .5);
        font-size: .75rem;
        font-weight: 500;
        line-height: 1;
        white-space: nowrap;
      }

      .top-actions {
        justify-self: end;
        gap: 12px;
      }

      .create-character {
        padding: 1px 5px 1px 5px;
        border-radius: 10px;
        height: 26px;
        font-family: "Jura", sans-serif;
        font-weight: 700;
        background: #09142f32;
        cursor: pointer;
        color: #93959c;
        font-size: 12px;
        line-height: 24px;
      }

      .avatar {
        width: 36px;
        height: 36px;
        min-width: 36px;
        border-radius: 0.375rem;
        cursor: pointer;
        background:
          linear-gradient(145deg, rgba(255, 255, 255, .13), transparent),
          linear-gradient(135deg, #54465f, #af75bd 48%, #5a798e);
        transition: transform 0.2s ease;
      }

      .avatar:hover {
        transform: scale(1.05);
      }

      .page {
        display: grid;
        grid-template-columns: minmax(360px, 640px) minmax(390px, 600px);
        gap: 42px;
        width: min(1280px, calc(100% - 72px));
        margin: 30px auto 72px;
        align-items: start;
      }

      .character-column,
      .right-column {
        min-width: 0;
      }

      .character-column {
        display: grid;
        gap: 14px;
        align-content: start;
      }

      .analytics-panel {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 48px;
        border-radius: 6px;
        padding: .5rem;
        width: 100%;
        font-family: JetBrains Mono, monospace;
        background: rgba(0, 0, 0, .3);
        border: 1px solid rgba(255, 255, 255, .08);
        margin-top: .5rem;
        margin-bottom: 1rem;
        border: 1px solid rgba(255, 255, 255, .06);
        background: linear-gradient(180deg, #25272c 0%, #1f2126 100%);
        box-shadow: 0 10px 24px rgba(8, 9, 12, .12);
      }

      .analytics-left {
        display: flex;
        gap: .4rem;
        min-width: 0;
        align-items: center;
      }

      .analytics-icon svg {
        color: rgba(255, 255, 255, .4);
        display: flex;
        align-items: center;
        font-size: .9rem;
      }

      .analytics-label {
        font-size: .85rem;
        font-weight: 600;
        color: rgba(255, 255, 255, .7);
        text-transform: uppercase;
        letter-spacing: .08em;
      }

      .analytics-beta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 19px;
        padding: 0 6px;
        font-size: .55rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: #38A169;
        background: rgba(56, 161, 105, .1);
        border: 1px solid rgba(56, 161, 105, .3);
        border-radius: 3px;
      }

      .analytics-collapse {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: rgba(255, 255, 255, .05);
        border: 1px solid rgba(255, 255, 255, .1);
        border-radius: 4px;
        color: rgba(255, 255, 255, .5);
        cursor: pointer;
        transition: all .15s ease;
      }

      .analytics-collapse:hover {
        background: rgba(255, 255, 255, .1);
        color: rgba(255, 255, 255, .7);
      }

      .character-card {
        overflow: hidden;
        border: 2px solid #9b74d7;
        border-radius: 8px;
        background: linear-gradient(141deg, rgba(255, 89, 211, 0.12) 12.3558%, rgba(68, 0, 255, 0.22) 36.8364%, rgba(37, 13, 80, 0.46) 80.13%, rgba(143, 91, 181, 0.22) 100%);
        box-shadow: rgba(0, 0, 0, 0.1) 0px 0px 0px 1px, rgba(0, 0, 0, 0.2) 0px 5px 10px, rgba(0, 0, 0, 0.4) 0px 15px 40px;
      }

      .character-title {
        padding: 11px 18px 5px;
        line-height: 1.2;
        color: #F786F4;
        font-family: "Jura";
        font-size: 25px;
        font-weight: 700;
      }

      .image-wrap {
        position: relative;
        width: 79%;
        margin: 5px auto 9px;
      }

      .image-frame {
        position: relative;
        width: 100%;
        aspect-ratio: 1/1;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, .1);
        border-radius: 8px;
        background: linear-gradient(145deg, #f8f8f8, #ececf0);
      }

      .image-frame::before {
        content: "";
        position: absolute;
        inset: 18%;
        border: 20px solid rgba(119, 68, 235, .92);
        border-top-color: rgba(242, 96, 172, .93);
        border-right-color: rgba(195, 81, 221, .93);
        border-radius: 55% 45% 58% 42%;
        transform: rotate(-10deg);
      }

      .image-frame::after {
        content: "";
        position: absolute;
        inset: 35% 38%;
        border-radius: 50%;
        background: #f8f8f8;
      }

      .stats-chip {
        position: absolute;
        top: 12px;
        right: -10px;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10), calc(100% - 10) 100%, calc(100% - 10) calc(100% - 10), 0 calc(100% - 10), 0 calc(50% - 10 / 2));
        padding: 5px 10px;
        filter: drop-shadow(2px 3px 2px rgba(0, 0, 0, .5));
        background: #8400ff9e;
        box-shadow: 0 calc(-1 * 10) 0 inset #0005;
        color: #f7eaff;
        font-size: 0.875rem;
        font-weight: 700;
        font-family: "Jura";
        box-shadow: 0 5px 14px rgba(0, 0, 0, .24);
      }

      .character-stats {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 0 20px 10px;
        color: #c9c7ce;
      }

      .byline {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        height: 40;
        padding: 8px 12px;
        border: 2px solid #977300;
        border-radius: 10px;
        background: #191108;
        cursor: pointer;
        color: #dfdce6;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        font-weight: 600;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
      }

      .byline .label {
        color: rgb(147, 149, 156);
        opacity: .9;
        font-size: 16px;
      }

      .byline b {
        color: #b894ff;
        font-weight: bold;
        font-size: 16px;
      }

      .social-stats {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .favorite-count {
        justify-content: center;
        min-width: 35px;
        height: 35px;
        line-height: 1;
        font-size: 16px;
        font-weight: 600;
        font-family: "Jura", sans-serif;
        color: #60A5FA;
        display: flex;
        align-items: center;
        gap: 2px;
        background: rgba(88, 101, 242, .1);
        padding: 4px 10px;
        border-radius: 20px;
        border: 1px solid rgba(88, 101, 242, .2);
        transition: all .2s ease;
      }

      .favorite-count span {
        font-weight: 700;
        font-size: 17px;
        letter-spacing: -.5px;
      }

      .favorite {
        position: relative;
        width: 30px;
        height: 30px;
        cursor: pointer;
      }

      .favorite-heart {
        content: "";
        position: absolute;
        width: 100px;
        height: 100px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: url(https://ella.janitorai.com/anouncements/favbutton.webp) no-repeat;
        background-position: 0 0;
        transition: background-position 1s steps(28);
        transition-duration: 0s;
        z-index: 10;
        pointer-events: none;
      }

      .bio-wrap {
        min-width: 0;
        padding: 0 18px 18px;
      }

      .bio-surface {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        border-radius: 14px;
        background: #0d0912;
      }

      .bio-surface,
      .bio-surface * {
        box-sizing: border-box;
        min-width: 0;
      }

      .bio-surface>* {
        max-width: 100%;
      }

      .bio-surface h1,
      .bio-surface h2,
      .bio-surface h3,
      .bio-surface h4,
      .bio-surface h5,
      .bio-surface h6,
      .bio-surface strong,
      .bio-surface b,
      .bio-surface a,
      .bio-surface p,
      .bio-surface span {
        overflow-wrap: anywhere;
        word-break: normal;
      }

      .bio-surface [style*="white-space: nowrap"],
      .bio-surface [style*="white-space:nowrap"] {
        white-space: normal !important;
      }

      .play-as {
        width: min(265px, calc(100% - 40px));
        margin: 0 auto 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 280px;
        padding: 7px 10px 7px 8px;
        border: 1px solid rgba(255, 255, 255, .1);
        border-radius: 10px;
        background: #ffffff08;
        color: #d5d8dc;
        cursor: pointer;
        font-size: 11px;
      }

      .chat-button {
        width: max-content;
        margin: 0 auto 20px;
        padding: 0.5em;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.08);
        color: #d9d6de;
        font-size: 16px;
        font-weight: 600;
      }

      .right-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
      }

      .right-heading {
        color: #ae99ff;
        font-family: "Jura";
        font-size: 1.875rem;
        margin-bottom: 0.25rem;
        font-weight: 700;
        line-height: 1.2;
      }

      .right-actions {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .small-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        height: 2rem;
        min-width: 2rem;
        padding-inline-start: 0.75rem;
        padding-inline-end: 0.75rem;
        vertical-align: middle;
        white-space: nowrap;
        border: 0;
        border-radius: 0.375rem;
        background: #c2b3ff;
        color: #1a202c;
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.2;
        cursor: pointer;
        user-select: none;
        transition-duration: 200ms;
      }

      .small-action:hover {
        background: #B794F4;
      }

      .small-action.danger {
        background: #feb2b2;
        color: #1a202c;
        transition-duration: 200ms;
      }

      .small-action.danger:hover {
        background: #FC8181;
      }

      .sm-text {
        font-size: 0.875rem;
      }

      .small-action svg {
        width: 1em;
        height: 1em;
        flex-shrink: 0;
      }

      .settings {
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, .08);
        border-radius: 12px;
        background: rgba(255, 255, 255, .05);
        box-shadow: 0 4px 16px rgba(0, 0, 0, .2), inset 0 1px 0 rgba(255, 255, 255, .1);
      }

      .setting {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 56px;
        padding: .75rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, .08);
        transition: background-color .2s ease;
      }

      .setting:hover {
        background: rgba(255, 255, 255, .02);
      }

      .setting:last-child {
        border-bottom: 0;
      }

      .setting-label {
        display: flex;
        min-width: 0;
        align-items: center;
      }

      .setting-title {
        font-size: .95rem;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        color: rgb(255 255 255 / 95%);
        line-height: 1.2;
      }

      .setting-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        margin-right: .875rem;
        border-radius: 6px;
        background: rgba(255, 255, 255, .08);
        font-size: 1.1rem;
        color: rgba(255, 255, 255, .08);
      }

      .setting-icon.is-lock {
        color: #f87171;
      }

      .setting-icon.is-eye-off {
        color: #93959c;
      }

      .setting-icon.is-shield {
        color: #84ddb0;
      }

      .setting-icon.is-comment {
        color: #77a4ff;
      }

      .setting-icon .icon {
        width: 1em;
        height: 1em;
      }

      .settings-section-label {
        padding: .5rem 1rem .25rem;
        color: rgba(255, 255, 255, .5);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        font-size: .7rem;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: .05em;
        text-transform: uppercase;
      }

      .section-divider {
        height: 1px;
        background: rgba(255, 255, 255, .08);
        margin: .5rem 0;
      }

      .toggle {
        position: relative;
        display: inline-block;
        flex-shrink: 0;
        font-size: 15px;
        width: 3.2em;
        height: 1.8em;
        margin-left: .75rem;
        cursor: pointer;
        border: 2px solid #5a5c63;
        border-radius: 50px;
        background: transparent;
        box-shadow: 0 0 20px rgba(0, 0, 0, .3);
      }

      .toggle::before {
        position: absolute;
        content: "";
        width: 1.2em;
        height: 1.2em;
        left: .15em;
        bottom: .17em;
        border-radius: inherit;
        background: #93959c;
      }

      .toggle.is-on {
        border: 2px solid #37ff00;
        box-shadow: 0 0 20px #09f14fcc;
      }

      .toggle.is-on::before {
        transform: translateX(1.3em);
        background-color: #00e974;
      }

      .select-chip {
        appearance: none;
        flex-shrink: 0;
        min-width: 140px;
        min-height: 38px;
        padding: .5rem 2rem .5rem .75rem;
        border: 1px solid rgba(255, 255, 255, .15);
        border-radius: 8px;
        background: rgba(255, 255, 255, .08);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255, 255, 255, .6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right .75rem center;
        cursor: pointer;
      }

      .select-chip:hover {
        background-color: rgba(255, 255, 255, .1);
        border-color: rgba(255, 255, 255, .25);
      }

      .select-chip-text {
        font-size: .85rem;
        color: rgba(255, 255, 255, .95);
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        line-height: 1.5;
        text-align: left;
      }

      .definition {
        margin-top: .75rem;
        margin-bottom: 1rem;
        padding: .75rem;
        border-radius: 8px;
        background: rgba(0, 0, 0, .3);
        border: 1px solid rgba(255, 255, 255, .05);
        font-family: "SF Mono", Monaco, Inconsolata, "Roboto Mono", Consolas, monospace;
        font-size: .8rem;
        line-height: 1.6;
      }

      .definition-row {
        display: flex;
        color: rgba(255, 255, 255, .7);
        justify-content: space-between;
        align-items: center;
        margin-bottom: .25rem;
        font-weight: 500;
      }

      .definition-value {
        color: #93959c;
        font-weight: 600;
        text-transform: uppercase;
        font-size: .75rem;
        letter-spacing: .5px;
      }

      .definition-value.on {
        color: #84ddb0;
      }

      .character-info-container {
        width: 100%;
        max-width: 100%;
        margin-bottom: 20px;
      }

      .hidden-personality {
        width: fit-content;
        margin: 2px 0 15px 0;
        padding: 4px 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "Jura", sans-serif;
        font-weight: 700;
        color: #93959c;
        text-align: center;
        background: #09142f32;
        border-radius: 10px;
        cursor: pointer;
        user-select: none;
      }

      @media (max-width: 900px) {
        .hidden-personality {
          width: min(462px, calc(100% - 12px));
        }
      }

      .accordion {
        display: grid;
        gap: .75rem;
      }

      .acc {
        background: #00000026;
        border-radius: 12px;
      }

      .acc-second {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: "Jura", sans-serif;
        min-height: 48px;
        backdrop-filter: blur(16px);
        padding: 1rem;
        border: 1px solid rgba(139, 92, 246, .2);
        border-radius: 12px;
        background: #8b5cf61f;
        color: #d6d1dc;
        font-size: 11px;
        font-weight: 700;
      }

      .acc span {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: .5rem;
        font-weight: 900;
        color: #ccc;
        letter-spacing: .025em;
        text-transform: uppercase;
        font-size: 1rem;
      }

      .acc-button svg {
        font-size: 1.125rem;
        color: #8b5cf6cc;
        display: inline-block;
        transform-origin: center;
      }

      .comments {
        margin-top: 29px;
      }

      .comment-title {
        display: flex;
        align-items: center;
        gap: 9px;
        color: #f0eff2;
        font-size: 12px;
        font-weight: 700;
      }

      .comment-title span {
        font-family: "Jura";
        font-size: 16px;
        font-weight: 700;
      }

      .comment-pill {
        width: auto;
        min-width: fit-content;
        padding: 0 14px;
        height: auto;
        min-height: 32px;
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(255, 255, 255, .1) 0%, rgba(255, 255, 255, .05) 50%, rgba(0, 0, 0, .05) 100%);
        border: 1px solid rgba(255, 255, 255, .15);
        border-bottom-color: rgba(255, 255, 255, .08);
        box-shadow: 0 2px 8px rgba(0, 0, 0, .2), 0 1px 2px rgba(0, 0, 0, .15), inset 0 1px 1px rgba(255, 255, 255, .15), inset 0 -1px 1px rgba(0, 0, 0, .05);
        color: #fff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, .4);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "Jura";
        font-size: 16px;
        cursor: default;
        overflow: visible;
        white-space: nowrap;
      }

      .cb-container {
        position: relative;
      }

      .comment-box {
        width: 100%;
        min-height: 48px;
        max-height: 220px;
        overflow-y: auto;
        border: 1px solid #8273bf42;
        margin-top: 1.5rem;
        border-radius: 8px;
        padding: 12px 16px;
        background-color: #2a2b2e;
        outline: none;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
        cursor: text;
      }

      .comment-box::before {
        content: "Write something";
        color: #c2b3ff;
        opacity: .7;
      }

      .comment-box-svg {
        align-items: center;
        background: transparent;
        border: none;
        border-radius: 999px;
        bottom: 8px;
        color: #93959c;
        cursor: pointer;
        display: inline-flex;
        height: 32px;
        justify-content: center;
        position: absolute;
        right: 8px;
        width: 32px;
        transition: background .15s ease, color .15s ease, transform .12s ease;
      }

      .comment-box-svg:hover {
        background: rgba(174, 153, 255, .2);
        color: #c2b3ff;
      }

      .comment-button {
        display: grid;
        place-items: center;
        outline: 2px solid transparent;
        white-space: nowrap;
        outline-offset: 2px;
        line-height: 1.2;
        border-radius: 8px;
        height: 2.5rem;
        min-width: 2.5rem;
        margin-top: 7px;
        width: 100%;
        border-radius: 6px;
        background: #c2b3ff;
        cursor: pointer;
        font-family: "Jura";
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0px 4px 12.9px 0px rgba(0, 0, 0, .5);
        color: #2a2b2e;
        transition-duration: 200ms;
      }

      .comment-button:hover {
        box-shadow: none;
        background: #B794F4;
      }

      .jai-bottom {
        display: none;
      }

      @media(max-width:980px) {
        .jai-topbar {
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 14px;
          padding: 0 16px;
        }

        .brand {
          gap: 12px;
          white-space: nowrap;
        }

        .search-shell {
          justify-self: center;
          width: min(100%, 520px);
          min-width: 0;
        }

        .search-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .create-character {
          display: none;
        }

        .top-actions {
          gap: 10px;
        }

        .page {
          grid-template-columns: minmax(250px, .92fr) minmax(300px, 1.08fr);
          gap: 22px;
          width: calc(100% - 34px);
        }

        .right-heading {
          font-size: 22px;
        }
      }

      @media(max-width:760px) and (min-width:601px) {
        .jai-topbar {
          gap: 10px;
          padding: 0 12px;
        }

        .search-shell {
          width: 100%;
        }

        .keycap {
          display: none;
        }
      }

      @media(max-width:600px) {
        body {
          padding-bottom: 58px;
          background: #2d2f34;
        }

        .jai-topbar {
          grid-template-columns: auto 1fr auto;
          height: 43px;
          padding: 0 18px;
          background: #27292e;
        }

        .brand {
          gap: 0;
        }

        .brand-mark {
          display: none;
        }

        .brand span:last-child {
          display: none;
        }

        .brand::before {
          content: "‹ Back";
          color: #ececef;
          font-size: 13px;
          font-weight: 600;
        }

        .search-shell {
          justify-self: center;
          height: auto;
          padding: 0;
          border: 0;
          background: transparent;
        }

        .search-shell .icon,
        .search-shell .keycap {
          display: none;
        }

        .search-label {
          font-size: 0;
        }


        .top-actions {
          gap: 12px;
        }

        .create-character,
        .top-actions .bell {
          display: none;
        }

        .top-actions::before {
          content: "";
          width: 16px;
          height: 16px;
          border: 2px solid #cdd0d6;
          border-radius: 50%;
          opacity: .85;
        }

        .avatar {
          width: 24px;
          height: 24px;
        }

        .page {
          display: block;
          width: auto;
          margin: 10px 15px 26px;
        }

        .right-column,
        .similar {
          display: none;
        }

        .character-card {
          border-radius: 7px;
        }

        .character-title {
          padding: 10px 20px 7px;
          font-size: 22px;
        }

        .image-wrap {
          width: 92%;
        }

        .character-stats {
          padding: 0 20px 9px;
        }

        .bio-wrap {
          padding: 0 20px 12px;
        }

        .play-as {
          width: calc(100% - 40px);
        }

        .jai-bottom {
          position: fixed;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: space-around;
          height: 56px;
          border-top: 1px solid rgba(255, 255, 255, .05);
          background: rgba(42, 44, 49, .92);
          backdrop-filter: blur(12px);
          color: #bfc6d0;
        }

        .jai-bottom .nav-item {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
        }
      }
    </style>
  </head>

  <body>
    <header class="jai-topbar">
      <div class="brand">
        <div class="brand-mark"><img
            src="https://whstlsvutyhiretmzhvj.supabase.co/storage/v1/object/sign/assets/jai-pride-logo.svg?token=eyJraWQiOiI0NDk3ZTQ1Ny05YzUzLTRiOWQtOGYxZS0zNGY1NGU2ZmRjNDMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvamFpLXByaWRlLWxvZ28uc3ZnIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4OTY0NTY5NywiZXhwIjozMzI5NDEwOTY5N30.h61eFu8vhH8LUuH2fqAY3clVKr87tChKeMIXJVZOYak"
            alt="Janitor" width="36" height="36"></div>
        <span>Home</span>
      </div>

      <div class="search-shell">
        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true"
          height="18" width="18" xmlns="http://www.w3.org/2000/svg">
          <path fill="none" d="M0 0h24v24H0V0z"></path>
          <path
            d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z">
          </path>
        </svg>
        <span class="search-label">Search</span>
        <span class="keycap">Ctrl K</span>
      </div>

      <div class="top-actions">
        <span class="create-character">Create a Character</span>
        <svg class="icon bell" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
          <path d="M10 21h4"></path>
        </svg>
        <span class="avatar"></span>
      </div>
    </header>

    <main class="page">
      <section class="character-column">
        <div class="analytics-panel">
          <div class="analytics-left">
            <span class="analytics-icon">
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256"
                class="_headerIcon_ud2h5_52" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0v94.37L90.73,98a8,8,0,0,1,10.07-.38l58.81,44.11L218.73,90a8,8,0,1,1,10.54,12l-64,56a8,8,0,0,1-10.07.38L96.39,114.29,40,163.63V200H224A8,8,0,0,1,232,208Z">
                </path>
              </svg>
            </span>
            <span class="analytics-label">ANALYTICS</span>
            <span class="analytics-beta">BETA</span>
          </div>

          <span class="analytics-collapse">
            <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256" height="1em"
              width="1em" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z">
              </path>
            </svg>
          </span>
        </div>

        <div class="character-card">
          <div class="character-title">Preview character</div>

          <div class="image-wrap">
            <div class="image-frame"></div>
            <div class="stats-chip">
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" class="css-0"
                height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M21 3h-7a2.98 2.98 0 0 0-2 .78A2.98 2.98 0 0 0 10 3H3a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h5.758c.526 0 1.042.214 1.414.586l1.121 1.121c.009.009.021.012.03.021.086.079.182.149.294.196h.002a.996.996 0 0 0 .762 0h.002c.112-.047.208-.117.294-.196.009-.009.021-.012.03-.021l1.121-1.121A2.015 2.015 0 0 1 15.242 20H21a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM8.758 18H4V5h6c.552 0 1 .449 1 1v12.689A4.032 4.032 0 0 0 8.758 18zM20 18h-4.758c-.799 0-1.584.246-2.242.689V6c0-.551.448-1 1-1h6v13z">
                </path>
              </svg>
              <span>0</span>
              <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round"
                stroke-linejoin="round" class="css-0" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10"></path>
                <path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2"></path>
              </svg>
              <span>0</span>
            </div>
          </div>

          <div class="character-stats">
            <span class="byline"><span class="label">by:</span> <b>@creator</b></span>
            <span class="social-stats">
              <div class="favorite-count"><span>0</span></div>
              <div class="favorite">
                <span class="favorite-heart"></span>
              </div>
            </span>
            </span>
          </div>

          <div class="bio-wrap">
            <article class="bio-surface">
              ${safeHtml || '<p style="padding:24px;color:#8d8794">Your bio preview will appear here.</p>'}
            </article>
          </div>

          <div class="play-as">Playing as &nbsp; <strong>Default persona</strong></div>
          <div class="chat-button">Chat with Character</div>
        </div>
      </section>

      <aside class="right-column">
        <div class="right-head">
          <div class="right-heading">more</div>
          <div class="right-actions">
            <span class="small-action danger">
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" aria-hidden="true"
                focusable="false" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32z">
                </path>
              </svg>
              <span class="sm-text">Delete</span>
            </span>
            <span class="small-action">
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 576 512" aria-hidden="true"
                focusable="false" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M402.3 344.9l32-32c5-5 13.7-1.5 13.7 5.7V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V112c0-26.5 21.5-48 48-48h273.5c7.1 0 10.7 8.6 5.7 13.7l-32 32c-1.5 1.5-3.5 2.3-5.7 2.3H48v352h352V350.5c0-2.1.8-4.1 2.3-5.6zm156.6-201.8L296.3 405.7l-90.4 10c-26.2 2.9-48.5-19.2-45.6-45.6l10-90.4L432.9 17.1c22.9-22.9 59.9-22.9 82.7 0l43.2 43.2c22.9 22.9 22.9 60 .1 82.8zM460.1 174L402 115.9 216.2 301.8l-7.3 65.3 65.3-7.3L460.1 174zm64.8-79.7l-43.2-43.2c-4.1-4.1-10.8-4.1-14.8 0L436 82l58.1 58.1 30.9-30.9c4-4.2 4-10.8-.1-14.9z">
                </path>
              </svg>
              <span class="sm-text">Edit</span>
            </span>
          </div>
        </div>

        <div class="settings">
          <div class="setting">
            <span class="setting-label">
              <span class="setting-icon is-lock">
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256"
                  class="_iconPrivate_1s17f_90" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z">
                  </path>
                </svg>
              </span>
              <span class="setting-title">Public</span>
            </span>
            <span class="toggle is-on"></span>
          </div>

          <div class="setting">
            <span class="setting-label">
              <span class="setting-icon is-eye-off">
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256"
                  class="_iconDisabled_1s17f_98" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M53.92,34.62A8,8,0,1,0,42.08,45.38L61.32,66.55C25,88.84,9.38,123.2,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208a127.11,127.11,0,0,0,52.07-10.83l22,24.21a8,8,0,1,0,11.84-10.76Zm47.33,75.84,41.67,45.85a32,32,0,0,1-41.67-45.85ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.16,133.16,0,0,1,25,128c4.69-8.79,19.66-33.39,47.35-49.38l18,19.75a48,48,0,0,0,63.66,70l14.73,16.2A112,112,0,0,1,128,192Zm6-95.43a8,8,0,0,1,3-15.72,48.16,48.16,0,0,1,38.77,42.64,8,8,0,0,1-7.22,8.71,6.39,6.39,0,0,1-.75,0,8,8,0,0,1-8-7.26A32.09,32.09,0,0,0,134,96.57Zm113.28,34.69c-.42.94-10.55,23.37-33.36,43.8a8,8,0,1,1-10.67-11.92A132.77,132.77,0,0,0,231.05,128a133.15,133.15,0,0,0-23.12-30.77C185.67,75.19,158.78,64,128,64a118.37,118.37,0,0,0-19.36,1.57A8,8,0,1,1,106,49.79,134,134,0,0,1,128,48c34.88,0,66.57,13.26,91.66,38.35,18.83,18.83,27.3,37.62,27.65,38.41A8,8,0,0,1,247.31,131.26Z">
                  </path>
                </svg>
              </span>
              <span class="setting-title">Show Definition</span>
            </span>
            <span class="toggle"></span>
          </div>

          <div class="setting">
            <span class="setting-label">
              <span class="setting-icon is-shield">
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256"
                  class="_iconSafe_1s17f_106" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0Z">
                  </path>
                </svg>
              </span>
              <span class="setting-title">Allow Proxies</span>
            </span>
            <span class="toggle"></span>
          </div>

          <div class="setting">
            <span class="setting-label">
              <span class="setting-icon is-eye-off">
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256"
                  class="_iconDisabled_1s17f_98" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M53.92,34.62A8,8,0,1,0,42.08,45.38L52.33,56.66A104.06,104.06,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35a104,104,0,0,0,112.7-9.73l10.26,11.29a8,8,0,1,0,11.84-10.76ZM128,216a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.66L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,0,1,63.14,68.54L181,198.23A87.77,87.77,0,0,1,128,216Zm104-88a104.15,104.15,0,0,1-12.38,49.25,8,8,0,0,1-14.09-7.58A88,88,0,0,0,93.88,46.86a8,8,0,0,1-6.21-14.75A104.06,104.06,0,0,1,232,128Z">
                  </path>
                </svg>
              </span>
              <span class="setting-title">Allow Published Chats</span>
            </span>
            <span class="toggle"></span>
          </div>

          <div class="section-divider"></div>

          <div class="settings-section-label">Moderation</div>

          <div class="setting">
            <span class="setting-label">
              <span class="setting-icon is-comment">
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256"
                  class="_iconEnabled_1s17f_94" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z">
                  </path>
                </svg>
              </span>
              <span class="setting-title">Who can comment</span>
            </span>
            <div class="select-chip">
              <span class="select-chip-text">Everyone</span>
            </div>
          </div>
        </div>

        <div class="definition">
          <div class="definition-row"><span>visibility:</span><span class="definition-value">PRIVATE</span></div>
          <div class="definition-row"><span>definition:</span><span class="definition-value">HIDDEN</span></div>
          <div class="definition-row"><span>proxies:</span><span class="definition-value on">BLOCKED</span></div>
          <div class="definition-row"><span>published chats:</span><span class="definition-value">BLOCKED</span></div>
          <div class="definition-row"><span>comments:</span><span class="definition-value on">OPEN</span></div>
          <div class="definition-row"><span>scheduled:</span><span class="definition-value">NONE</span></div>
        </div>

        <div class="character-info-container">
          <div class="hidden-personality">
            Character Definition is hidden, Total 3 tokens, Permanent 2
          </div>

          <div class="accordion">
            <div class="acc">
              <div class="acc-second">
                <span>SCENARIO (1 TOKENS)</span>
                <span class="acc-button">
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true"
                    height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd"
                      d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                      clip-rule="evenodd">
                    </path>
                  </svg>
                </span>
              </div>
            </div>

            <div class="acc">
              <div class="acc-second">
                <span>PERSONALITY (1 TOKENS)</span>
                <span class="acc-button">
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true"
                    height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd"
                      d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                      clip-rule="evenodd"></path>
                  </svg>
                </span>
              </div>
            </div>

            <div class="acc">
              <div class="acc-second">
                <span>FIRST MESSAGE (1 TOKENS)</span>
                <span class="acc-button">
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true"
                    height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd"
                      d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                      clip-rule="evenodd"></path>
                  </svg>
                </span>
              </div>
            </div>

            <div class="acc">
              <div class="acc-second">
                <span>EXAMPLE DIALOGS (0 TOKENS)</span>
                <span class="acc-button">
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true"
                    height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd"
                      d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                      clip-rule="evenodd"></path>
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="comments">
          <div class="comment-title">
            <span class="comment-pill">0 comments</span>
            <span>Leave a comment or feedback for the creator ❤️</span>
          </div>

          <div class="cb-container">
            <div class="comment-box"></div>
            <div class="comment-box-svg">
              <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round"
                stroke-linejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
          </div>
          <div class="comment-button">Post comment</div>
        </div>
      </aside>
    </main>

    <nav class="jai-bottom">
      <span class="nav-item">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 11 9-8 9 8"></path>
          <path d="M5 10v10h14V10"></path>
        </svg>
      </span>
      <span class="nav-item">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
        </svg>
      </span>
      <span class="avatar"></span>
    </nav>

  </body>

  </html>`;
}

export function BioPreview({
  html,
  viewport,
  mode,
  onViewportChange,
  onModeChange,
}: BioPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRef = useRef<Record<string, { x: number; y: number }>>({});
  const outerScrollRef = useRef<Record<string, { left: number; top: number }>>(
    {},
  );
  const previewKey = `${mode}:${viewport}`;
  const keyRef = useRef(previewKey);
  keyRef.current = previewKey;
  const srcDoc = useMemo(() => buildPreviewDocument(html, mode), [html, mode]);

  const restoreOuterScroll = () => {
    const container = scrollContainerRef.current;
    const stored = outerScrollRef.current[keyRef.current];
    if (container && stored) {
      container.scrollLeft = stored.left;
      container.scrollTop = stored.top;
    }
  };

  useEffect(() => {
    requestAnimationFrame(restoreOuterScroll);
  }, [previewKey, srcDoc]);

  const onFrameLoad = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const currentKey = keyRef.current;
    const position = {
      ...(previewScrollRef.current[currentKey] || { x: 0, y: 0 }),
    };
    // Scripts remain disabled inside the iframe. The parent alone maintains scroll.
    const onScroll = () => {
      if (restoring) return;
      previewScrollRef.current[currentKey] = { x: win.scrollX, y: win.scrollY };
    };
    let restoring = true;
    win.addEventListener("scroll", onScroll, { passive: true });
    win.requestAnimationFrame(() => {
      win.scrollTo(position.x, position.y);
      win.requestAnimationFrame(() => {
        win.scrollTo(position.x, position.y);
        restoring = false;
        previewScrollRef.current[currentKey] = {
          x: win.scrollX,
          y: win.scrollY,
        };
      });
    });
    restoreOuterScroll();
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-[52px] shrink-0 items-center justify-between gap-1.5 border-b px-2 sm:px-3">
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "canvas" ? "secondary" : "ghost"}
            className="h-7 cursor-pointer px-2 sm:px-3"
            onClick={() => onModeChange("canvas")}
          >
            <span className="hidden sm:inline">Canvas</span>
            <span className="sm:hidden">Raw</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "janitor" ? "secondary" : "ghost"}
            className="h-7 cursor-pointer px-2 sm:px-3"
            onClick={() => onModeChange("janitor")}
          >
            JAI Preview
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            type="button"
            size="icon"
            variant={viewport === "desktop" ? "secondary" : "ghost"}
            className="h-7 w-7 cursor-pointer"
            onClick={() => onViewportChange("desktop")}
            aria-label="Desktop preview"
            title="Desktop"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={viewport === "tablet" ? "secondary" : "ghost"}
            className="h-7 w-7 cursor-pointer"
            onClick={() => onViewportChange("tablet")}
            aria-label="Tablet preview"
            title="Tablet"
          >
            <Tablet className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={viewport === "mobile" ? "secondary" : "ghost"}
            className="h-7 w-7 cursor-pointer"
            onClick={() => onViewportChange("mobile")}
            aria-label="Mobile preview"
            title="Mobile"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="fw-bio-preview-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-muted/20 p-3 sm:p-5"
        onScroll={(event) => {
          outerScrollRef.current[previewKey] = {
            left: event.currentTarget.scrollLeft,
            top: event.currentTarget.scrollTop,
          };
        }}
      >
        <div
          className={cn(
            "mx-auto h-full min-h-[540px] overflow-hidden rounded-xl border bg-[#303136] shadow-2xl transition-[width,max-width] duration-200",
            viewport === "desktop" && "w-full",
          )}
          style={{
            width:
              viewport === "desktop"
                ? "100%"
                : `min(100%,
                ${VIEWPORT_WIDTH[viewport]}px)`,
            maxWidth: `${VIEWPORT_WIDTH[viewport]}px`,
          }}
        >
          <iframe
            ref={iframeRef}
            title="Bio preview"
            sandbox="allow-same-origin"
            srcDoc={srcDoc}
            onLoad={onFrameLoad}
            className="h-full min-h-[540px] w-full border-0"
          />
        </div>
      </div>

      <style jsx>
        {`
          .fw-bio-preview-scroll {
            scrollbar-width: thin;
            scrollbar-color: hsl(var(--muted-foreground) / 0.28) transparent;
          }

          .fw-bio-preview-scroll::-webkit-scrollbar {
            width: 7px;
            height: 7px;
          }

          .fw-bio-preview-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .fw-bio-preview-scroll::-webkit-scrollbar-thumb {
            background: hsl(var(--muted-foreground) / 0.24);
            border-radius: 999px;
          }

          .fw-bio-preview-scroll::-webkit-scrollbar-thumb:hover {
            background: hsl(var(--muted-foreground) / 0.36);
          }
        `}
      </style>
    </section>
  );
}
