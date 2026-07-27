// Notification titles.
//
// Every push used to arrive as "🚨 ब्रेकिङ न्युज" because the only job the cron
// actually ran was type=breaking, and that branch hardcoded the siren title
// regardless of the story. Routine items — a committee being formed, an exam
// paper leak arrest — all screamed BREAKING, which trains users to ignore the
// channel entirely and makes a real emergency indistinguishable.
//
// Now a normal push is titled by its TOPIC, so the label tells the user what
// kind of story it is before they open it.
import { TOPICS } from "./topics-config";
import type { TopicId } from "@/types";

/** Reserved for genuinely breaking stories only. */
export function breakingTitle(lang: "ne" | "en"): string {
  return lang === "ne" ? "🚨 ब्रेकिङ न्युज" : "🚨 Breaking News";
}

/** Neutral title for subscribers with no usable topic signal yet. */
export function generalTitle(lang: "ne" | "en"): string {
  return lang === "ne" ? "📰 तपाईंका लागि" : "📰 For you";
}

/**
 * Title for a personalised push, e.g. "🏆 खेलकुद" / "🏛️ Politics".
 * Falls back to the neutral title when the topic is unknown, and deliberately
 * refuses "breaking" as a title topic — that emoji is reserved.
 */
export function personalTitle(topic: TopicId | string | undefined, lang: "ne" | "en"): string {
  if (!topic || topic === "breaking") return generalTitle(lang);
  const cfg = TOPICS.find((t) => t.id === topic);
  if (!cfg) return generalTitle(lang);
  return `${cfg.emoji} ${lang === "ne" ? cfg.labelNe : cfg.label}`;
}

export function digestTitle(kind: "morning" | "evening", lang: "ne" | "en"): string {
  if (kind === "morning") {
    return lang === "ne" ? "☀️ सुप्रभात! आजका मुख्य समाचार" : "☀️ Good Morning! Today's Top News";
  }
  return lang === "ne" ? "🌙 साँझको समाचार संक्षेप" : "🌙 Evening News Brief";
}
