// Daily polls generation and management

export interface PollOption {
  id: string;
  text: string;
  textNe: string;
  votes: number;
}

export interface DailyPoll {
  id: string;
  date: string;           // YYYY-MM-DD
  question: string;
  questionNe: string;
  options: PollOption[];
  category: string;
  diamondReward: number;
  expiresAt: string;      // ISO timestamp
  totalVotes: number;
}

export interface UserPollAnswers {
  [pollId: string]: string; // pollId → optionId
}

// Pool of Nepal-specific poll templates
const POLL_TEMPLATES = [
  {
    question: "Should fuel prices be reduced?",
    questionNe: "इन्धनको मूल्य घटाउनु पर्छ?",
    options: [
      { id: "yes", text: "Yes, immediately", textNe: "हो, तुरुन्तै" },
      { id: "no", text: "No, prices are fair", textNe: "होइन, मूल्य उचित छ" },
      { id: "partial", text: "Only for essentials", textNe: "आवश्यक वस्तुमा मात्र" },
    ],
    category: "economy",
  },
  {
    question: "Is the government doing enough for earthquake victims?",
    questionNe: "भूकम्प पीडितका लागि सरकारले पर्याप्त काम गरिरहेको छ?",
    options: [
      { id: "yes", text: "Yes, doing great", textNe: "हो, राम्रो काम गरिरहेको छ" },
      { id: "no", text: "No, needs more action", textNe: "होइन, थप कदम चाहिन्छ" },
      { id: "unsure", text: "Not sure", textNe: "थाहा छैन" },
    ],
    category: "politics",
  },
  {
    question: "Should Nepal prioritize IT sector for economic growth?",
    questionNe: "आर्थिक विकासका लागि नेपालले IT क्षेत्रलाई प्राथमिकता दिनु पर्छ?",
    options: [
      { id: "yes", text: "Absolutely", textNe: "बिल्कुल" },
      { id: "agri", text: "No, focus on agriculture", textNe: "होइन, कृषिमा ध्यान दिनू" },
      { id: "both", text: "Both equally", textNe: "दुवैमा समान" },
    ],
    category: "tech",
  },
  {
    question: "Will Nepal qualify for the next Cricket World Cup?",
    questionNe: "नेपाल अर्को क्रिकेट विश्वकपमा छनौट हुनेछ?",
    options: [
      { id: "yes", text: "Yes, definitely!", textNe: "हो, निश्चित!" },
      { id: "no", text: "Not this time", textNe: "यसपालि होइन" },
      { id: "maybe", text: "Depends on the team", textNe: "टिममा निर्भर छ" },
    ],
    category: "sports",
  },
  {
    question: "Should Nepal legalize online work-from-home businesses officially?",
    questionNe: "नेपालले घरबाट काम गर्ने अनलाइन व्यवसायलाई आधिकारिक मान्यता दिनु पर्छ?",
    options: [
      { id: "yes", text: "Yes, it's the future", textNe: "हो, यही भविष्य हो" },
      { id: "no", text: "Traditional jobs are better", textNe: "परम्परागत रोजगारी राम्रो" },
      { id: "both", text: "Support both", textNe: "दुवैलाई समर्थन गर्नू" },
    ],
    category: "business",
  },
  {
    question: "Is Kathmandu's air quality worsening every year?",
    questionNe: "काठमाडौंको वायु गुणस्तर हर वर्ष खराब हुँदैछ?",
    options: [
      { id: "yes", text: "Yes, it's critical", textNe: "हो, यो गम्भीर समस्या हो" },
      { id: "improving", text: "No, things are improving", textNe: "होइन, सुधार हुँदैछ" },
      { id: "same", text: "Staying the same", textNe: "उस्तै छ" },
    ],
    category: "health",
  },
  {
    question: "Should school education be fully in Nepali language?",
    questionNe: "विद्यालय शिक्षा पूर्ण रूपमा नेपाली भाषामा हुनु पर्छ?",
    options: [
      { id: "ne", text: "Yes, preserve our language", textNe: "हो, हाम्रो भाषा जोगाउनू" },
      { id: "en", text: "No, English is important", textNe: "होइन, अंग्रेजी महत्त्वपूर्ण छ" },
      { id: "both", text: "Bilingual is best", textNe: "दुई भाषा नै राम्रो" },
    ],
    category: "education",
  },
  {
    question: "Should Nepal reduce its dependency on India for trade?",
    questionNe: "नेपालले व्यापारमा भारतमाथिको निर्भरता घटाउनु पर्छ?",
    options: [
      { id: "yes", text: "Yes, diversify trade", textNe: "हो, व्यापार विविधीकरण गर्नू" },
      { id: "no", text: "India is our top partner", textNe: "भारत हाम्रो मुख्य साझेदार हो" },
      { id: "both", text: "Maintain but expand", textNe: "कायम राख्दै विस्तार गर्नू" },
    ],
    category: "international",
  },
  {
    question: "Do you trust Nepal's mainstream media?",
    questionNe: "के तपाईं नेपालको मूलधारको मिडियामा विश्वास गर्नुहुन्छ?",
    options: [
      { id: "yes", text: "Yes, mostly", textNe: "हो, धेरैजसो" },
      { id: "no", text: "No, too biased", textNe: "होइन, धेरै पक्षपाती" },
      { id: "some", text: "Some are trustworthy", textNe: "केही विश्वसनीय छन्" },
    ],
    category: "politics",
  },
  {
    question: "Should Nepal invest more in hydropower?",
    questionNe: "नेपालले जलविद्युतमा थप लगानी गर्नु पर्छ?",
    options: [
      { id: "yes", text: "Yes, it's our strength", textNe: "हो, यो हाम्रो शक्ति हो" },
      { id: "solar", text: "Focus on solar instead", textNe: "सौर्य ऊर्जामा ध्यान दिनू" },
      { id: "both", text: "Diversify energy sources", textNe: "ऊर्जा स्रोत विविधीकरण गर्नू" },
    ],
    category: "business",
  },
];

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getPollIndexForDate(dateStr: string): number {
  // Deterministic index based on date so everyone gets same poll per day
  const hash = dateStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % POLL_TEMPLATES.length;
}

export function getTodaysPoll(): DailyPoll {
  const today = todayString();
  const idx = getPollIndexForDate(today);
  const template = POLL_TEMPLATES[idx];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return {
    id: `poll-${today}`,
    date: today,
    question: template.question,
    questionNe: template.questionNe,
    options: template.options.map((o, i) => ({
      id: o.id,
      text: o.text,
      textNe: o.textNe,
      // Simulate existing vote distribution (random but seeded by date+index)
      votes: Math.floor(((idx + i + 1) * 137) % 500 + 50),
    })),
    category: template.category,
    diamondReward: 5,
    expiresAt: tomorrow.toISOString(),
    totalVotes: 0, // computed
  };
}

const POLL_ANSWERS_KEY = "inshorts-nepal-poll-answers";
const POLL_VOTES_KEY = "inshorts-nepal-poll-votes";

export function loadPollAnswers(): UserPollAnswers {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(POLL_ANSWERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function savePollAnswer(pollId: string, optionId: string): void {
  if (typeof window === "undefined") return;
  try {
    const answers = loadPollAnswers();
    answers[pollId] = optionId;
    localStorage.setItem(POLL_ANSWERS_KEY, JSON.stringify(answers));

    // Also store local vote counts delta
    const votes = loadLocalVoteDelta();
    votes[`${pollId}:${optionId}`] = (votes[`${pollId}:${optionId}`] ?? 0) + 1;
    localStorage.setItem(POLL_VOTES_KEY, JSON.stringify(votes));
  } catch { /* ignore */ }
}

function loadLocalVoteDelta(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(POLL_VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function getPollWithUserVotes(poll: DailyPoll): DailyPoll {
  const delta = loadLocalVoteDelta();
  const options = poll.options.map((o) => ({
    ...o,
    votes: o.votes + (delta[`${poll.id}:${o.id}`] ?? 0),
  }));
  const totalVotes = options.reduce((s, o) => s + o.votes, 0);
  return { ...poll, options, totalVotes };
}
