// ============================================================================
// Forgeworks - Centralized Bot Tags
// Janitor-style tag catalog with aliases, colors, and normalization.
// Unknown tags are preserved as custom tags.
// ============================================================================

export type BotTagIconKey =
  | "user"
  | "users"
  | "heart"
  | "tag"
  | "shield"
  | "flame"
  | "skull"
  | "bot"
  | "books"
  | "nsfw_forbidden"
  | "film"
  | "tv"
  | "gamepad"
  | "globe"
  | "moon"
  | "sun"
  | "crown"
  | "male"
  | "female"
  | "chains"
  | "oc"
  | "unicorn"
  | "dead_dove"
  | "prayer"
  | "smut"
  | "first_quarter_moon"
  | "fluff"
  | "two_people"
  | "villain"
  | "mlm"
  | "crystal_ball"
  | "villain"
  | "mlm"
  | "gamepad"
  | "hero"
  | "broken_heart"
  | "scenario"
  | "japanese_ogre"
  | "castle"
  | "demon"
  | "angel"
  | "swords"
  | "wolf"
  | "rainbow"
  | "wlw"
  | "adn"
  | "dice"
  | "flashlight"
  | "girl"
  | "laugh"
  | "vampire"
  | "octopus"
  | "urban_landscape"
  | "alien"
  | "trans_flag"
  | "music_note"
  | "detective"
  | "elf"
  | "scroll"
  | "church"
  | "zip_lock"
  | "book"
  | "assistant"
  | "globe"
  | "woman_sauna"
  | "moon"
  | "ovni"
  | "dragon"
  | "disk";

export const BOT_TAG_ICON_EMOJI: Record<BotTagIconKey, string> = {
  user: "👤",
  users: "👥",
  heart: "❤️",
  tag: "🏷️",
  shield: "🛡️",
  flame: "🔥",
  skull: "💀",
  bot: "🤖",
  nsfw_forbidden: "🔞",
  male: "👨",
  female: "👩",
  oc: "🧑🎨",
  smut: "❤️🔥",
  prayer: "🙇‍♂️",
  books: "📚",
  film: "🎬",
  unicorn: "🦄",
  dead_dove: "🕊️🗡️",
  first_quarter_moon: "🌗",
  fluff: "❤️🩹",
  two_people: "👫",
  chains: "⛓️",
  tv: "📺",
  crystal_ball: "🔮",
  villain: "🦹",
  mlm: "👨‍❤️‍👨",
  gamepad: "🎮",
  hero: "🦸",
  broken_heart: "💔",
  scenario: "📖",
  japanese_ogre: "👹",
  castle: "🏰",
  swords: "⚔️",
  wolf: "🐺",
  rainbow: "🌈",
  wlw: "👩‍❤️‍👩",
  adn: "🧬",
  dice: "🎲",
  flashlight: "🔦",
  girl: "👧",
  laugh: "😂",
  vampire: "🧛",
  octopus: "🦑",
  alien: "👽",
  trans_flag: "🏳️‍⚧️",
  detective: "🕵️",
  elf: "🧝",
  music_note: "🎵",
  scroll: "📜",
  church: "⛪",
  zip_lock: "🤐",
  book: "📙",
  assistant: "💁‍♀️",
  globe: "🌍",
  woman_sauna: "🧖‍♀️",
  moon: "🌙",
  ovni: "🛸",
  dragon: "🐉",
  disk: "💽",
  sun: "☀️",
  urban_landscape: "🏙️",
  demon: "😈",
  angel: "😇",
  crown: "👑",
};

export interface BotTagDefinition {
  label: string;
  aliases?: string[];
  icon: BotTagIconKey;
  badgeClassName: string;
}

export interface BotTagMeta {
  label: string;
  icon: BotTagIconKey;
  badgeClassName: string;
  isOfficial: boolean;
}

export type BotContentRating = "SFW" | "NSFW";

export const LIMITED_BOT_TAG = "Limited";
export const LIMITLESS_BOT_TAG = "Limitless";

export const OFFICIAL_BOT_TAGS: BotTagDefinition[] = [
  {
    label: "Male",
    aliases: ["man", "boy"],
    icon: "male",
    badgeClassName:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    label: "Female",
    aliases: ["woman", "girl"],
    icon: "female",
    badgeClassName:
      "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  },
  {
    label: "Dominant",
    aliases: ["dom"],
    icon: "chains",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    label: "Fictional",
    aliases: ["books", "novel"],
    icon: "books",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    label: "OC",
    aliases: ["original character", "originalcharacter"],
    icon: "oc",
    badgeClassName: "border-primary/30 bg-primary/10 text-primary",
  },
  {
    label: "Smut",
    aliases: ["erotic", "erotica", "adult"],
    icon: "smut",
    badgeClassName:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  {
    label: "Submissive",
    aliases: ["sub"],
    icon: "prayer",
    badgeClassName:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  {
    label: "Game",
    aliases: ["gaming"],
    icon: "gamepad",
    badgeClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "Anime",
    icon: "tv",
    badgeClassName:
      "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  },
  {
    label: "Non-human",
    aliases: ["nonhuman", "creature", "monster"],
    icon: "unicorn",
    badgeClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "Any POV",
    aliases: ["anypov", "any pov"],
    icon: "user",
    badgeClassName: "border-primary/30 bg-primary/10 text-primary",
  },
  {
    label: "Dead Dove",
    aliases: ["nsfw", "nsfl", "explicit", "adult"],
    icon: "dead_dove",
    badgeClassName:
      "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-300",
  },
  {
    label: "Switch",
    aliases: ["versatile"],
    icon: "first_quarter_moon",
    badgeClassName:
      "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  },
  {
    label: "Fluff",
    icon: "fluff",
    badgeClassName:
      "border-rose-400/30 bg-rose-400/10 text-rose-700 dark:text-rose-300",
  },
  {
    label: "Multiple",
    aliases: ["more than one", "more characters", "more than one character"],
    icon: "two_people",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    label: "Magical",
    icon: "crystal_ball",
    badgeClassName:
      "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    label: "Villain",
    icon: "villain",
    badgeClassName:
      "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-300",
  },
  {
    label: "MLM",
    aliases: ["mlm romance", "mlm romance story"],
    icon: "mlm",
    badgeClassName:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    label: "Scenario",
    aliases: ["prompt", "story prompt"],
    icon: "scenario",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    label: "MalePOV",
    aliases: ["malepov", "male pov"],
    icon: "male",
    badgeClassName:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    label: "FemPOV",
    aliases: ["femalepov", "female pov"],
    icon: "female",
    badgeClassName:
      "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  },
  {
    label: "Hero",
    icon: "hero",
    badgeClassName:
      "border-blue-600/30 bg-blue-600/10 text-blue-700 dark:text-blue-300",
  },
  {
    label: "Angst",
    icon: "broken_heart",
    badgeClassName:
      "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
  {
    label: "Royalty",
    aliases: ["king", "queen", "prince", "princess", "kingdom", "monarchy"],
    icon: "crown",
    badgeClassName:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
  {
    label: "Monster",
    aliases: ["creature"],
    icon: "japanese_ogre",
    badgeClassName:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  {
    label: "Historical",
    aliases: ["period"],
    icon: "castle",
    badgeClassName:
      "border-stone-500/30 bg-stone-500/10 text-stone-700 dark:text-stone-300",
  },
  {
    label: "Enemies to Lovers",
    aliases: ["enemies to lovers", "enemies2lovers", "enemiestolovers"],
    icon: "swords",
    badgeClassName:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  {
    label: "Non-English",
    aliases: ["foreign", "non-english", "non english"],
    icon: "globe",
    badgeClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "Furry",
    icon: "wolf",
    badgeClassName:
      "border-stone-500/30 bg-stone-500/10 text-stone-700 dark:text-stone-300",
  },
  {
    label: "Giant",
    aliases: ["giant character"],
    icon: "woman_sauna",
    badgeClassName:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  {
    label: "Non-binary",
    aliases: ["nonbinary", "nb"],
    icon: "rainbow",
    badgeClassName:
      "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    label: "WLW",
    aliases: ["women loving women", "lesbian", "lesbians"],
    icon: "wlw",
    badgeClassName:
      "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  },
  {
    label: "Demi-Human",
    aliases: ["demi-human", "demihuman"],
    icon: "adn",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    label: "RPG",
    aliases: ["roleplay", "roleplaying", "tabletop"],
    icon: "dice",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    label: "Horror",
    icon: "flashlight",
    badgeClassName:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  {
    label: "Monster Girl",
    aliases: ["monster girl", "monstergirl"],
    icon: "girl",
    badgeClassName:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  {
    label: "Robot",
    aliases: ["android", "ai"],
    icon: "bot",
    badgeClassName:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  {
    label: "Comedy",
    aliases: ["funny"],
    icon: "laugh",
    badgeClassName:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
  {
    label: "Vampire",
    icon: "vampire",
    badgeClassName:
      "border-rose-600/30 bg-rose-600/10 text-rose-700 dark:text-rose-300",
  },
  {
    label: "Books",
    aliases: ["books", "novel"],
    icon: "books",
    badgeClassName:
      "border-amber-700/30 bg-amber-700/10 text-amber-800 dark:text-amber-500",
  },
  {
    label: "Pokemon",
    aliases: ["pokemon", "pocket monsters"],
    icon: "octopus",
    badgeClassName:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  {
    label: "Alien",
    icon: "alien",
    badgeClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "Trans",
    aliases: ["transgender"],
    icon: "trans_flag",
    badgeClassName:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  {
    label: "Detective",
    aliases: ["detective"],
    icon: "detective",
    badgeClassName:
      "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
  {
    label: "Elf",
    aliases: ["elf"],
    icon: "elf",
    badgeClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "Politics",
    aliases: ["politics", "government"],
    icon: "scroll",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    label: "OpenAI",
    aliases: ["openai", "llm", "gpt", "chatgpt", "high context"],
    icon: "zip_lock",
    badgeClassName:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  {
    label: "Religion",
    aliases: ["religion", "faith", "spirituality"],
    icon: "church",
    badgeClassName:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
  {
    label: "Assistant",
    aliases: ["assistant"],
    icon: "assistant",
    badgeClassName:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  {
    label: "Philosophy",
    aliases: ["philosophy"],
    icon: "book",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    label: "Sci-Fi",
    aliases: ["science fiction", "scifi", "sci fi"],
    icon: "ovni",
    badgeClassName:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  {
    label: "The Beginning",
    aliases: ["history", "origin", "origins"],
    icon: "dragon",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    label: "Music Mania",
    aliases: ["music", "mania"],
    icon: "disk",
    badgeClassName:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  {
    label: "Demon",
    icon: "demon",
    badgeClassName:
      "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  {
    label: "Angel",
    icon: "angel",
    badgeClassName:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
  {
    label: "Music",
    aliases: ["music"],
    icon: "music_note",
    badgeClassName:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  {
    label: "Movie",
    aliases: ["film"],
    icon: "film",
    badgeClassName:
      "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
  {
    label: "TV",
    aliases: ["show", "series"],
    icon: "tv",
    badgeClassName:
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    label: "Modern",
    icon: "urban_landscape",
    badgeClassName:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    label: "Romance",
    icon: "heart",
    badgeClassName:
      "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  },
  {
    label: "Limitless",
    aliases: ["nsfw", "dead dove", "nsfl", "explicit", "adult"],
    icon: "flame",
    badgeClassName:
      "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-300",
  },
  {
    label: "Limited",
    aliases: ["sfw", "sfl"],
    icon: "nsfw_forbidden",
    badgeClassName:
      "border-blue-600/30 bg-blue-600/10 text-blue-700 dark:text-blue-300",
  },
];

const CUSTOM_TAG_META: BotTagMeta = {
  label: "",
  icon: "tag",
  badgeClassName: "border-border bg-muted/60 text-foreground",
  isOfficial: false,
};

function normalizeBotTagKey(value: string) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const OFFICIAL_TAG_LOOKUP = new Map<string, BotTagDefinition>();
for (const tag of OFFICIAL_BOT_TAGS) {
  OFFICIAL_TAG_LOOKUP.set(normalizeBotTagKey(tag.label), tag);
  for (const alias of tag.aliases || []) {
    OFFICIAL_TAG_LOOKUP.set(normalizeBotTagKey(alias), tag);
  }
}

export function getBotTagMeta(value: string): BotTagMeta {
  const trimmed = String(value || "").trim();
  const official = OFFICIAL_TAG_LOOKUP.get(normalizeBotTagKey(trimmed));
  if (!official) {
    return {
      ...CUSTOM_TAG_META,
      label: trimmed,
    };
  }

  return {
    label: official.label,
    icon: official.icon,
    badgeClassName: official.badgeClassName,
    isOfficial: true,
  };
}

export function canonicalizeBotTag(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return getBotTagMeta(trimmed).label || trimmed;
}

export function normalizeBotTags(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const canonical = canonicalizeBotTag(value);
    const key = normalizeBotTagKey(canonical);
    if (!canonical || seen.has(key)) continue;
    seen.add(key);
    normalized.push(canonical);
  }

  return normalized;
}

export function applyRatingTagToBotTags(
  values: string[],
  rating: BotContentRating,
) {
  const requiredTag = rating === "NSFW" ? LIMITLESS_BOT_TAG : LIMITED_BOT_TAG;
  const withoutRatingTag = normalizeBotTags(values).filter((value) => {
    const canonical = canonicalizeBotTag(value);
    return canonical !== LIMITED_BOT_TAG && canonical !== LIMITLESS_BOT_TAG;
  });

  return normalizeBotTags([requiredTag, ...withoutRatingTag]);
}

export function getOfficialBotTagSuggestions(
  query: string,
  selectedTags: string[],
) {
  const normalizedQuery = normalizeBotTagKey(query);
  const selected = new Set(selectedTags.map((tag) => normalizeBotTagKey(tag)));
  const hiddenRatingTags = new Set([
    normalizeBotTagKey(LIMITED_BOT_TAG),
    normalizeBotTagKey(LIMITLESS_BOT_TAG),
  ]);

  const filtered = OFFICIAL_BOT_TAGS.filter((tag) => {
    const tagKey = normalizeBotTagKey(tag.label);
    return !selected.has(tagKey) && !hiddenRatingTags.has(tagKey);
  }).filter((tag) => {
    if (!normalizedQuery) return true;
    const haystacks = [tag.label, ...(tag.aliases || [])].map(
      normalizeBotTagKey,
    );
    return haystacks.some((entry) => entry.includes(normalizedQuery));
  });

  if (!normalizedQuery) {
    return filtered;
  }

  return filtered.sort((left, right) => {
    const leftStarts = normalizeBotTagKey(left.label).startsWith(
      normalizedQuery,
    );
    const rightStarts = normalizeBotTagKey(right.label).startsWith(
      normalizedQuery,
    );
    if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
    return left.label.localeCompare(right.label);
  });
}
