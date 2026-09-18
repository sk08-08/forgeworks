"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  useImperativeHandle,
} from "react";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import LinkExtension from "@tiptap/extension-link";
import { HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  FileCode2,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Minus,
  Palette,
  ImagePlus,
  Undo,
  Redo,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getReferencedPendingImageIds,
  replacePreviewUrlsWithPlaceholders,
  type MarkdownPendingImage,
} from "@/features/markdown/lib/markdown-image-assets";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  closeMarkdownSlashCommand,
  createMarkdownSlashCommand,
} from "@/features/markdown/extensions/markdown-slash-command";
import {
  COLOR_PRESETS,
  MARKDOWN_PRESET_FEATURES,
  type MarkdownFeature,
  type MarkdownPreset,
} from "@/features/markdown/config/markdown-editor-config";
import { MarkdownColor } from "@/features/markdown/extensions/markdown-color-extension";
import { MarkdownImage } from "@/features/markdown/extensions/markdown-image-extension";
import { MediaPicker } from "@/features/media/components/media-picker";
import type { MediaSelection } from "@/features/media/types/media";
import { normalizeMarkdownLinkUrl } from "@/features/markdown/lib/markdown-link-utils";

export type {
  MarkdownFeature,
  MarkdownPreset,
} from "@/features/markdown/config/markdown-editor-config";

// ---------------------------------------------------------------------------
// Toolbar Components
// ---------------------------------------------------------------------------

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  shortcut,
  tooltip = true,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  shortcut?: string;
  tooltip?: boolean;

  children: React.ReactNode;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      aria-pressed={active !== undefined ? active : undefined}
      className={cn(
        "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md",
        "transition-[background-color,color,transform] duration-150",
        "hover:bg-muted hover:text-foreground",
        "active:scale-90",

        active ? "bg-primary/15 text-primary" : "text-muted-foreground",

        disabled &&
          "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground active:scale-100",
      )}
    >
      {children}
    </button>
  );

  /*
   * BubbleMenu buttons intentionally skip Tooltip.
   *
   * This avoids nesting Radix/Floating UI positioning
   * inside Tiptap's own floating menu.
   */
  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>

      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="flex items-center gap-2"
      >
        <span>{title}</span>

        {shortcut && (
          <kbd
            className={cn(
              "rounded border border-border/70 bg-muted/60 px-1.5 py-0.5",
              "font-mono text-[10px] text-muted-foreground",
            )}
          >
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// MarkdownField
// WYSIWYG Editor using Tiptap that seamlessly outputs Markdown
// ---------------------------------------------------------------------------

export interface MarkdownFieldHandle {
  getPendingImages: () => MarkdownPendingImage[];

  /**
   * Call this only AFTER the database
   * save succeeded.
   */
  applyCommittedMarkdown: (markdown: string) => void;
}

export interface MarkdownImageOptions {
  enabled?: boolean;

  /**
   * Default: 5 MB
   */
  maxSizeBytes?: number;

  /**
   * Default: 10 pending images in one field.
   */
  maxImages?: number;
}

interface MarkdownFieldProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;

  className?: string;
  placeholder?: string;

  minEditorHeightRem?: number;
  maxEditorHeightRem?: number;

  disabled?: boolean;

  /**
   * Controls which formatting tools appear.
   *
   * inline   → titles / labels
   * standard → normal descriptions
   * full     → long-form rich content
   */
  preset?: MarkdownPreset;

  /**
   * Optional complete toolbar override.
   *
   * If provided, this takes precedence over preset.
   */
  features?: MarkdownFeature[];

  imageOptions?: MarkdownImageOptions;

  slashMenuContainer?: string;
}

export const MarkdownField = React.forwardRef<
  MarkdownFieldHandle,
  MarkdownFieldProps
>(function MarkdownField(
  {
    id,
    value = "",
    onChange,
    className,
    placeholder = "Write something amazing...",
    minEditorHeightRem = 10,
    maxEditorHeightRem = 32,
    disabled = false,

    preset = "standard",
    features,

    imageOptions,

    slashMenuContainer,
  },
  ref,
) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [tempHexColor, setTempHexColor] = useState("");

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState("");

  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);

  const [, setPendingImages] = useState<MarkdownPendingImage[]>([]);

  const pendingImagesRef = useRef<MarkdownPendingImage[]>([]);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  const [compactToolbar, setCompactToolbar] = useState(false);

  const imageReplaceTargetPosRef = useRef<number | null>(null);

  const replacePendingImages = useCallback((next: MarkdownPendingImage[]) => {
    pendingImagesRef.current = next;

    setPendingImages(next);
  }, []);

  const imagesEnabled = imageOptions?.enabled === true;

  const imageMaxSizeBytes = imageOptions?.maxSizeBytes ?? 5 * 1024 * 1024;

  const imageMaxImages = imageOptions?.maxImages ?? 10;

  const enabledFeatures = useMemo(
    () =>
      new Set<MarkdownFeature>(features ?? MARKDOWN_PRESET_FEATURES[preset]),
    [features, preset],
  );

  const hasFeature = useCallback(
    (feature: MarkdownFeature) => enabledFeatures.has(feature),
    [enabledFeatures],
  );

  const lastEmittedValue = useRef(value);

  const markdownImageExtension = useMemo(
    () =>
      MarkdownImage.configure({
        onReplaceRequest: (position) => {
          imageReplaceTargetPosRef.current = position;

          setMediaPickerOpen(true);
        },
      }),
    [],
  );

  const slashCommandExtension = useMemo(
    () =>
      createMarkdownSlashCommand({
        imageEnabled: imagesEnabled,

        container: slashMenuContainer,

        enabledFeatures: Array.from(enabledFeatures),

        onImageRequest: () => {
          imageReplaceTargetPosRef.current = null;

          setMediaPickerOpen(true);
        },
      }),
    [imagesEnabled, slashMenuContainer, enabledFeatures],
  );

  const placeholderExtension = useMemo(
    () =>
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return "Heading...";
          }

          if (node.type.name === "blockquote") {
            return "Write a quote...";
          }

          if (node.type.name === "codeBlock") {
            return "Paste or write code...";
          }

          return placeholder;
        },

        includeChildren: true,

        showOnlyCurrent: true,
      }),
    [placeholder],
  );

  const starterKitExtension = useMemo(
    () =>
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },

        paragraph: {
          HTMLAttributes: {
            class: "leading-relaxed",
          },
        },

        bold: {
          HTMLAttributes: {
            class: "font-bold",
          },
        },

        italic: {
          HTMLAttributes: {
            class: "italic",
          },
        },

        strike: {
          HTMLAttributes: {
            class: "line-through",
          },
        },

        bulletList: {
          HTMLAttributes: {
            class: "list-disc list-outside ml-4 pl-2 space-y-1 my-2",
          },
        },

        orderedList: {
          HTMLAttributes: {
            class: "list-decimal list-outside ml-4 pl-2 space-y-1 my-2",
          },
        },

        listItem: {
          HTMLAttributes: {
            class: "mt-1 leading-relaxed",
          },
        },

        blockquote: {
          HTMLAttributes: {
            class:
              "border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-2",
          },
        },

        codeBlock: {
          HTMLAttributes: {
            class:
              "rounded-lg bg-muted p-4 font-mono text-sm my-2 overflow-x-auto",
          },
        },

        horizontalRule: {
          HTMLAttributes: {
            class: "my-6 border-border/80",
          },
        },
      }),
    [],
  );

  const linkExtension = useMemo(
    () =>
      LinkExtension.configure({
        openOnClick: false,

        protocols: ["http", "https", "mailto"],

        isAllowedUri: (url, ctx) => {
          if (!ctx.defaultValidate(url)) {
            return false;
          }

          try {
            const parsed = new URL(url);

            return ["http:", "https:", "mailto:"].includes(parsed.protocol);
          } catch {
            return false;
          }
        },

        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",

          rel: "noopener noreferrer",
        },
      }),
    [],
  );

  const editor: ReturnType<typeof useEditor> = useEditor({
    editable: !disabled,
    extensions: [
      starterKitExtension,
      placeholderExtension,
      MarkdownColor,
      markdownImageExtension,
      slashCommandExtension,
      linkExtension,
      Markdown,
    ],
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "focus:outline-none p-4 w-full overflow-y-auto",

          // Paragraph spacing
          "[&_p]:my-0",
          "[&_p+p]:mt-3",

          // Headings
          "[&_h1]:mt-4 [&_h1]:mb-2",
          "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:tracking-tight",

          "[&_h2]:mt-3 [&_h2]:mb-1.5",
          "[&_h2]:text-lg [&_h2]:font-bold",

          "[&_h3]:mt-2 [&_h3]:mb-1",
          "[&_h3]:text-base [&_h3]:font-semibold",

          // Horizontal rules need their own vertical rhythm.
          "[&_hr]:my-6 [&_hr]:border-border/80",

          // Rich image node
          "[&_[data-type=markdown-image]]:my-4",

          // Native Tiptap placeholders
          "[&_.is-empty::before]:pointer-events-none",
          "[&_.is-empty::before]:float-left",
          "[&_.is-empty::before]:h-0",
          "[&_.is-empty::before]:text-muted-foreground/55",
          "[&_.is-empty::before]:content-[attr(data-placeholder)]",
        ),
        style: `min-height: ${minEditorHeightRem}rem; max-height: ${maxEditorHeightRem}rem;`,
      },
      handleKeyDown: (_view, event) => {
        if (
          hasFeature("link") &&
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "k"
        ) {
          event.preventDefault();

          const previousUrl = editor?.getAttributes("link").href || "";

          setLinkInput(previousUrl);
          setLinkError("");
          setLinkDialogOpen(true);

          return true;
        }

        if (!editor || disabled) {
          return false;
        }

        /*
         * StarterKit already includes normal input rules, but these explicit
         * block shortcuts make the MarkdownField predictable even when a
         * browser/input method does not trigger those rules as expected.
         *
         * They only fire while the cursor is at the end of a plain paragraph,
         * so they don't interfere with normal text containing these symbols.
         */
        if (event.key === " " || event.key === "Enter") {
          const { $from } = editor.state.selection;

          if (
            $from.parent.type.name === "paragraph" &&
            $from.parentOffset === $from.parent.content.size
          ) {
            const textBefore = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              "\ufffc",
            );

            const paragraphStart = $from.start();

            const replaceMarker = (
              run: (chain: ReturnType<typeof editor.chain>) => void,
            ) => {
              event.preventDefault();

              const chain = editor
                .chain()
                .focus()
                .deleteRange({
                  from: paragraphStart,
                  to: $from.pos,
                });

              run(chain);

              return true;
            };

            if (event.key === " " && hasFeature("heading")) {
              if (textBefore === "#") {
                return replaceMarker((chain) =>
                  chain.setHeading({ level: 1 }).run(),
                );
              }

              if (textBefore === "##") {
                return replaceMarker((chain) =>
                  chain.setHeading({ level: 2 }).run(),
                );
              }

              if (textBefore === "###") {
                return replaceMarker((chain) =>
                  chain.setHeading({ level: 3 }).run(),
                );
              }
            }

            if (
              event.key === " " &&
              hasFeature("blockquote") &&
              textBefore === ">"
            ) {
              return replaceMarker((chain) => chain.setBlockquote().run());
            }

            if (
              hasFeature("horizontalRule") &&
              /^(?:-{3,}|\*{3,}|_{3,})$/.test(textBefore.trim())
            ) {
              return replaceMarker((chain) => chain.setHorizontalRule().run());
            }
          }
        }

        return false;
      },

      handlePaste: (_view, event) => {
        if (!editor || disabled) {
          return false;
        }

        const text = event.clipboardData?.getData("text/plain");

        if (!text) {
          return false;
        }

        /*
         * Tiptap's Markdown extension parses Markdown perfectly when content is
         * loaded, but browser paste can otherwise land as literal text. Detect
         * block Markdown and explicitly insert it as Markdown so headings,
         * quotes, rules, lists and fenced code arrive as rich nodes.
         */
        const looksLikeBlockMarkdown =
          /(^|\n)\s{0,3}(?:#{1,3}\s+|>\s?|[-*+]\s+|\d+\.\s+|```|(?:-{3,}|\*{3,}|_{3,})\s*$)/m.test(
            text,
          );

        if (!looksLikeBlockMarkdown) {
          return false;
        }

        event.preventDefault();

        editor.commands.insertContent(text, {
          contentType: "markdown",
          updateSelection: true,
        });

        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const rawMarkdown = editor.getMarkdown();

      /*
       * Blob URLs are only valid inside this browser
       * session, so they must never leave MarkdownField.
       *
       * Important:
       * We DO NOT remove pending images here when they
       * disappear from the document.
       *
       * TipTap may restore them through Undo/Redo, so
       * their File + ObjectURL must stay alive until
       * Save or editor disposal.
       */
      const markdown = replacePreviewUrlsWithPlaceholders(
        rawMarkdown,
        pendingImagesRef.current,
      );

      lastEmittedValue.current = markdown;

      onChange?.(markdown);
    },
  });

  const toolbarState = useEditorState({
    editor,

    selector: ({ editor }) => {
      if (!editor) {
        return {
          isFocused: false,

          bold: false,
          italic: false,
          strike: false,
          code: false,
          link: false,
          markdownColor: false,

          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,

          h1: false,
          h2: false,
          h3: false,

          currentColor: "",

          canUndo: false,
          canRedo: false,
        };
      }

      return {
        isFocused: editor.isFocused,

        bold: editor.isActive("bold"),

        italic: editor.isActive("italic"),

        strike: editor.isActive("strike"),

        code: editor.isActive("code"),

        link: editor.isActive("link"),

        markdownColor: editor.isActive("markdownColor"),

        bulletList: editor.isActive("bulletList"),

        orderedList: editor.isActive("orderedList"),

        blockquote: editor.isActive("blockquote"),

        codeBlock: editor.isActive("codeBlock"),

        h1: editor.isActive("heading", {
          level: 1,
        }),

        h2: editor.isActive("heading", {
          level: 2,
        }),

        h3: editor.isActive("heading", {
          level: 3,
        }),

        currentColor: editor.getAttributes("markdownColor").color || "",

        canUndo: editor.can().undo(),

        canRedo: editor.can().redo(),
      };
    },
  });

  useEffect(() => {
    if (!editor) return;

    const element = editorContainerRef.current;

    if (!element) return;

    const updateToolbarMode = () => {
      const width = element.getBoundingClientRect().width;

      setCompactToolbar(width < 520);
    };

    updateToolbarMode();

    const observer = new ResizeObserver(() => {
      updateToolbarMode();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const editorElement = editor.view.dom;

    const handleEditorScroll = () => {
      closeMarkdownSlashCommand(editor);
    };

    editorElement.addEventListener("scroll", handleEditorScroll, {
      passive: true,
    });

    return () => {
      editorElement.removeEventListener("scroll", handleEditorScroll);
    };
  }, [editor]);

  useImperativeHandle(
    ref,
    () => ({
      getPendingImages() {
        return [...pendingImagesRef.current];
      },

      applyCommittedMarkdown(markdown: string) {
        for (const asset of pendingImagesRef.current) {
          URL.revokeObjectURL(asset.previewUrl);
        }

        replacePendingImages([]);

        lastEmittedValue.current = markdown;

        editor?.commands.setContent(markdown, {
          contentType: "markdown",
          emitUpdate: false,
        });
      },
    }),
    [editor, replacePendingImages],
  );

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (value === lastEmittedValue.current) return;

    const currentContent = editor.getMarkdown();

    if (value !== currentContent) {
      lastEmittedValue.current = value;

      editor.commands.setContent(value, {
        contentType: "markdown",
        emitUpdate: false,
      });
    }
  }, [value, editor]);

  useEffect(() => {
    return () => {
      for (const asset of pendingImagesRef.current) {
        URL.revokeObjectURL(asset.previewUrl);
      }
    };
  }, []);

  const openLinkDialog = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href || "";

    setLinkInput(previousUrl);
    setLinkError("");
    setLinkDialogOpen(true);
  }, [editor]);

  const submitLink = useCallback(() => {
    if (!editor) return;

    const normalizedUrl = normalizeMarkdownLinkUrl(linkInput);

    if (!normalizedUrl) {
      setLinkError("Enter a valid HTTP, HTTPS, or email address.");
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .unsetMarkdownColor()
      .setLink({ href: normalizedUrl })
      .run();

    setLinkDialogOpen(false);
    setLinkInput("");
    setLinkError("");
  }, [editor, linkInput]);

  const removeLink = useCallback(() => {
    if (!editor) return;

    editor.chain().focus().extendMarkRange("link").unsetLink().run();

    setLinkDialogOpen(false);
    setLinkInput("");
    setLinkError("");
  }, [editor]);

  const handleImageFile = useCallback(
    (
      file: File,
      options?: {
        replacePosition?: number | null;
      },
    ) => {
      if (!editor || !imagesEnabled) {
        return;
      }

      const allowedTypes = new Set([
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/avif",
      ]);

      if (!allowedTypes.has(file.type)) {
        toast.error("Use PNG, JPG, WEBP or AVIF.");

        return;
      }

      const maxSize = imageMaxSizeBytes;

      if (file.size > maxSize) {
        toast.error(
          `Image is too large. Maximum size is ${Math.round(
            maxSize / 1024 / 1024,
          )} MB.`,
        );

        return;
      }

      const maxImages = imageMaxImages;

      const currentRawMarkdown = editor.getMarkdown();

      const currentDraftMarkdown = replacePreviewUrlsWithPlaceholders(
        currentRawMarkdown,
        pendingImagesRef.current,
      );

      const referencedPendingIds =
        getReferencedPendingImageIds(currentDraftMarkdown);

      /*
       * Replacement does not increase the
       * number of images in the document,
       * so don't block it at the max limit.
       */
      const isReplacing = typeof options?.replacePosition === "number";

      if (!isReplacing && referencedPendingIds.size >= maxImages) {
        toast.info(`You can add up to ${maxImages} new images before saving.`);

        return;
      }

      const assetId = crypto.randomUUID();

      const previewUrl = URL.createObjectURL(file);

      const fileAlt = file.name.replace(/\.[^.]+$/, "").trim() || "Image";

      const asset: MarkdownPendingImage = {
        id: assetId,
        file,
        previewUrl,
        alt: fileAlt,
      };

      /*
       * Keep every pending asset alive until
       * Save / unmount so Undo can restore
       * replaced/deleted images.
       */
      replacePendingImages([...pendingImagesRef.current, asset]);

      // --------------------------------------------------------------------
      // REPLACE EXISTING IMAGE
      // --------------------------------------------------------------------

      if (typeof options?.replacePosition === "number") {
        const position = options.replacePosition;

        const currentNode = editor.state.doc.nodeAt(position);

        if (!currentNode || currentNode.type.name !== "markdownImage") {
          URL.revokeObjectURL(previewUrl);

          replacePendingImages(
            pendingImagesRef.current.filter((item) => item.id !== assetId),
          );

          toast.error("The image could not be replaced.");

          return;
        }

        /*
         * Preserve existing alt text.
         * If none exists, use the new file name.
         */
        const nextAlt = fileAlt;

        const transaction = editor.state.tr.setNodeMarkup(position, undefined, {
          ...currentNode.attrs,
          src: previewUrl,
          alt: nextAlt,
        });

        editor.view.dispatch(transaction);

        editor.chain().focus().setNodeSelection(position).run();

        return;
      }

      // --------------------------------------------------------------------
      // INSERT NEW IMAGE
      // --------------------------------------------------------------------

      /*
       * Even though markdownImage remains an
       * inline node for Markdown compatibility,
       * place it inside its own paragraph.
       *
       * This gives Move Up / Move Down a stable
       * document block to reorder.
       */
      editor
        .chain()
        .focus()
        .insertContent({
          type: "paragraph",

          content: [
            {
              type: "markdownImage",

              attrs: {
                src: previewUrl,

                alt: fileAlt,
              },
            },
          ],
        })
        .run();
    },
    [
      editor,
      imagesEnabled,
      imageMaxSizeBytes,
      imageMaxImages,
      replacePendingImages,
    ],
  );

  const handleMediaSelection = useCallback(
    (images: MediaSelection[]) => {
      if (!editor || !imagesEnabled || disabled || images.length === 0) return;
      const replacePosition = imageReplaceTargetPosRef.current;
      imageReplaceTargetPosRef.current = null;

      if (typeof replacePosition === "number") {
        const node = editor.state.doc.nodeAt(replacePosition);
        if (!node || node.type.name !== "markdownImage") {
          toast.error("The image could not be replaced. Please try again.");
          return;
        }
        const image = images[0];
        const transaction = editor.state.tr.setNodeMarkup(replacePosition, undefined, {
          ...node.attrs,
          src: image.url,
          alt: image.name || String(node.attrs.alt || "Image"),
        });
        editor.view.dispatch(transaction);
        editor.chain().focus().setNodeSelection(replacePosition).run();
        return;
      }

      // An insertion yields stable Markdown immediately: no blob URL or
      // document-specific upload transaction is necessary for My Media URLs.
      const nodes = images.map((image) => ({
        type: "paragraph",
        content: [{ type: "markdownImage", attrs: { src: image.url, alt: image.name || "Image" } }],
      }));
      editor.chain().focus().insertContent(nodes).run();
    },
    [editor, imagesEnabled, disabled],
  );

  if (!editor) return null;

  const isFocused = toolbarState.isFocused;

  const currentColor = toolbarState.currentColor;

  const showColorActive = isFocused && toolbarState.markdownColor;

  const currentBlockType = toolbarState.h1
    ? "h1"
    : toolbarState.h2
      ? "h2"
      : toolbarState.h3
        ? "h3"
        : "paragraph";

  const moreMenuActive = toolbarState.blockquote || toolbarState.codeBlock;

  const hasPersistentMoreItems =
    hasFeature("blockquote") ||
    hasFeature("codeBlock") ||
    hasFeature("horizontalRule") ||
    imagesEnabled;

  const setBlockType = (nextType: string) => {
    if (disabled) {
      return;
    }

    if (nextType === "h1") {
      editor.chain().focus().setHeading({ level: 1 }).run();

      return;
    }

    if (nextType === "h2") {
      editor.chain().focus().setHeading({ level: 2 }).run();

      return;
    }

    if (nextType === "h3") {
      editor.chain().focus().setHeading({ level: 3 }).run();

      return;
    }

    editor.chain().focus().setParagraph().run();
  };

  const handleOpenChange = (open: boolean) => {
    if (disabled) return;

    if (open) {
      setTempHexColor(currentColor || "#a855f7");
    }

    setIsColorPickerOpen(open);
  };

  const applyCustomColor = () => {
    let finalColor = tempHexColor.trim();
    if (!finalColor.startsWith("#")) finalColor = "#" + finalColor;
    editor.chain().focus().unsetLink().setMarkdownColor(finalColor).run();
    setIsColorPickerOpen(false);
  };

  const isCustomColor =
    tempHexColor &&
    !COLOR_PRESETS.some(
      (p) => p.value.toLowerCase() === tempHexColor.toLowerCase(),
    );

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={editorContainerRef}
        className={cn(
          "relative w-full min-w-0 rounded-xl border border-input bg-background shadow-sm transition-colors duration-300",
          "focus-within:border-ring focus-within:ring-[2px] focus-within:ring-ring/50",
          className,
        )}
      >
        {imagesEnabled && (
          <MediaPicker
            hideTrigger
            open={mediaPickerOpen}
            onOpenChange={(next) => {
              setMediaPickerOpen(next);
              if (!next) imageReplaceTargetPosRef.current = null;
            }}
            multiple={imageReplaceTargetPosRef.current === null}
            maxSelection={imageMaxImages}
            disabled={disabled}
            onSelect={handleMediaSelection}
          />
        )}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            const replacePosition = imageReplaceTargetPosRef.current;

            if (file) {
              handleImageFile(file, {
                replacePosition,
              });
            }

            imageReplaceTargetPosRef.current = null;

            event.target.value = "";
          }}
        />
        <Dialog
          open={linkDialogOpen}
          onOpenChange={(open) => {
            setLinkDialogOpen(open);

            if (!open) {
              setLinkInput("");
              setLinkError("");
            }
          }}
        >
          <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Insert link</DialogTitle>
              <DialogDescription>
                Enter a website or email address. URLs without a protocol will
                use HTTPS automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor={`${id || "markdown"}-link-url`}>URL</Label>

              <Input
                id={`${id || "markdown"}-link-url`}
                value={linkInput}
                onChange={(e) => {
                  setLinkInput(e.target.value);
                  setLinkError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitLink();
                  }
                }}
                placeholder="youtube.com"
                autoFocus
              />

              {linkError && (
                <p className="text-xs text-destructive">{linkError}</p>
              )}

              <p className="text-xs text-muted-foreground">
                Allowed: HTTP, HTTPS, and email links.
              </p>
            </div>

            <DialogFooter className="gap-2">
              {editor?.isActive("link") && (
                <Button
                  type="button"
                  className="cursor-pointer"
                  variant="destructive"
                  onClick={removeLink}
                >
                  Remove link
                </Button>
              )}

              <Button
                type="button"
                className="cursor-pointer"
                variant="outline"
                onClick={() => setLinkDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="cursor-pointer"
                onClick={submitLink}
              >
                Apply link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {!disabled && (
          <BubbleMenu
            editor={editor}
            options={{
              placement: "top",
              offset: 8,
            }}
            shouldShow={({ editor, from, to }) => {
              /*
               * No text selection.
               */
              if (from === to) {
                return false;
              }

              /*
               * Code blocks have their own editing
               * context and shouldn't show inline tools.
               */
              if (editor.isActive("codeBlock")) {
                return false;
              }

              /*
               * Images already have their own NodeView
               * controls.
               */
              if (editor.isActive("markdownImage")) {
                return false;
              }

              return true;
            }}
          >
            <div
              className={cn(
                "flex items-center gap-0.5 rounded-xl",
                "border border-border/80",
                "bg-popover/95 p-1 shadow-xl backdrop-blur-xl",

                /*
                 * Small entrance animation without
                 * affecting Floating UI positioning.
                 */
                "animate-in fade-in-0 zoom-in-95 duration-150",
              )}
            >
              {hasFeature("bold") && (
                <ToolbarButton
                  tooltip={false}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  active={editor.isActive("bold")}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </ToolbarButton>
              )}

              {hasFeature("italic") && (
                <ToolbarButton
                  tooltip={false}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  active={editor.isActive("italic")}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </ToolbarButton>
              )}

              {hasFeature("strike") && (
                <ToolbarButton
                  tooltip={false}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  active={editor.isActive("strike")}
                  title="Strikethrough"
                >
                  <Strikethrough className="h-4 w-4" />
                </ToolbarButton>
              )}

              {hasFeature("code") && (
                <ToolbarButton
                  tooltip={false}
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  active={editor.isActive("code")}
                  title="Inline code"
                >
                  <Code className="h-4 w-4" />
                </ToolbarButton>
              )}

              {hasFeature("link") && (
                <>
                  <div className="mx-0.5 h-5 w-px bg-border" />

                  <ToolbarButton
                    tooltip={false}
                    onClick={openLinkDialog}
                    active={editor.isActive("link")}
                    title="Link"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </ToolbarButton>
                </>
              )}
            </div>
          </BubbleMenu>
        )}

        {/* Editor Toolbar */}
        <div
          className={cn(
            "relative flex min-w-0 items-center gap-1",
            "overflow-hidden",
            "border-b border-border/50 bg-muted/20 p-1.5",
            "transition-colors duration-200",
          )}
        >
          {/* =====================================================
      HISTORY
  ====================================================== */}
          <div
            className={cn(
              "flex shrink-0 items-center gap-0.5",
              "border-r border-border/50 pr-1 sm:pr-2",
            )}
          >
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={disabled || !toolbarState.canUndo}
              title="Undo"
              shortcut={isMac ? "⌘+Z" : "Ctrl+Z"}
            >
              <Undo className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={disabled || !toolbarState.canRedo}
              title="Redo"
              shortcut={isMac ? "⌘+Shift+Z" : "Ctrl+Y"}
            >
              <Redo className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* =====================================================
      BLOCK TYPE
  ====================================================== */}
          {hasFeature("heading") && (
            <div
              className={cn(
                "shrink-0 items-center border-r border-border/50 px-1",
                compactToolbar ? "hidden" : "hidden md:flex",
              )}
            >
              <Select
                value={currentBlockType}
                onValueChange={setBlockType}
                disabled={disabled}
              >
                <SelectTrigger
                  className={cn(
                    "h-8 w-[116px] cursor-pointer sm:w-[126px]",
                    "border-0 bg-transparent px-2 text-xs shadow-none",
                    "focus:ring-0 focus:ring-offset-0",
                  )}
                  title="Text style"
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="paragraph">
                    Paragraph — {isMac ? "⌘+Alt+0" : "Ctrl+Alt+0"}
                  </SelectItem>

                  <SelectItem value="h1">
                    Heading 1 — {isMac ? "⌘+Alt+1" : "Ctrl+Alt+1"}
                  </SelectItem>

                  <SelectItem value="h2">
                    Heading 2 — {isMac ? "⌘+Alt+2" : "Ctrl+Alt+2"}
                  </SelectItem>

                  <SelectItem value="h3">
                    Heading 3 — {isMac ? "⌘+Alt+3" : "Ctrl+Alt+3"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* =====================================================
      INLINE FORMATTING
  ====================================================== */}
          <div className="flex shrink-0 items-center gap-0.5 px-1">
            {hasFeature("bold") && (
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={isFocused && toolbarState.bold}
                disabled={disabled}
                title="Bold"
                shortcut={isMac ? "⌘+B" : "Ctrl+B"}
              >
                <Bold className="h-4 w-4" />
              </ToolbarButton>
            )}

            {hasFeature("italic") && (
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={isFocused && toolbarState.italic}
                disabled={disabled}
                title="Italic"
                shortcut={isMac ? "⌘+I" : "Ctrl+I"}
              >
                <Italic className="h-4 w-4" />
              </ToolbarButton>
            )}

            {hasFeature("strike") && (
              <div
                className={cn(
                  "shrink-0",
                  compactToolbar ? "hidden" : "hidden sm:block",
                )}
              >
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  active={isFocused && toolbarState.strike}
                  disabled={disabled}
                  title="Strikethrough"
                  shortcut={isMac ? "⌘+Shift+S" : "Ctrl+Shift+S"}
                >
                  <Strikethrough className="h-4 w-4" />
                </ToolbarButton>
              </div>
            )}

            {hasFeature("code") && (
              <div
                className={cn(
                  "shrink-0",
                  compactToolbar ? "hidden" : "hidden sm:block",
                )}
              >
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  active={isFocused && toolbarState.code}
                  disabled={disabled}
                  title="Inline Code"
                  shortcut={isMac ? "⌘+E" : "Ctrl+E"}
                >
                  <Code className="h-4 w-4" />
                </ToolbarButton>
              </div>
            )}
          </div>

          {/* =====================================================
      LINK
  ====================================================== */}
          {hasFeature("link") && (
            <div
              className={cn(
                "shrink-0 items-center border-l border-border/50 pl-1",
                compactToolbar ? "hidden" : "hidden sm:flex",
              )}
            >
              <ToolbarButton
                onClick={openLinkDialog}
                active={isFocused && toolbarState.link}
                disabled={disabled}
                title="Link"
                shortcut={isMac ? "⌘+K" : "Ctrl+K"}
              >
                <LinkIcon className="h-4 w-4" />
              </ToolbarButton>
            </div>
          )}

          {/* =====================================================
      COLOR
  ====================================================== */}
          {hasFeature("color") && (
            <div
              className={cn(
                "shrink-0",
                compactToolbar ? "block" : "hidden sm:block",
              )}
            >
              <Popover open={isColorPickerOpen} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                      "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md",
                      "transition-all duration-200 active:scale-90",
                      isColorPickerOpen || showColorActive
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      disabled &&
                        "cursor-not-allowed opacity-50 active:scale-100",
                    )}
                    title="Text Color"
                    aria-label="Text Color"
                  >
                    <Palette
                      className="h-4 w-4 transition-colors duration-200"
                      style={{
                        color: showColorActive ? currentColor : "inherit",
                      }}
                    />
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-[20rem] max-w-[calc(100vw-1.5rem)] border-border/80 bg-popover p-4 shadow-xl"
                  align="end"
                  side="bottom"
                  sideOffset={8}
                  collisionPadding={16}
                  avoidCollisions
                  sticky="always"
                  hideWhenDetached
                >
                  <div className="space-y-4">
                    <div className="h-32 w-full overflow-hidden rounded-lg border border-border/50 shadow-inner sm:h-36">
                      <HexColorPicker
                        color={
                          tempHexColor.startsWith("#")
                            ? tempHexColor
                            : "#000000"
                        }
                        onChange={setTempHexColor}
                        style={{
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Suggested colors
                      </p>

                      <div className="grid grid-cols-[repeat(auto-fit,minmax(3.75rem,1fr))] gap-2">
                        {COLOR_PRESETS.map((preset) => {
                          const isActive =
                            tempHexColor.toLowerCase() ===
                            preset.value.toLowerCase();

                          return (
                            <button
                              key={preset.value}
                              type="button"
                              data-state={isActive ? "on" : "off"}
                              className={cn(
                                "group flex cursor-pointer flex-col items-center gap-1 rounded-xl",
                                "border border-border/70 bg-card/70 p-2",
                                "transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-muted/40",
                                isActive &&
                                  "border-primary/70 bg-primary/10 shadow-sm",
                              )}
                              onClick={() => {
                                editor
                                  .chain()
                                  .focus()
                                  .unsetLink()
                                  .setMarkdownColor(preset.value)
                                  .run();

                                setTempHexColor(preset.value);

                                setIsColorPickerOpen(false);
                              }}
                            >
                              <span
                                className="h-7 w-7 rounded-full border shadow-sm transition-transform group-hover:scale-105"
                                style={{
                                  backgroundColor: preset.value,
                                }}
                              />

                              <span className="text-[10px] font-medium text-muted-foreground">
                                {preset.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs">Custom hex</Label>

                      <div className="flex gap-2">
                        <Input
                          value={tempHexColor}
                          onChange={(e) => setTempHexColor(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              applyCustomColor();
                            }
                          }}
                          className="h-9 font-mono text-xs uppercase"
                          maxLength={7}
                          spellCheck={false}
                        />

                        <button
                          type="button"
                          onClick={applyCustomColor}
                          className="h-9 cursor-pointer rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
                        >
                          Apply
                        </button>
                      </div>

                      {isCustomColor && (
                        <div
                          className="mt-2 h-1.5 w-full rounded-full shadow-inner transition-colors duration-300"
                          style={{
                            backgroundColor: tempHexColor,
                          }}
                        />
                      )}
                    </div>

                    <div className="my-1 h-px w-full bg-border/50" />

                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().unsetMarkdownColor().run();

                        setTempHexColor("");
                        setIsColorPickerOpen(false);
                      }}
                      className="w-full cursor-pointer rounded-md bg-destructive py-1.5 text-xs font-medium text-destructive-foreground shadow-sm transition-all hover:bg-destructive/90 active:scale-95"
                    >
                      Remove Color
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* =====================================================
      LISTS
  ====================================================== */}
          {(hasFeature("bulletList") || hasFeature("orderedList")) && (
            <div
              className={cn(
                "mx-1 h-5 w-px bg-border/50",
                compactToolbar ? "hidden" : "hidden md:block",
              )}
            />
          )}

          <div
            className={cn(
              "shrink-0 items-center gap-0.5",
              compactToolbar ? "hidden" : "hidden md:flex",
            )}
          >
            {hasFeature("bulletList") && (
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={isFocused && toolbarState.bulletList}
                disabled={disabled}
                title="Bullet List"
                shortcut={isMac ? "⌘+Shift+8" : "Ctrl+Shift+8"}
              >
                <List className="h-4 w-4" />
              </ToolbarButton>
            )}

            {hasFeature("orderedList") && (
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={isFocused && toolbarState.orderedList}
                disabled={disabled}
                title="Numbered List"
                shortcut={isMac ? "⌘+Shift+7" : "Ctrl+Shift+7"}
              >
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>
            )}
          </div>

          {/* =====================================================
    MORE FORMATTING
====================================================== */}

          {(hasFeature("heading") ||
            hasFeature("strike") ||
            hasFeature("code") ||
            hasFeature("link") ||
            hasFeature("color") ||
            hasFeature("bulletList") ||
            hasFeature("orderedList") ||
            hasFeature("blockquote") ||
            hasFeature("codeBlock") ||
            hasFeature("horizontalRule") ||
            imagesEnabled) && (
            <div
              className={cn(
                "shrink-0 items-center",
                compactToolbar || hasPersistentMoreItems
                  ? "flex"
                  : "flex sm:hidden",
              )}
            >
              <div className="mx-1 h-5 w-px bg-border/50" />

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label="More formatting"
                        className={cn(
                          "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md",
                          "text-muted-foreground",
                          "transition-all duration-150",
                          "hover:bg-muted hover:text-foreground",
                          "active:scale-90",
                          "data-[state=open]:bg-primary/10 data-[state=open]:text-primary",

                          moreMenuActive && "bg-primary/10 text-primary",

                          disabled && "cursor-not-allowed opacity-40",
                        )}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>

                  <TooltipContent side="bottom">More formatting</TooltipContent>
                </Tooltip>

                <DropdownMenuContent align="end" className="w-52">
                  {hasFeature("heading") && (
                    <>
                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          !compactToolbar && "md:hidden",
                        )}
                        onSelect={() =>
                          editor.chain().focus().setParagraph().run()
                        }
                      >
                        Paragraph
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          !compactToolbar && "md:hidden",
                          toolbarState.h1 && "bg-primary/10 text-primary",
                        )}
                        onSelect={() =>
                          editor
                            .chain()
                            .focus()
                            .setHeading({
                              level: 1,
                            })
                            .run()
                        }
                      >
                        Heading 1
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          !compactToolbar && "md:hidden",
                          toolbarState.h2 && "bg-primary/10 text-primary",
                        )}
                        onSelect={() =>
                          editor
                            .chain()
                            .focus()
                            .setHeading({
                              level: 2,
                            })
                            .run()
                        }
                      >
                        Heading 2
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          !compactToolbar && "md:hidden",
                          toolbarState.h3 && "bg-primary/10 text-primary",
                        )}
                        onSelect={() =>
                          editor
                            .chain()
                            .focus()
                            .setHeading({
                              level: 3,
                            })
                            .run()
                        }
                      >
                        Heading 3
                      </DropdownMenuItem>

                      <DropdownMenuSeparator
                        className={cn(!compactToolbar && "md:hidden")}
                      />
                    </>
                  )}
                  {hasFeature("strike") && (
                    <DropdownMenuItem
                      className={cn(
                        "cursor-pointer",
                        !compactToolbar && "sm:hidden",
                        toolbarState.strike && "bg-primary/10 text-primary",
                      )}
                      onSelect={() =>
                        editor.chain().focus().toggleStrike().run()
                      }
                    >
                      <Strikethrough className="mr-2 h-4 w-4" />
                      Strikethrough
                    </DropdownMenuItem>
                  )}

                  {hasFeature("code") && (
                    <DropdownMenuItem
                      className={cn(
                        "cursor-pointer",
                        !compactToolbar && "sm:hidden",
                        toolbarState.code && "bg-primary/10 text-primary",
                      )}
                      onSelect={() => editor.chain().focus().toggleCode().run()}
                    >
                      <Code className="mr-2 h-4 w-4" />
                      Inline code
                    </DropdownMenuItem>
                  )}
                  {hasFeature("link") && (
                    <DropdownMenuItem
                      className={cn(
                        "cursor-pointer",
                        !compactToolbar && "sm:hidden",
                      )}
                      onSelect={() => {
                        requestAnimationFrame(openLinkDialog);
                      }}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Link
                    </DropdownMenuItem>
                  )}
                  {hasFeature("bulletList") && (
                    <DropdownMenuItem
                      className={cn(
                        "cursor-pointer",
                        !compactToolbar && "md:hidden",
                        toolbarState.bulletList && "bg-primary/10 text-primary",
                      )}
                      onSelect={() =>
                        editor.chain().focus().toggleBulletList().run()
                      }
                    >
                      <List className="mr-2 h-4 w-4" />
                      Bullet list
                    </DropdownMenuItem>
                  )}

                  {hasFeature("orderedList") && (
                    <DropdownMenuItem
                      className={cn(
                        "cursor-pointer",
                        !compactToolbar && "md:hidden",
                        toolbarState.orderedList &&
                          "bg-primary/10 text-primary",
                      )}
                      onSelect={() =>
                        editor.chain().focus().toggleOrderedList().run()
                      }
                    >
                      <ListOrdered className="mr-2 h-4 w-4" />
                      Numbered list
                    </DropdownMenuItem>
                  )}
                  {hasFeature("blockquote") && (
                    <DropdownMenuItem
                      className={cn(
                        "cursor-pointer",
                        toolbarState.blockquote && "bg-primary/10 text-primary",
                      )}
                      onSelect={() =>
                        editor.chain().focus().toggleBlockquote().run()
                      }
                    >
                      <Quote className="mr-2 h-4 w-4" />

                      <span className="flex-1">Quote</span>

                      <kbd className="ml-3 font-mono text-[10px] text-muted-foreground">
                        {isMac ? "⌘+Shift+B" : "Ctrl+Shift+B"}
                      </kbd>
                    </DropdownMenuItem>
                  )}

                  {hasFeature("codeBlock") && (
                    <DropdownMenuItem
                      className={cn(
                        "cursor-pointer",
                        toolbarState.codeBlock && "bg-primary/10 text-primary",
                      )}
                      onSelect={() =>
                        editor.chain().focus().toggleCodeBlock().run()
                      }
                    >
                      <FileCode2 className="mr-2 h-4 w-4" />

                      <span className="flex-1">Code block</span>

                      <kbd className="ml-3 font-mono text-[10px] text-muted-foreground">
                        {isMac ? "⌘+Alt+C" : "Ctrl+Alt+C"}
                      </kbd>
                    </DropdownMenuItem>
                  )}

                  {hasFeature("horizontalRule") && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() =>
                        editor.chain().focus().setHorizontalRule().run()
                      }
                    >
                      <Minus className="mr-2 h-4 w-4" />
                      <span>Divider</span>
                    </DropdownMenuItem>
                  )}

                  {imagesEnabled && (
                    <>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="cursor-pointer"
                        onSelect={() => {
                          imageReplaceTargetPosRef.current = null;

                          setMediaPickerOpen(true);
                        }}
                      >
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Add image from My Media
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-muted-foreground"
                        onSelect={() => {
                          imageReplaceTargetPosRef.current = null;
                          requestAnimationFrame(() => imageInputRef.current?.click());
                        }}
                      >
                        Upload to document (legacy)
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Editor Content Area */}
        <div className="relative w-full">
          <EditorContent editor={editor} />
        </div>
      </div>
    </TooltipProvider>
  );
});
