import { prepareBioForJai } from "./bio-html";

const BRIDGE_PACKAGE_MARKER = "jai-bio";
const BRIDGE_EXPORT_MARKER = "jai-bio-export";

export const FORGEWORKS_BIO_BRIDGE_VERSION = "0.3.1";
export const FORGEWORKS_BIO_BRIDGE_PATH =
  "/scripts/forgeworks-bio-bridge.user.js";

export function getForgeworksBioBridgeUrl(origin?: string) {
  const normalizedOrigin = origin?.replace(/\/$/, "");
  return normalizedOrigin
    ? `${normalizedOrigin}${FORGEWORKS_BIO_BRIDGE_PATH}`
    : FORGEWORKS_BIO_BRIDGE_PATH;
}

export type ForgeworksJaiExportPackage = {
  forgeworks: "jai-bio-export";
  version: 1;
  createdAt: string;
  characterId?: string | null;
  characterName?: string | null;
  html: string;
};

export function buildJaiExportPackage(input: {
  html: string;
  characterId?: string | null;
  characterName?: string | null;
}): ForgeworksJaiExportPackage {
  return {
    forgeworks: BRIDGE_EXPORT_MARKER,
    version: 1,
    createdAt: new Date().toISOString(),
    characterId: input.characterId || null,
    characterName: input.characterName || null,
    html: prepareBioForJai(input.html),
  };
}

function bridgeRuntimeSource() {
  return String.raw`(() => {
  "use strict";

  const PAGE = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const CAPTURE_STORAGE_KEY = "__forgeworks_jai_bio_capture_v3";
  const BRIDGE_ID = "forgeworks-bio-bridge";
  let best = null;

  const isEmptyHtml = (value) =>
    !String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;|\u200B/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const looksLikeCharacterPayload = (value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      typeof value.description !== "string"
    ) return false;

    const fields = [
      "personality",
      "scenario",
      "first_messages",
      "example_dialogs",
      "chat_name",
      "name",
      "title",
      "tags",
      "id",
    ];

    let matches = 0;
    for (const key of fields) {
      if (Object.prototype.hasOwnProperty.call(value, key)) matches++;
    }

    return matches >= 2;
  };

  const findDescriptionInValue = (value, depth = 0) => {
    if (depth > 10 || value == null) return null;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
      try {
        return findDescriptionInValue(JSON.parse(trimmed), depth + 1);
      } catch {
        return null;
      }
    }

    if (typeof value !== "object") return null;

    if (!Array.isArray(value) && looksLikeCharacterPayload(value)) {
      return value.description;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findDescriptionInValue(item, depth + 1);
        if (found) return found;
      }
      return null;
    }

    for (const key of ["character", "data", "result", "payload", "attributes"]) {
      if (key in value) {
        const found = findDescriptionInValue(value[key], depth + 1);
        if (found) return found;
      }
    }

    for (const nested of Object.values(value)) {
      if (nested && typeof nested === "object") {
        const found = findDescriptionInValue(nested, depth + 1);
        if (found) return found;
      }
    }

    return null;
  };

  const quality = (html, source) => {
    const value = String(html || "");
    const tags = value.match(/<[a-z][^>]*>/gi) || [];
    let score = value.length + tags.length * 25;

    score += (value.match(/\sstyle\s*=/gi) || []).length * 250;
    score += (value.match(/<div\b/gi) || []).length * 100;
    score += (value.match(/gradient\(/gi) || []).length * 220;
    score +=
      (value.match(
        /\b(display\s*:\s*(flex|grid)|position\s*:|border-radius\s*:|background\s*:|padding\s*:|margin\s*:)/gi,
      ) || []).length * 110;

    if (/network|payload|api|state/i.test(source)) score += 15000;
    if (/public/i.test(source)) score += 3500;
    if (/tiptap|editor/i.test(source)) score -= 12000;
    if (/data-emotion|plus-shiny-username|chakra-|Btn2/i.test(value)) score -= 80000;

    return score;
  };

  const remember = (html, source) => {
    if (typeof html !== "string" || isEmptyHtml(html)) return false;

    const candidate = {
      html: html.trim(),
      source,
      score: quality(html, source),
      capturedAt: new Date().toISOString(),
    };

    if (!best || candidate.score > best.score) {
      best = candidate;
      try {
        sessionStorage.setItem(CAPTURE_STORAGE_KEY, JSON.stringify(best));
      } catch {
        // In-memory capture still works.
      }
      updateStatus();
      return true;
    }

    return false;
  };

  try {
    const saved = JSON.parse(sessionStorage.getItem(CAPTURE_STORAGE_KEY) || "null");
    if (saved?.html) best = saved;
  } catch {
    // Ignore invalid saved capture.
  }

  const inspectText = (text, source) => {
    const html = findDescriptionInValue(text);
    if (html) remember(html, source);
  };

  const installNetworkCapture = () => {
    const originalFetch = PAGE.fetch ? PAGE.fetch.bind(PAGE) : null;
    const xhrProto = PAGE.XMLHttpRequest && PAGE.XMLHttpRequest.prototype;
    const originalSend = xhrProto ? xhrProto.send : null;

    if (originalFetch && !PAGE.fetch.__forgeworksBioBridgeWrapped) {
      const wrappedFetch = function (...args) {
        return originalFetch(...args).then((response) => {
          try {
            const contentType = response.headers.get("content-type") || "";
            if (/json|text|javascript/i.test(contentType)) {
              response
                .clone()
                .text()
                .then((text) => inspectText(text, "network fetch"))
                .catch(() => {});
            }
          } catch {
            // Ignore capture failures.
          }
          return response;
        });
      };

      wrappedFetch.__forgeworksBioBridgeWrapped = true;
      PAGE.fetch = wrappedFetch;
    }

    if (originalSend && !xhrProto.send.__forgeworksBioBridgeWrapped) {
      const wrappedSend = function (...args) {
        this.addEventListener("load", function () {
          try {
            inspectText(this.responseText, "network xhr");
          } catch {
            // Ignore capture failures.
          }
        });

        return originalSend.apply(this, args);
      };

      wrappedSend.__forgeworksBioBridgeWrapped = true;
      xhrProto.send = wrappedSend;
    }
  };

  const scanEmbeddedState = () => {
    for (const value of [
      PAGE.__NEXT_DATA__,
      PAGE.__NUXT__,
      PAGE.__APOLLO_STATE__,
    ]) {
      const html = findDescriptionInValue(value);
      if (html) remember(html, "embedded state");
    }

    for (const script of document.querySelectorAll("script")) {
      const text = script.textContent || "";
      if (text.length < 40 || text.length > 2000000) continue;
      if (!text.includes("description")) continue;
      inspectText(text, "page state");
    }
  };

  const getCharacterToken = () => {
    const path = location.pathname || "";
    const match = path.match(/\/edit_character\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : "";
  };

  const getCharacterId = () => {
    const token = getCharacterToken();
    const source = token || location.pathname || "";
    const uuidMatch = source.match(
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
    );
    return uuidMatch ? uuidMatch[0] : token ? token.split("_")[0] : "";
  };

  const getCharacterName = () => {
    const inputs = [...document.querySelectorAll("input")];
    const input = inputs.find((candidate) => {
      const haystack = [
        candidate.getAttribute("name"),
        candidate.getAttribute("placeholder"),
        candidate.getAttribute("aria-label"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return /\b(character\s*)?name\b/.test(haystack);
    });

    return input?.value?.trim() || document.title?.split("|")[0]?.trim() || null;
  };

  const addEditorFallback = () => {
    const editor = document.querySelector("div.tiptap.ProseMirror");
    if (editor && !isEmptyHtml(editor.innerHTML)) {
      remember(editor.innerHTML, "TipTap editor fallback");
    }
  };

  const robustCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Try fallback.
    }

    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      area.remove();
    }

    return copied;
  };

  const readClipboard = async () => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return "";
    }
  };

  const parseExportPackage = (text) => {
    const raw = String(text || "").trim();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        parsed.forgeworks === "jai-bio-export" &&
        parsed.version === 1 &&
        typeof parsed.html === "string"
      ) {
        return parsed;
      }
    } catch {
      return null;
    }

    return null;
  };

  const getSaveButton = () => {
    const labels = new Set([
      "update character",
      "save character",
      "save changes",
      "update",
      "save",
    ]);

    return [...document.querySelectorAll("button")].find((button) => {
      if (button.closest("#" + BRIDGE_ID)) return false;
      const text =
        button.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
      return labels.has(text) && button.getClientRects().length > 0;
    });
  };

  const waitFor = async (condition, timeout = 10000, interval = 75) => {
    const start = performance.now();
    while (performance.now() - start < timeout) {
      const result = condition();
      if (result) return result;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error("Timed out waiting for JanitorAI.");
  };

  const enableSave = async () => {
    let button = getSaveButton();

    if (
      button &&
      !button.disabled &&
      button.getAttribute("aria-disabled") !== "true"
    ) {
      return button;
    }

    const editor = await waitFor(
      () => document.querySelector("div.tiptap.ProseMirror"),
      10000,
    );

    editor.focus();

    const selection = PAGE.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    try {
      const clipboard = new DataTransfer();
      clipboard.setData("text/plain", "\u200B");
      editor.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: clipboard,
        }),
      );
    } catch {
      editor.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: "",
        }),
      );
    }

    return waitFor(() => {
      const candidate = getSaveButton();
      return candidate &&
        !candidate.disabled &&
        candidate.getAttribute("aria-disabled") !== "true"
        ? candidate
        : null;
    }, 10000);
  };

  const applyHtml = async (html) => {
    const PAGE_JSON = PAGE.JSON;
    const nativeStringify = PAGE_JSON.stringify;
    let restored = false;
    let armed = true;

    const restore = () => {
      if (restored) return;
      restored = true;
      if (PAGE_JSON.stringify === serializerProxy) {
        PAGE_JSON.stringify = nativeStringify;
      }
    };

    function serializerProxy(value, replacer, space) {
      if (armed && looksLikeCharacterPayload(value)) {
        armed = false;
        const patched = { ...value, description: html };
        restore();
        return nativeStringify.call(this, patched, replacer, space);
      }

      return nativeStringify.call(this, value, replacer, space);
    }

    PAGE_JSON.stringify = serializerProxy;
    setTimeout(restore, 15000);

    try {
      const button = await enableSave();
      button.click();
    } catch (error) {
      restore();
      throw error;
    }
  };

  const copyToForgeworks = async () => {
    scanEmbeddedState();
    addEditorFallback();

    if (!best?.html) {
      throw new Error(
        "No saved bio captured yet. Reload this edit page once with Forgeworks Bio Bridge enabled.",
      );
    }

    const payload = {
      forgeworks: "jai-bio",
      version: 1,
      capturedAt: best.capturedAt || new Date().toISOString(),
      characterId: getCharacterId() || null,
      characterName: getCharacterName(),
      html: best.html,
    };

    const text = JSON.stringify(payload);
    const copied = await robustCopy(text);

    if (!copied) {
      throw new Error("Clipboard access was blocked.");
    }

    return payload;
  };

  // Custom confirmation rather than a browser-native confirm() dialog.
  const confirmCharacterMismatch = () => new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "presentation");
    Object.assign(overlay.style, {
      position: "fixed", inset: "0", zIndex: "2147483647",
      background: "rgba(0,0,0,.75)", display: "grid", placeItems: "center",
      padding: "16px", fontFamily: "Inter,system-ui,sans-serif",
    });
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "fw-bio-mismatch-title");
    Object.assign(dialog.style, {
      width: "min(100%,420px)", padding: "20px", borderRadius: "16px",
      border: "1px solid rgba(255,255,255,.16)", background: "#191522",
      color: "#f8f4ff", boxShadow: "0 20px 70px rgba(0,0,0,.55)",
    });
    dialog.innerHTML = '<h2 id="fw-bio-mismatch-title" style="margin:0 0 8px;font-size:16px">Different character</h2>' +
      '<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#c8bfd3">This export belongs to a different JanitorAI character. Applying it here will replace this character’s bio. Continue?</p>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px">' +
      '<button data-fw-cancel type="button" style="padding:9px 12px;border:1px solid #54465f;border-radius:8px;background:#2b2534;color:#fff;cursor:pointer">Cancel</button>' +
      '<button data-fw-confirm type="button" style="padding:9px 12px;border:0;border-radius:8px;background:#a855f7;color:#fff;cursor:pointer">Apply anyway</button>' +
      '</div>';
    overlay.appendChild(dialog);
    let finished = false;
    const finish = (answer) => {
      if (finished) return;
      finished = true;
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      resolve(answer);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); finish(false); }
    };
    document.addEventListener("keydown", onKeyDown, true);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) finish(false);
    });
    dialog.querySelector("[data-fw-cancel]").addEventListener("click", () => finish(false));
    dialog.querySelector("[data-fw-confirm]").addEventListener("click", () => finish(true));
    document.body.appendChild(overlay);
    dialog.querySelector("[data-fw-cancel]").focus();
  });

  const applyFromForgeworks = async () => {
    const text = await readClipboard();
    const payload = parseExportPackage(text);

    if (!payload) {
      throw new Error(
        "Clipboard does not contain a Forgeworks Bio Studio export package.",
      );
    }

    const currentId = getCharacterId();

    if (
      payload.characterId &&
      currentId &&
      payload.characterId !== currentId
    ) {
      const okay = await confirmCharacterMismatch();
      if (!okay) return { cancelled: true };
    }

    await applyHtml(payload.html);
    return payload;
  };

  const setToast = (message, tone = "default") => {
    let toast = document.getElementById("forgeworks-bio-bridge-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "forgeworks-bio-bridge-toast";
      Object.assign(toast.style, {
        position: "fixed",
        right: "18px",
        bottom: "86px",
        zIndex: "2147483647",
        maxWidth: "340px",
        padding: "11px 13px",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,.14)",
        color: "#fff",
        font: "600 12px Inter,system-ui,sans-serif",
        lineHeight: "1.45",
        boxShadow: "0 18px 44px rgba(0,0,0,.42)",
        opacity: "0",
        transform: "translateY(6px)",
        transition: "opacity .16s ease, transform .16s ease",
      });
      document.body.appendChild(toast);
    }

    toast.style.background =
      tone === "error"
        ? "rgba(89,23,39,.96)"
        : tone === "success"
          ? "rgba(16,73,58,.96)"
          : "rgba(24,22,31,.96)";

    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    clearTimeout(toast.__forgeworksTimer);
    toast.__forgeworksTimer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
    }, 3200);
  };

  const updateStatus = () => {
    const status = document.querySelector("#" + BRIDGE_ID + " [data-fw-status]");
    if (!status) return;

    if (best?.html) {
      status.textContent =
        "Captured · " + Math.max(1, Math.round(best.html.length / 1024)) + " KB";
      status.style.color = "#92efd3";
    } else {
      status.textContent = "Waiting for saved bio…";
      status.style.color = "#a7a2b1";
    }
  };

  const mountUi = () => {
    if (!/\/edit_character\//i.test(location.pathname)) return;
    if (document.getElementById(BRIDGE_ID)) return;

    const root = document.createElement("div");
    root.id = BRIDGE_ID;

    Object.assign(root.style, {
      position: "fixed",
      right: "18px",
      bottom: "18px",
      zIndex: "2147483646",
      fontFamily: "Inter,system-ui,sans-serif",
    });

    root.innerHTML = [
      '<button data-fw-launch type="button" style="display:flex;align-items:center;gap:9px;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:11px 15px;background:linear-gradient(135deg,#a855f7,#7c3aed 58%,#2563eb);color:#fff;font:750 12px Inter,system-ui,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.38);cursor:pointer">',
      '<span style="font-size:14px">{ }</span><span>Forgeworks</span>',
      '</button>',
      '<div data-fw-panel style="display:none;position:absolute;right:0;bottom:52px;width:286px;padding:12px;border:1px solid rgba(255,255,255,.13);border-radius:14px;background:rgba(20,18,27,.98);color:#fff;box-shadow:0 20px 56px rgba(0,0,0,.5)">',
      '<div style="display:flex;align-items:start;justify-content:space-between;gap:10px;margin-bottom:10px">',
      '<div><div style="font-size:13px;font-weight:800">Forgeworks Bio Bridge</div><div data-fw-status style="margin-top:3px;font-size:10px;color:#a7a2b1">Waiting for saved bio…</div></div>',
      '<button data-fw-close type="button" style="border:0;background:transparent;color:#a7a2b1;font-size:18px;cursor:pointer">×</button>',
      '</div>',
      '<button data-fw-copy type="button" style="width:100%;margin-top:4px;border:1px solid rgba(255,255,255,.11);border-radius:10px;padding:10px 11px;background:#282431;color:#fff;text-align:left;font:700 12px Inter,system-ui,sans-serif;cursor:pointer">Copy bio to Forgeworks</button>',
      '<button data-fw-apply type="button" style="width:100%;margin-top:7px;border:1px solid rgba(168,85,247,.38);border-radius:10px;padding:10px 11px;background:rgba(124,58,237,.18);color:#fff;text-align:left;font:700 12px Inter,system-ui,sans-serif;cursor:pointer">Apply bio from Forgeworks</button>',
      '<div style="margin-top:9px;color:#8f8999;font-size:9px;line-height:1.45">Import from JAI or apply the latest Bio Studio export from your clipboard.</div>',
      '</div>',
    ].join("");

    document.body.appendChild(root);

    const launch = root.querySelector("[data-fw-launch]");
    const panel = root.querySelector("[data-fw-panel]");
    const close = root.querySelector("[data-fw-close]");
    const copy = root.querySelector("[data-fw-copy]");
    const apply = root.querySelector("[data-fw-apply]");

    launch.addEventListener("click", () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      updateStatus();
    });

    close.addEventListener("click", () => {
      panel.style.display = "none";
    });

    copy.addEventListener("click", async () => {
      copy.disabled = true;
      const label = copy.textContent;
      copy.textContent = "Copying…";
      try {
        await copyToForgeworks();
        copy.textContent = "Copied";
        setToast("Bio package copied. Return to Forgeworks and paste it.", "success");
      } catch (error) {
        copy.textContent = "Could not copy";
        setToast(error?.message || "Could not copy this bio.", "error");
      } finally {
        setTimeout(() => {
          copy.textContent = label;
          copy.disabled = false;
        }, 1500);
      }
    });

    apply.addEventListener("click", async () => {
      apply.disabled = true;
      const label = apply.textContent;
      apply.textContent = "Applying…";
      try {
        const result = await applyFromForgeworks();
        if (result?.cancelled) {
          apply.textContent = label;
          return;
        }
        apply.textContent = "Save requested";
        setToast("Save requested. Reload the public character page to verify the result.");
      } catch (error) {
        apply.textContent = "Could not apply";
        setToast(error?.message || "Could not apply the Forgeworks bio.", "error");
      } finally {
        setTimeout(() => {
          apply.textContent = label;
          apply.disabled = false;
        }, 1800);
      }
    });

    updateStatus();
  };

  installNetworkCapture();

  const boot = () => {
    scanEmbeddedState();
    addEditorFallback();
    mountUi();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  const observer = new MutationObserver(() => {
    mountUi();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  PAGE.__FORGEWORKS_BIO_BRIDGE__ = {
    version: "0.3.1",
    copyToForgeworks,
    applyFromForgeworks,
    getCapturedBio: () => best,
  };

  console.log("[Forgeworks] Bio Bridge 0.3.1 ready.");
})();`;
}

export function buildJaiCaptureScript() {
  return bridgeRuntimeSource();
}

export function buildJaiBridgeUserscript(origin?: string) {
  const bridgeUrl = getForgeworksBioBridgeUrl(origin);

  return `// ==UserScript==
// @name         Forgeworks Bio Bridge
// @namespace    forgeworks-bio-bridge
// @version      ${FORGEWORKS_BIO_BRIDGE_VERSION}
// @description  Import full saved JanitorAI bios into Forgeworks and apply Bio Studio exports back to JAI.
// @match        https://janitorai.com/*
// @match        https://www.janitorai.com/*
// @run-at       document-start
// @sandbox      raw
// @grant        unsafeWindow
// @updateURL    ${bridgeUrl}
// @downloadURL  ${bridgeUrl}
// ==/UserScript==

${bridgeRuntimeSource()}
`;
}

export function buildJaiSaveScript(html: string) {
  const encodedHtml = JSON.stringify(prepareBioForJai(html));

  return String.raw`(() => {
  "use strict";

  const HTML = ${encodedHtml};
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const looksLikeCharacterPayload = (value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      typeof value.description !== "string"
    ) return false;

    const fields = [
      "personality",
      "scenario",
      "first_messages",
      "example_dialogs",
      "chat_name",
      "name",
      "title",
      "tags",
    ];

    let matches = 0;
    for (const key of fields) {
      if (Object.prototype.hasOwnProperty.call(value, key)) matches++;
    }
    return matches >= 2;
  };

  const getSaveButton = () => {
    const labels = new Set([
      "update character",
      "save character",
      "save changes",
      "update",
      "save",
    ]);

    return [...document.querySelectorAll("button")].find((button) => {
      const text = button.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
      return labels.has(text) && button.getClientRects().length > 0;
    });
  };

  const waitFor = async (condition, timeout = 10000, interval = 75) => {
    const start = performance.now();
    while (performance.now() - start < timeout) {
      const result = condition();
      if (result) return result;
      await sleep(interval);
    }
    throw new Error("Timed out waiting for JanitorAI.");
  };

  const enableSave = async () => {
    let button = getSaveButton();
    if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true") {
      return button;
    }

    const editor = await waitFor(
      () => document.querySelector("div.tiptap.ProseMirror"),
      10000,
    );

    editor.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    try {
      const clipboard = new DataTransfer();
      clipboard.setData("text/plain", "\u200B");
      editor.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: clipboard,
        }),
      );
    } catch {
      editor.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: "",
        }),
      );
    }

    return waitFor(() => {
      const candidate = getSaveButton();
      return candidate &&
        !candidate.disabled &&
        candidate.getAttribute("aria-disabled") !== "true"
        ? candidate
        : null;
    }, 10000);
  };

  const nativeStringify = JSON.stringify;
  let armed = true;
  let restored = false;

  const restore = () => {
    if (restored) return;
    restored = true;
    if (JSON.stringify === serializerProxy) {
      JSON.stringify = nativeStringify;
    }
  };

  function serializerProxy(value, replacer, space) {
    if (armed && looksLikeCharacterPayload(value)) {
      armed = false;
      const patched = { ...value, description: HTML };
      restore();
      console.log(
        "%c[Forgeworks] Character payload intercepted. Saving Bio Studio HTML.",
        "color:#e955e5;font-weight:700",
      );
      return nativeStringify.call(this, patched, replacer, space);
    }

    return nativeStringify.call(this, value, replacer, space);
  }

  JSON.stringify = serializerProxy;
  setTimeout(restore, 15000);

  enableSave()
    .then((button) => {
      button.click();
      console.log(
        "%c[Forgeworks] Save triggered. Complete any JanitorAI verification if it appears.",
        "color:#e955e5;font-weight:700",
      );
    })
    .catch((error) => {
      restore();
      console.error("[Forgeworks] Could not trigger save:", error);
    });
})();`;
}
