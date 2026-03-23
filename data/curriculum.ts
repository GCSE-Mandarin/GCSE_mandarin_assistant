
import { Stage } from '../types';

export const CURRICULUM: Stage[] = [
  {
    id: 1,
    title: "Stage 1: Foundations (A1.1)",
    duration: "0–2 months",
    goal: "Build sound–symbol awareness, 4 tones, pinyin decoding, 100 basic characters.",
    topics: [
      {
        id: "s1-pinyin",
        title: "Pinyin & tones",
        points: [
          { id: "s1-tones", description: "Learn 4 tones and neutral tone" },
          { id: "s1-initials", description: "Identify initials/finals" },
          { id: "s1-tone-pairs", description: "Practice tone pairs" },
          { id: "s1-sandhi", description: "Tone sandhi (3rd + 3rd → 2 + 3)" }
        ]
      },
      {
        id: "s1-characters",
        title: "Basic characters & radicals",
        points: [
          { id: "s1-strokes", description: "8 basic strokes" },
          { id: "s1-radicals", description: "Radicals: 人, 女, 口, 水, 木, 火" },
          { id: "s1-stroke-order", description: "Stroke order rules" }
        ]
      },
      {
        id: "s1-vocabulary",
        title: "Survival vocabulary (50–100 words)",
        points: [
          { id: "s1-greetings", description: "Greetings: 你好, 再见, 谢谢, 不客气" },
          { id: "s1-intro", description: "Self-intro: 我叫…, 我是英国人。" },
          { id: "s1-numbers", description: "Numbers 1–100" },
          { id: "s1-dates", description: "Days, months, dates" },
          { id: "s1-family", description: "Family: 爸爸, 妈妈, 哥哥, 姐姐" }
        ]
      },
      {
        id: "s1-grammar",
        title: "Grammar foundations",
        points: [
          { id: "s1-svo", description: "SVO sentence order" },
          { id: "s1-questions", description: "是 / 不 / 吗 questions" },
          { id: "s1-have", description: "有 / 没有" },
          { id: "s1-possession", description: "的 (possession)" },
          { id: "s1-measure", description: "一 + measure word + noun (一个人)" }
        ]
      },
      {
        id: "s1-skills",
        title: "Listening & Speaking micro-skills",
        points: [
          { id: "s1-identify", description: "Identify tones and familiar words" },
          { id: "s1-qa", description: "Short Q&A: 你叫什么名字？你几岁？" },
          { id: "s1-dialogues", description: "Simple dialogues" }
        ]
      },
      {
        id: "s1-everyday",
        title: "Everyday activities",
        points: [
          { id: "s1-time-exp", description: "Time expressions (e.g. telling the time, days, days of the week, months, seasons)" },
          { id: "s1-food-drink", description: "Food and drink (e.g. meals, fruit and vegetables, meat, fish and seafood, snacks, drinks, cutlery and utensils)" },
          { id: "s1-body-health", description: "The human body and health (e.g. parts of the body, health and illness)" },
          { id: "s1-travel-transport", description: "Travel and transport (e.g. finding the way)" }
        ]
      },
      {
        id: "s1-comprehensive-vocab",
        title: "Vocabulary",
        points: [
          { id: "s1-v-high-freq", description: "High Frequency Vocabulary" },
          { id: "s1-v-adj", description: "Adjective and attributive phrases" },
          { id: "s1-v-adv", description: "Adverbs and adverbial phrases" },
          { id: "s1-v-aux", description: "Auxiliary verbs" },
          { id: "s1-v-measure", description: "Common measure words" },
          { id: "s1-v-verbs", description: "Common verbs" },
          { id: "s1-v-conj", description: "Conjunctions and conjunctive patterns" },
          { id: "s1-v-nouns", description: "Nouns" },
          { id: "s1-v-num", description: "Numbers" },
          { id: "s1-v-part", description: "Particles" },
          { id: "s1-v-prep", description: "Prepositions and coverbs" },
          { id: "s1-v-pron", description: "Pronouns" },
          { id: "s1-v-quest", description: "Question words" },
          { id: "s1-v-stative", description: "Stative verbs" },
          { id: "s1-v-sur", description: "Surnames" },
          { id: "s1-v-verb-measure", description: "Verbal measure words" },
          { id: "s1-v-vo", description: "Verb-object compounds" }
        ]
      }
    ]
  },
  {
    id: 2,
    title: "Stage 2: Building Daily Language (A1.2)",
    duration: "2–4 months",
    goal: "Talk about daily life, school, food, time. Build 300-word vocabulary.",
    topics: [
      {
        id: "s2-vocab",
        title: "Vocabulary expansion",
        points: [
          { id: "s2-topics", description: "School subjects, classroom items, meals, hobbies, weather, colors" },
          { id: "s2-measure", description: "Measure words: 本, 张, 件, 辆, 条" }
        ]
      },
      {
        id: "s2-personal-social",
        title: "Personal and social life",
        points: [
          { id: "s2-self-family", description: "Self, family and friends (e.g. family and relationships, describing physical appearance, character and mood)" },
          { id: "s2-home-life", description: "Home life (e.g. housing and locations, rooms and furniture, household appliances)" },
          { id: "s2-colours", description: "Colours" },
          { id: "s2-clothes", description: "Clothes and accessories" },
          { id: "s2-leisure", description: "Leisure time (e.g. things to do, hobbies, sport)" }
        ]
      },
      {
        id: "s2-grammar",
        title: "Grammar",
        points: [
          { id: "s2-time", description: "Time expressions: 现在八点半" },
          { id: "s2-vo", description: "Verb + object compounds (吃饭, 睡觉, 上学)" },
          { id: "s2-adverbs", description: "Adverbs: 也, 都, 还, 常常" },
          { id: "s2-de", description: "的 / 得 / 地 distinction" },
          { id: "s2-negation", description: "Negative forms 不 vs 没" },
          { id: "s2-le", description: "了 (completed action)" }
        ]
      },
      {
        id: "s2-sentences",
        title: "Sentence building",
        points: [
          { id: "s2-likes", description: "我喜欢…因为…" },
          { id: "s2-routine-q", description: "你几点起床？" },
          { id: "s2-structure", description: "虽然…但是… structure introduction" }
        ]
      },
      {
        id: "s2-reading",
        title: "Reading",
        points: [
          { id: "s2-read-basic", description: "Read short paragraphs (80–100 chars)" },
          { id: "s2-read-picture", description: "Picture Reading (看图理解)" }
        ]
      },
      {
        id: "s2-writing",
        title: "Writing",
        points: [
          { id: "s2-write-basic", description: "Write 3–4 sentence paragraphs about daily life" }
        ]
      },
      {
        id: "s2-ls",
        title: "Listening & Speaking",
        points: [
          { id: "s2-describe", description: "Describe routine" },
          { id: "s2-express", description: "Express likes/dislikes" },
          { id: "s2-roleplay", description: "Role play: ordering food, describing weather" }
        ]
      }
    ]
  },
  {
    id: 3,
    title: "Stage 3: Communicating in Context (A2)",
    duration: "4–7 months",
    goal: "Handle everyday exchanges, express opinions, compare, narrate simple events.",
    topics: [
      {
        id: "s3-vocab",
        title: "Vocabulary (to 600 words)",
        points: [
          { id: "s3-topics", description: "Shopping, travel, body parts, health, sports" },
          { id: "s3-directions", description: "Locations & directions" },
          { id: "s3-transport", description: "Transportation terms" }
        ]
      },
      {
        id: "s3-world",
        title: "The world around us",
        points: [
          { id: "s3-people-places", description: "People and places (e.g. continents, countries and nationalities, compass points)" },
          { id: "s3-natural-world", description: "The natural world, the environment, the climate and the weather" },
          { id: "s3-tech", description: "Communications and technology (e.g. the digital world, documents and texts)" },
          { id: "s3-built-env", description: "The built environment (e.g. buildings and services, shopping)" },
          { id: "s3-measurements", description: "Measurements (e.g. units of length and mass, units of money)" }
        ]
      },
      {
        id: "s3-grammar",
        title: "Grammar",
        points: [
          { id: "s3-compare", description: "Comparison with 比, 一样, 没有" },
          { id: "s3-frequency", description: "Frequency & duration: 每天, 常常, 两个小时" },
          { id: "s3-serial", description: "Serial verbs: 一边…一边…" },
          { id: "s3-result", description: "Result complements: 吃完, 看懂" },
          { id: "s3-zai", description: "Use of 在 (location, continuous)" },
          { id: "s3-prep", description: "Prepositions: 给, 跟, 对, 从…到…" }
        ]
      },
      {
        id: "s3-comm",
        title: "Communication",
        points: [
          { id: "s3-opinion", description: "Express opinions + reasons" },
          { id: "s3-describe", description: "Describe pictures, events" },
          { id: "s3-exp", description: "Introduce past experiences with 过" },
          { id: "s3-cond", description: "Conditional: 如果…就…" }
        ]
      },
      {
        id: "s3-reading",
        title: "Reading",
        points: [
          { id: "s3-read", description: "Read letters, short articles" },
          { id: "s3-read-picture", description: "Picture Reading (看图理解)" }
        ]
      },
      {
        id: "s3-writing",
        title: "Writing",
        points: [
          { id: "s3-comp", description: "150-character compositions" },
          { id: "s3-write-connect", description: "Use paragraph connectors: 首先, 然后, 最后" }
        ]
      },
      {
        id: "s3-speak",
        title: "Speaking",
        points: [
          { id: "s3-travel", description: "Describe travel experiences" },
          { id: "s3-role", description: "Role play (shopping, hotel, directions)" }
        ]
      }
    ]
  },
  {
    id: 4,
    title: "Stage 4: Expanding Range (B1)",
    duration: "7–10 months",
    goal: "Understand longer texts, narrate past/future events, discuss plans.",
    topics: [
      {
        id: "s4-vocab",
        title: "Vocabulary (to 900 words)",
        points: [
          { id: "s4-topics", description: "Environment, festivals, technology, media, community" },
          { id: "s4-idioms", description: "Common idioms & proverbs: 马马虎虎, 一心一意" }
        ]
      },
      {
        id: "s4-work",
        title: "The world of work",
        points: [
          { id: "s4-education", description: "Education (e.g. learning institutions, places and people in school, the classroom, subjects and learning)" },
          { id: "s4-jobs", description: "Work (e.g. jobs and careers, the workplace)" }
        ]
      },
      {
        id: "s4-grammar",
        title: "Grammar",
        points: [
          { id: "s4-ba-bei", description: "把 & 被 structures" },
          { id: "s4-guo-le", description: "过 vs 了 nuance" },
          { id: "s4-place", description: "把…放在…上" },
          { id: "s4-purpose", description: "Conditional + purpose: 为了…, 因此…" },
          { id: "s4-adverb", description: "Adverb placement rules" },
          { id: "s4-relative", description: "Relative clauses with 的" }
        ]
      },
      {
        id: "s4-writing",
        title: "Writing",
        points: [
          { id: "s4-essay", description: "Develop multi-paragraph essays (200 characters)" },
          { id: "s4-cohesive", description: "Use cohesive devices & logical connectors" },
          { id: "s4-formats", description: "Write emails, invitations, diary entries" }
        ]
      },
      {
        id: "s4-reading",
        title: "Reading",
        points: [
          { id: "s4-articles", description: "Articles 200–250 characters" },
          { id: "s4-gist", description: "Identify main ideas + details" },
          { id: "s4-skim", description: "Skim for gist, infer meaning" },
          { id: "s4-read-picture", description: "Picture Reading (看图理解)" }
        ]
      },
      {
        id: "s4-speaking",
        title: "Speaking",
        points: [
          { id: "s4-picture", description: "Picture-based tasks" },
          { id: "s4-present", description: "Mini-presentation (1 min topic)" },
          { id: "s4-contrast", description: "Express contrasting opinions" }
        ]
      }
    ]
  },
  {
    id: 5,
    title: "Stage 5: Refining Accuracy & Style (B1+)",
    duration: "10–14 months",
    goal: "Use precise grammar, expand vocabulary to 1200 words, prepare for exam tasks.",
    topics: [
      {
        id: "s5-vocab",
        title: "Vocabulary",
        points: [
          { id: "s5-topics", description: "Work, study, future plans, world issues" },
          { id: "s5-opinion", description: "Expressions of opinion: 我认为…, 我觉得…" },
          { id: "s5-collocations", description: "Collocations for argument writing" }
        ]
      },
      {
        id: "s5-grammar",
        title: "Grammar",
        points: [
          { id: "s5-conj", description: "Complex conjunctions: 尽管…但是…, 不但…而且…" },
          { id: "s5-embed", description: "Embedded clauses" },
          { id: "s5-passive", description: "Passive + causative: 让, 被" },
          { id: "s5-nuance", description: "还, 才, 就 nuanced use" },
          { id: "s5-particles", description: "Sentence-final particles (吧, 呢, 啊)" }
        ]
      },
      {
        id: "s5-writing",
        title: "Writing",
        points: [
          { id: "s5-register", description: "Formal vs informal register" },
          { id: "s5-link", description: "Linking paragraphs logically" },
          { id: "s5-arg", description: "Argumentative & reflective writing" }
        ]
      },
      {
        id: "s5-speaking",
        title: "Speaking",
        points: [
          { id: "s5-sim", description: "3-part IGCSE oral simulation (presentation, topic, general)" },
          { id: "s5-debate", description: "Debate format" },
          { id: "s5-fluency", description: "Fluency under time limit" }
        ]
      },
      {
        id: "s5-reading",
        title: "Reading",
        points: [
          { id: "s5-auth", description: "Authentic texts (ads, articles)" },
          { id: "s5-para", description: "Paraphrase understanding" },
          { id: "s5-tf", description: "True/False/Not Given questions" }
        ]
      },
      {
        id: "s5-international",
        title: "The international world",
        points: [
          { id: "s5-countries", description: "Countries, nationalities and languages" },
          { id: "s5-culture", description: "Culture (e.g. customs, faiths and celebrations, famous sites and cities)" }
        ]
      }
    ]
  },
  {
    id: 6,
    title: "Stage 6: IGCSE Mastery (B2)",
    duration: "14–17 months",
    goal: "Perform confidently in all 4 IGCSE papers. Express abstract ideas clearly.",
    topics: [
      {
        id: "s6-vocab",
        title: "Vocabulary (1500+ words)",
        points: [
          { id: "s6-topics", description: "Cultural references, social issues, environmental terms" },
          { id: "s6-synonyms", description: "Synonyms & idioms for stylistic variety" }
        ]
      },
      {
        id: "s6-grammar",
        title: "Grammar & Style",
        points: [
          { id: "s6-cohesion", description: "High-level cohesion: 不仅…而且…, 因而…, 此外…" },
          { id: "s6-modal", description: "Modal layering (会 + 想 + 去…)" },
          { id: "s6-nom", description: "Nominalization & emphasis" },
          { id: "s6-idiomatic", description: "Idiomatic phrasing: 对…来说, 至于…, 无论…都…" }
        ]
      },
      {
        id: "s6-writing",
        title: "Writing",
        points: [
          { id: "s6-long", description: "Long compositions (250–300 characters)" },
          { id: "s6-balanced", description: "Balanced argument essays" },
          { id: "s6-narrative", description: "Narrative with time shifts" },
          { id: "s6-editing", description: "Self-editing for accuracy and variety" }
        ]
      },
      {
        id: "s6-speaking",
        title: "Speaking",
        points: [
          { id: "s6-present", description: "Present, justify, and contrast ideas" },
          { id: "s6-qa", description: "Spontaneous Q&A under exam conditions" },
          { id: "s6-tone", description: "Natural tone and rhythm" }
        ]
      },
      {
        id: "s6-exam",
        title: "Exam Practice",
        points: [
          { id: "s6-mock", description: "Full mock cycles under timed conditions" },
          { id: "s6-listen", description: "Listening to multi-speaker audio" },
          { id: "s6-review", description: "Past paper marking + reflection" }
        ]
      }
    ]
  }
];
