// ============================================================================
// Forgeworks - Token Validation Utilities
// Provides token counting and variable validation for bot content
// ============================================================================

import { encode } from "gpt-tokenizer";
import type {
  TokenValidation,
  Bot,
  CharacterCardV2,
  JanitorForgeCharacterCardExtension,
} from "@/features/bots/types/bot-types";

// ----------------------------------------------------------------------------
// Token Counting
// ----------------------------------------------------------------------------

/**
 * Counts the number of tokens in a given text using GPT tokenizer
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
}

/**
 * Counts total tokens across all bot fields
 */
export function countBotTokens(bot: Partial<Bot>): number {
  const fields = [
    bot.personality || "",
    [bot.firstMessage || "", ...(bot.alternateGreetings || [])]
      .filter(Boolean)
      .join("\n\n"),
    bot.scenario || "",
    bot.exampleDialogues || "",
  ];
  return fields.reduce((total, field) => total + countTokens(field), 0);
}

// ----------------------------------------------------------------------------
// Variable Validation
// ----------------------------------------------------------------------------

// Tokens supported by the bot content validator and the initial-message preview.
// Keep the original placeholders in saved content and exported character cards.
const VALID_VARIABLES = new Set([
  "{{char}}",
  "{{user}}",
  "{{subj}}",
  "{{obj}}",
  "{{poss}}",
  "{{poss_pr}}",
  "{{refl}}",
]);
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Validates character, reader and pronoun placeholders in bot content
 * Returns validation result with counts and any invalid variables
 */
export function validateVariables(text: string): TokenValidation {
  const warnings: string[] = [];
  const invalidVariables: string[] = [];

  // Count valid variables
  const charMatches = text.match(/\{\{char\}\}/gi) || [];
  const userMatches = text.match(/\{\{user\}\}/gi) || [];

  // Check for case sensitivity issues
  const charLowercase = text.match(/\{\{char\}\}/g) || [];
  const charUppercase = text.match(/\{\{CHAR\}\}/g) || [];
  const charMixed =
    charMatches.length - charLowercase.length - charUppercase.length;

  if (charMixed > 0 || charUppercase.length > 0) {
    warnings.push("Consider using lowercase {{char}} for consistency");
  }

  const userLowercase = text.match(/\{\{user\}\}/g) || [];
  const userUppercase = text.match(/\{\{USER\}\}/g) || [];
  const userMixed =
    userMatches.length - userLowercase.length - userUppercase.length;

  if (userMixed > 0 || userUppercase.length > 0) {
    warnings.push("Consider using lowercase {{user}} for consistency");
  }

  // Find all variables and check for invalid ones
  let match;
  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    const fullMatch = match[0].toLowerCase();
    if (VALID_VARIABLES.has(fullMatch) && match[0] !== fullMatch &&
        fullMatch !== "{{char}}" && fullMatch !== "{{user}}") {
      const warning = `Use lowercase ${fullMatch} for consistent macro support`;
      if (!warnings.includes(warning)) warnings.push(warning);
    }
    if (!VALID_VARIABLES.has(fullMatch)) {
      if (!invalidVariables.includes(match[0])) {
        invalidVariables.push(match[0]);
      }
    }
  }

  if (invalidVariables.length > 0) {
    warnings.push(`Invalid variables found: ${invalidVariables.join(", ")}`);
  }

  return {
    tokenCount: countTokens(text),
    charVariableCount: charMatches.length,
    userVariableCount: userMatches.length,
    invalidVariables,
    isValid: invalidVariables.length === 0,
    warnings,
  };
}

/**
 * Validates all bot fields and returns combined validation
 */
export function validateBot(bot: Partial<Bot>): TokenValidation {
  const allText = [
    bot.personality || "",
    [bot.firstMessage || "", ...(bot.alternateGreetings || [])]
      .filter(Boolean)
      .join("\n\n"),
    bot.scenario || "",
    bot.exampleDialogues || "",
  ].join("\n");

  return validateVariables(allText);
}

// ----------------------------------------------------------------------------
// Character Card V2 Export/Import
// ----------------------------------------------------------------------------

/**
 * Converts a Bot to Character Card V2 format
 */
export function botToCharacterCard(bot: Bot): CharacterCardV2 {
  const alternateGreetings = (bot.alternateGreetings || []).filter(Boolean);

  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: bot.name,
      // CROSS 1: The Janitor's massive "Personality" goes to the "description" of the V2 standard
      description: bot.personality,
      // The Janitor's "Short Description" fits the "personality" of the V2 standard.
      personality: bot.shortDescription,
      first_mes: bot.firstMessage,
      alternate_greetings:
        alternateGreetings.length > 0 ? alternateGreetings : undefined,
      scenario: bot.scenario,
      mes_example: bot.exampleDialogues,
      tags: bot.tags,
      extensions: {
        janitorforge: {
          rating: bot.rating,
          createdAt: bot.createdAt.toISOString(),
        },
      },
    },
  };
}

/**
 * Converts Character Card V2 to Bot format
 */
export function characterCardToBot(
  card: CharacterCardV2,
): Omit<Bot, "id" | "createdAt" | "updatedAt"> {
  const extensions = card.data.extensions?.janitorforge as
    | JanitorForgeCharacterCardExtension
    | undefined;
  const alternateGreetings = (card.data.alternate_greetings || []).filter(
    Boolean,
  );

  return {
    name: card.data.name,
    // CROSS 2: The V2's "personality" becomes our Janitor short description
    shortDescription: card.data.personality || "",
    // The V2's massive "description" becomes our Janitor personality
    personality: card.data.description || "",
    firstMessage: card.data.first_mes,
    alternateGreetings,
    scenario: card.data.scenario,
    exampleDialogues: card.data.mes_example,
    tags: card.data.tags || [],
    rating: extensions?.rating || "SFW",
  };
}

/**
 * Helper: Calculate the CRC32 required for the PNG blocks
 */
function crc32(data: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Encodes character card data into a PNG image with embedded metadata
 * STRICT V2 COMPLIANCE: Uses standard chara field in tEXt chunk
 */
export async function exportCharacterCardPNG(
  bot: Bot,
  imageUrl?: string,
): Promise<Blob> {
  const cardData = botToCharacterCard(bot);
  const jsonString = JSON.stringify(cardData);
  const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 400;
  canvas.height = 600;

  const gradient = ctx.createLinearGradient(0, 0, 400, 600);
  gradient.addColorStop(0, "#2d1f4e");
  gradient.addColorStop(1, "#1a1625");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 600);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(bot.name, 200, 300);

  ctx.fillStyle = "#a78bfa";
  ctx.font = "14px system-ui";
  ctx.fillText("Character Card V2", 200, 330);
  ctx.fillText("Created with Forgeworks", 200, 350);

  if (imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });
      ctx.drawImage(img, 0, 0, 400, 600);
    } catch {
      // Ignore image loading errors and continue with the gradient background
    }
  }

  // 1. Generate PNG Blob from Canvas
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );

  if (!blob) throw new Error("Failed to create canvas blob");

  // 2. Binary Manipulation: Injecting the actual tEXt chunk
  const buffer = await blob.arrayBuffer();
  const originalBytes = new Uint8Array(buffer);
  const textEncoder = new TextEncoder();

  // Construct the chunk data (keyword + null terminator + data)
  const keyword = textEncoder.encode("chara\0");
  const textData = textEncoder.encode(base64Data);
  const chunkData = new Uint8Array(keyword.length + textData.length);
  chunkData.set(keyword, 0);
  chunkData.set(textData, keyword.length);

  // Calculate the CRC32 using the "Type" + "Data"
  const type = textEncoder.encode("tEXt");
  const crcData = new Uint8Array(4 + chunkData.length);
  crcData.set(type, 0);
  crcData.set(chunkData, 4);
  const crc = crc32(crcData);

  // Assemble the complete chunk (Length 4b + Type 4b + Data + CRC 4b)
  const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, chunkData.length); // Length
  chunk.set(type, 4); // Type
  chunk.set(chunkData, 8); // Data
  view.setUint32(8 + chunkData.length, crc); // CRC32

  // 3. Insert the chunk right after the IHDR chunk (always occupies the first 33 bytes)
  const finalBuffer = new Uint8Array(originalBytes.length + chunk.length);
  finalBuffer.set(originalBytes.subarray(0, 33), 0); // PNG signature + IHDR
  finalBuffer.set(chunk, 33); // Our tEXt chunk
  finalBuffer.set(originalBytes.subarray(33), 33 + chunk.length); // The rest of the image

  return new Blob([finalBuffer], { type: "image/png" });
}

/**
 * Attempts to read character card data from a PNG file
 * STRICT V2 COMPLIANCE: Reads binary PNG chunks securely
 */
export async function importCharacterCardPNG(
  file: File,
): Promise<CharacterCardV2 | null> {
  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);

    // Verify that it is a valid PNG
    if (view.getUint32(0) !== 0x89504e47) {
      return null;
    }

    let offset = 8; // Start after the PNG signature

    while (offset < view.byteLength) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7),
      );

      if (type === "tEXt") {
        const dataOffset = offset + 8;
        const dataBytes = new Uint8Array(buffer, dataOffset, length);
        const chunkText = new TextDecoder("utf-8").decode(dataBytes);

        // Separar "chara" de la cadena en base64
        const parts = chunkText.split("\0");
        const keyword = parts[0];

        if (keyword === "chara") {
          const encodedData = parts.slice(1).join("\0");
          try {
            const jsonString = decodeURIComponent(escape(atob(encodedData)));
            return JSON.parse(jsonString) as CharacterCardV2;
          } catch (e) {
            console.error("Failed to parse card JSON data:", e);
            return null;
          }
        }
      }

      // Skip to the next chunk (4 length + 4 type + data + 4 crc)
      offset += 12 + length;
    }

    return null; // 'chara' chunk not found
  } catch (error) {
    console.error("Error reading PNG metadata:", error);
    return null;
  }
}
