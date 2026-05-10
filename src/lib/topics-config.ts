import { TopicId } from "@/types";

export interface TopicConfig {
  id: TopicId;
  label: string;
  labelNe: string;
  emoji: string;
  color: string;
  bgColor: string;
  keywords: string[];
}

export const TOPICS: TopicConfig[] = [
  { id: "breaking",     label: "Breaking News",    labelNe: "ब्रेकिङ न्यूज",     emoji: "🔴", color: "#EF4444", bgColor: "bg-red-500",     keywords: ["breaking","urgent","alert"] },
  { id: "politics",     label: "Politics",         labelNe: "राजनीति",            emoji: "🏛️", color: "#3B82F6", bgColor: "bg-blue-500",    keywords: ["politics","government","minister","election","party","सरकार","मन्त्री"] },
  { id: "local",        label: "Local News",       labelNe: "स्थानीय समाचार",    emoji: "📍", color: "#10B981", bgColor: "bg-emerald-500", keywords: ["local","district","municipality","province","ward"] },
  { id: "business",     label: "Business",         labelNe: "व्यापार",            emoji: "📈", color: "#F59E0B", bgColor: "bg-amber-500",   keywords: ["business","economy","market","trade","export","import","अर्थ","व्यापार"] },
  { id: "startups",     label: "Startups",         labelNe: "स्टार्टअप",          emoji: "🚀", color: "#8B5CF6", bgColor: "bg-violet-500",  keywords: ["startup","entrepreneur","funding","venture","investment","innovation"] },
  { id: "tech",         label: "Technology",       labelNe: "प्रविधि",            emoji: "💻", color: "#06B6D4", bgColor: "bg-cyan-500",    keywords: ["tech","technology","digital","software","ai","internet","app","प्रविधि"] },
  { id: "sports",       label: "Sports",           labelNe: "खेलकुद",             emoji: "🏆", color: "#F97316", bgColor: "bg-orange-500",  keywords: ["sports","game","player","match","tournament","खेल"] },
  { id: "cricket",      label: "Cricket",          labelNe: "क्रिकेट",            emoji: "🏏", color: "#84CC16", bgColor: "bg-lime-500",    keywords: ["cricket","wicket","batting","bowling","icc","test","odi","क्रिकेट"] },
  { id: "football",     label: "Football",         labelNe: "फुटबल",              emoji: "⚽", color: "#22C55E", bgColor: "bg-green-500",   keywords: ["football","soccer","fifa","goal","league","फुटबल"] },
  { id: "entertainment",label: "Entertainment",    labelNe: "मनोरञ्जन",          emoji: "🎬", color: "#EC4899", bgColor: "bg-pink-500",    keywords: ["entertainment","celebrity","award","music","मनोरञ्जन"] },
  { id: "bollywood",    label: "Bollywood",        labelNe: "बलिउड",              emoji: "🎭", color: "#A855F7", bgColor: "bg-purple-500",  keywords: ["bollywood","hindi film","actor","actress","box office","बलिउड"] },
  { id: "nepali-cinema",label: "Nepali Cinema",    labelNe: "नेपाली चलचित्र",    emoji: "🎥", color: "#D946EF", bgColor: "bg-fuchsia-500", keywords: ["nepali film","chalachitra","kollywood","नेपाली चलचित्र"] },
  { id: "international",label: "International",    labelNe: "अन्तर्राष्ट्रिय",  emoji: "🌍", color: "#0EA5E9", bgColor: "bg-sky-500",     keywords: ["world","international","global","un","usa","india","china","विश्व"] },
  { id: "health",       label: "Health",           labelNe: "स्वास्थ्य",          emoji: "🏥", color: "#14B8A6", bgColor: "bg-teal-500",    keywords: ["health","medical","hospital","disease","vaccine","doctor","स्वास्थ्य"] },
  { id: "education",    label: "Education",        labelNe: "शिक्षा",             emoji: "📚", color: "#F59E0B", bgColor: "bg-yellow-500",  keywords: ["education","school","university","student","exam","scholarship","शिक्षा"] },
  { id: "jobs",         label: "Jobs & Career",    labelNe: "रोजगार",             emoji: "💼", color: "#6366F1", bgColor: "bg-indigo-500",  keywords: ["job","career","vacancy","recruitment","employment","रोजगार"] },
  { id: "weather",      label: "Weather",          labelNe: "मौसम",               emoji: "⛅", color: "#38BDF8", bgColor: "bg-sky-400",     keywords: ["weather","rain","flood","earthquake","climate","monsoon","मौसम"] },
  { id: "travel",       label: "Travel & Tourism", labelNe: "पर्यटन",             emoji: "✈️", color: "#34D399", bgColor: "bg-emerald-400", keywords: ["travel","tourism","trekking","everest","himalaya","पर्यटन"] },
  { id: "agriculture",  label: "Agriculture",      labelNe: "कृषि",               emoji: "🌾", color: "#86EFAC", bgColor: "bg-green-400",   keywords: ["agriculture","farming","crop","paddy","farmer","कृषि"] },
  { id: "nepse",        label: "NEPSE / Stock",    labelNe: "सेयर बजार",          emoji: "📊", color: "#FCD34D", bgColor: "bg-yellow-400",  keywords: ["nepse","stock","share","market","ipo","sebon","सेयर"] },
  { id: "crypto",       label: "Crypto",           labelNe: "क्रिप्टो",           emoji: "₿",  color: "#FB923C", bgColor: "bg-orange-400",  keywords: ["crypto","bitcoin","ethereum","blockchain","nft","क्रिप्टो"] },
  { id: "government",   label: "Govt. Notices",    labelNe: "सरकारी सूचना",       emoji: "📋", color: "#94A3B8", bgColor: "bg-slate-500",   keywords: ["notice","tender","government notice","circular","सूचना"] },
];

export function getTopicById(id: TopicId): TopicConfig | undefined {
  return TOPICS.find((t) => t.id === id);
}

export function detectTopics(text: string): TopicId[] {
  const lower = text.toLowerCase();
  const matched: TopicId[] = [];
  for (const topic of TOPICS) {
    if (topic.keywords.some((k) => lower.includes(k))) {
      matched.push(topic.id);
    }
  }
  return matched.length > 0 ? matched : ["local"];
}
