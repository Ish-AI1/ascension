import { useState, useEffect, useCallback } from "react";
import { supabase, assertSupabaseConfigured } from "./supabaseClient";

// ─── STARK MESSAGES LIBRARY ──────────────────────────────────────────────────
const STARK = {
  morning: [
    "Rise and shine. The world isn't going to disrupt itself.",
    "Another day. Another chance to not embarrass yourself.",
    "JARVIS would've had your tasks ready by now. Lucky for you, I'm more patient.",
    "Three missions. That's all. Even Rhodey can handle three.",
    "You built this. Now execute. Simple.",
  ],
  win: [
    "Not bad. Stark Industries could use someone like you.",
    "Clean execution. I respect that.",
    "One down. Don't get comfortable.",
    "That's how it's done. Keep moving.",
    "JARVIS just logged that. It counts.",
  ],
  fail_day: [
    "Found a bug in your discipline. Fix it. Now.",
    "Zero for today? Even Pepper gets more done on vacation.",
    "You didn't fail the mission. You failed to start it. Worse.",
    "This is the part where you decide who you actually are.",
    "Bad day happens. Bad week is a choice.",
  ],
  streak_3: [
    "Three days. You're building something real.",
    "Consistency detected. Keep the reactor running.",
    "Day three. The habit is starting to calcify. Good.",
  ],
  streak_7: [
    "I'm starting to think you're actually serious.",
    "Seven days. That's not luck. That's architecture.",
    "Week one complete. Now we find out if you mean it.",
  ],
  boss_incoming: [
    "Boss incoming. Don't embarrass me.",
    "This is the big one. I've seen you prep for less important things.",
    "Boss fight mode. Time to show what the training was for.",
  ],
  boss_win: [
    "Boss defeated. I'll admit — I didn't expect that.",
    "Clean kill. Power Shard acquired. You earned it.",
    "That's what I'm talking about. Stark-level execution.",
  ],
  recovery: [
    "Yesterday was a dumpster fire. Today is a clean slate. Don't waste it.",
    "One easy mission. That's all I'm asking. Just one.",
    "Recovery mode. Small wins. No ego. Let's go.",
  ],
  level_up: [
    "New rank unlocked. Don't let it go to your head.",
    "Upgraded. The suit gets better with every iteration. So do you.",
    "Level up. New missions unlock soon. Stay sharp.",
  ],
};

function getStark(type) {
  const arr = STARK[type] || STARK.morning;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── TASK POOL ────────────────────────────────────────────────────────────────
const ALL_TASKS = [
  // BODY
  { id: "t_train", cat: "body", label: "אימון יומי", desc: "30+ דקות — תזיז את הגוף", points: 10, difficulty: "medium", type: "routine", target_per_week: 5, cooldown: 0, icon: "💪" },
  { id: "t_fast", cat: "body", label: "עמידה בחלון צום", desc: "20:00–12:00. הגוף עובד בזמן שאתה לא אוכל", points: 5, difficulty: "easy", type: "routine", target_per_week: 6, cooldown: 0, icon: "⏱️" },
  { id: "t_protein", cat: "body", label: "יעד חלבון יומי", desc: "120+ גרם. כל ארוחה עם מקור חלבון", points: 5, difficulty: "easy", type: "routine", target_per_week: 6, cooldown: 0, icon: "🥩" },
  { id: "t_stretch", cat: "body", label: "מתיחות / התאוששות", desc: "15 דקות — גוף שמתאושש מתאמן טוב יותר מחר", points: 5, difficulty: "easy", type: "dynamic", target_per_week: 3, cooldown: 1, icon: "🧘" },
  { id: "t_no_junk", cat: "body", label: "יום ללא מתוקים מעובדים", desc: "קושי אמיתי. שווה כל נקודה", points: 5, difficulty: "medium", type: "routine", target_per_week: 5, cooldown: 0, icon: "🚫" },
  { id: "t_no_screens", cat: "body", label: "שעה ללא מסכים לפני שינה", desc: "השינה שלך קובעת את היום המחר", points: 5, difficulty: "easy", type: "routine", target_per_week: 6, cooldown: 0, icon: "📵" },
  // FOCUS
  { id: "t_deepwork", cat: "focus", label: "שעת Deep Work", desc: "60 דקות. טלפון כבוי. המשימה הכי חשובה.", points: 15, difficulty: "hard", type: "routine", target_per_week: 5, cooldown: 0, icon: "🎯" },
  { id: "t_client", cat: "focus", label: "פנייה ללקוח", desc: "הודעה חכמה, ערך ראשון, בלי beg", points: 5, difficulty: "easy", type: "dynamic", target_per_week: 3, cooldown: 1, icon: "📲" },
  { id: "t_payment", cat: "focus", label: "גביית תשלום", desc: "כסף שמגיע לך — שלח חשבונית, סגור", points: 10, difficulty: "medium", type: "dynamic", target_per_week: 2, cooldown: 2, icon: "💸" },
  { id: "t_content", cat: "focus", label: "יצירת תוכן", desc: "פוסט, סרטון, ניוזלטר — תייצג את עצמך", points: 10, difficulty: "medium", type: "dynamic", target_per_week: 3, cooldown: 1, icon: "✍️" },
  { id: "t_learn", cat: "focus", label: "למידה ממוקדת", desc: "30 דקות עם יישום — לא רק צריכה", points: 8, difficulty: "medium", type: "dynamic", target_per_week: 3, cooldown: 1, icon: "📚" },
  { id: "t_meeting", cat: "focus", label: "פגישת מכירה", desc: "הצגת ערך, הקשבה, הצעת מחיר", points: 15, difficulty: "hard", type: "dynamic", target_per_week: 2, cooldown: 2, icon: "🤝" },
  { id: "t_build", cat: "focus", label: "בניית נכס", desc: "מוצר, כלי, תהליך — עובד בשבילך גם כשאתה ישן", points: 12, difficulty: "hard", type: "dynamic", target_per_week: 2, cooldown: 2, icon: "🏗️" },
  // MONEY
  { id: "t_budget", cat: "money", label: "פעולה פיננסית", desc: "תקציב, תשלום, טפסים — צעד אחד קדימה", points: 10, difficulty: "medium", type: "dynamic", target_per_week: 2, cooldown: 2, icon: "💰" },
  { id: "t_no_waste", cat: "money", label: "יום ללא הוצאה מיותרת", desc: "כל שקל שחסכת הוא שקל שהרווחת", points: 5, difficulty: "easy", type: "routine", target_per_week: 5, cooldown: 0, icon: "🔒" },
  // MIND
  { id: "t_prayer", cat: "mind", label: "תפילה / כוונה בוקר", desc: "עצור לרגע. כוון את עצמך לפני שהיום מתחיל", points: 5, difficulty: "easy", type: "routine", target_per_week: 7, cooldown: 0, icon: "🙏" },
  { id: "t_meditate", cat: "mind", label: "מדיטציה / נשימות", desc: "10 דקות. להרגיע את הרעש", points: 5, difficulty: "easy", type: "routine", target_per_week: 6, cooldown: 0, icon: "🧘" },
  { id: "t_visualize", cat: "mind", label: "Visualization", desc: "10 דקות — ראה את הגרסה הכי חזקה שלך", points: 5, difficulty: "easy", type: "dynamic", target_per_week: 3, cooldown: 1, icon: "🌟" },
  { id: "t_win_log", cat: "mind", label: "תיעוד ניצחון יומי", desc: "שורה אחת ביומן — מה הצלחת היום", points: 5, difficulty: "easy", type: "routine", target_per_week: 7, cooldown: 0, icon: "📓" },
  { id: "t_emotion", cat: "mind", label: "עיבוד רגשי", desc: "קושי שמרגיש — תכתוב, תדבר, תעבד", points: 10, difficulty: "medium", type: "dynamic", target_per_week: 2, cooldown: 2, icon: "💬" },
  { id: "t_connect", cat: "mind", label: "שיחת גשר", desc: "שיחה משמעותית עם מישהו חשוב לך", points: 10, difficulty: "medium", type: "dynamic", target_per_week: 2, cooldown: 2, icon: "❤️" },
];

const CAT = {
  body: { label: "Alpha Fundamentals", color: "#f97316", icon: "💪", desired_week: 7 },
  focus: { label: "Iron Focus", color: "#3b82f6", icon: "⚙️", desired_week: 5 },
  money: { label: "Power Balance", color: "#22c55e", icon: "💰", desired_week: 3 },
  mind: { label: "Powerful Mind", color: "#a855f7", icon: "🧠", desired_week: 6 },
};

const STATUSES = [
  { name: "Newbie", min: 0, icon: "⚡", color: "#64748b", unlocks: "Daily Checklist + Tony" },
  { name: "Iron Apprentice", min: 200, icon: "🔩", color: "#94a3b8", unlocks: "Boss Meter" },
  { name: "Alpha Challenger", min: 400, icon: "🔥", color: "#f97316", unlocks: "Custom Rewards" },
  { name: "Legendary Builder", min: 700, icon: "🏗️", color: "#f59e0b", unlocks: "Weekly AI Review" },
  { name: "Cosmic Warrior", min: 1000, icon: "⚔️", color: "#3b82f6", unlocks: "AI Deep Insights" },
  { name: "Guardian of the Alpha Realm", min: 1500, icon: "🛡️", color: "#8b5cf6", unlocks: "Heroic Quests" },
  { name: "Iron Legend", min: 2000, icon: "👑", color: "#ec4899", unlocks: "Legend Mode" },
  { name: "Master of the Infinite Forge", min: 3000, icon: "🌌", color: "#06b6d4", unlocks: "???" },
];

const BOSS_THRESHOLD = 100;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function todayKey() { return new Date().toISOString().slice(0, 10); }
function daysAgo(dateStr) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}
function getStatus(pts) { let s = STATUSES[0]; for (const st of STATUSES) if (pts >= st.min) s = st; return s; }
function getNextStatus(pts) { for (const st of STATUSES) if (st.min > pts) return st; return null; }
function isFeatureUnlocked(pts, feature) {
  const gates = { boss: 200, rewards: 400, weekly: 700, insights: 1000 };
  return pts >= (gates[feature] || 0);
}

// ─── DAILY ENGINE ─────────────────────────────────────────────────────────────
function computeDailyTasks(profile, history, dayIndex) {
  const last7 = Object.entries(history).filter(([d]) => daysAgo(d) <= 7);
  const yesterday = Object.entries(history).find(([d]) => daysAgo(d) === 1);
  const yesterdayCount = yesterday?.[1]?.completedTasks?.length || 0;
  const isRecovery = yesterdayCount === 0 && Object.keys(history).length > 0;

  // Category done counts
  const catDone = { body: 0, focus: 0, money: 0, mind: 0 };
  last7.forEach(([, day]) => {
    (day.completedTasks || []).forEach(id => {
      const t = ALL_TASKS.find(t => t.id === id);
      if (t) catDone[t.cat] = (catDone[t.cat] || 0) + 1;
    });
  });

  // Task history
  const taskHistory = {};
  last7.forEach(([d, day]) => {
    (day.shownTasks || []).forEach(id => {
      if (!taskHistory[id]) taskHistory[id] = { shown: 0, done: 0, lastShown: null, lastDone: null };
      taskHistory[id].shown++;
      taskHistory[id].lastShown = d;
    });
    (day.completedTasks || []).forEach(id => {
      if (!taskHistory[id]) taskHistory[id] = { shown: 0, done: 0, lastShown: null, lastDone: null };
      taskHistory[id].done++;
      taskHistory[id].lastDone = d;
    });
  });

  // Build candidate pool
  const priorityCats = profile.priorityCats || ["mind", "focus", "body"];
  let pool = ALL_TASKS.filter(t => {
    const th = taskHistory[t.id] || { shown: 0, done: 0 };
    // Cooldown
    if (th.lastShown && daysAgo(th.lastShown) < t.cooldown) return false;
    // Weekly target met
    if (th.done >= t.target_per_week) return false;
    // Stalled (shown 3+ times, never done)
    if (th.shown >= 3 && th.done === 0) return false;
    // Recovery: only easy
    if (isRecovery && t.difficulty === "hard") return false;
    // Only priority cats
    if (!priorityCats.includes(t.cat)) return false;
    return true;
  });

  // Score each
  const scored = pool.map(t => {
    const th = taskHistory[t.id] || { shown: 0, done: 0 };
    const sr = th.shown > 0 ? th.done / th.shown : 0.5;
    const catGap = Math.max(0, (CAT[t.cat]?.desired_week || 5) - (catDone[t.cat] || 0));
    const daysSince = th.lastShown ? daysAgo(th.lastShown) : 5;
    const recency = daysSince >= 3 ? Math.min(daysSince - 2, 5) : daysSince === 1 ? -5 : 0;
    const perf = sr > 0.8 ? -2 : sr >= 0.3 ? 3 : -3;
    const perfBoost = isRecovery && t.difficulty === "easy" ? 3 : 0;
    const goalBoost = (profile.priorityCats || []).indexOf(t.cat) >= 0 ? (3 - (profile.priorityCats || []).indexOf(t.cat)) : 0;
    const diff = t.difficulty === "epic" ? 4 : t.difficulty === "hard" ? 3 : t.difficulty === "medium" ? 2 : 1;
    const score = 3 * catGap + recency + 2 * (perf + perfBoost) + 2 * goalBoost + diff;
    return { ...t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Select 3 with constraints
  const chosen = [];
  const usedCats = {};
  for (const t of scored) {
    if (chosen.length >= 3) break;
    const catCount = usedCats[t.cat] || 0;
    if (catCount >= 2) continue;
    if (chosen.length === 2 && chosen.every(c => c.cat === t.cat)) continue;
    chosen.push(t);
    usedCats[t.cat] = catCount + 1;
  }

  // Ensure at least 1 routine
  const hasRoutine = chosen.some(t => t.type === "routine");
  if (!hasRoutine && scored.find(t => t.type === "routine" && !chosen.find(c => c.id === t.id))) {
    const routine = scored.find(t => t.type === "routine" && !chosen.find(c => c.id === t.id));
    if (routine) chosen[chosen.length - 1] = routine;
  }

  return chosen.slice(0, 3);
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────
async function ensureAnonSession() {
  assertSupabaseConfigured();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data: existing } = await supabase.auth.getSession();
  if (existing?.session) return existing.session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

async function load() {
  try {
    const session = await ensureAnonSession();
    const userId = session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("users")
      .select("state")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.state ?? null;
  } catch {
    return null;
  }
}
async function save(d) {
  try {
    const session = await ensureAnonSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from("users")
      .upsert({ id: userId, state: d, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
  } catch {}
}

function initState() {
  return {
    onboarded: false,
    profile: { name: "", epicGoal: "", priorityCats: ["mind", "focus", "body"], habitAnchor: "", difficultyScale: 5 },
    totalPoints: 0, powerShards: 0, superStars: 0,
    bossAccum: 0,
    activeBoss: null, // { hp: 300, maxHp: 300, startDay: "...", deadline: "...", defeated: false }
    streaks: { current: 0, best: 0, lastActiveDay: null },
    history: {}, // { "date": { completedTasks, shownTasks, earnedPoints, note } }
    rewards: { 200: "", 400: "", 700: "", 1000: "" },
    dayIndex: 0,
    starkMsg: getStark("morning"),
  };
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: "", epicGoal: "", priorityCats: [], habitAnchor: "", intentionWhen: "", intentionWhere: "" });
  const [firstWin, setFirstWin] = useState(false);

  const steps = [
    {
      title: "ברוך הבא, גיבור.",
      sub: "המשחק הזה הופך את החיים שלך למסע עלייה. לפני שמתחילים — כמה שאלות. 90 שניות. תהיה ישיר.",
      field: "name", placeholder: "מה שמך?", type: "text", label: "שם"
    },
    {
      title: "מי הגיבור שאתה רוצה להיות?",
      sub: "לא מה לעשות. מי להיות. דוגמה: 'האדם שלא מפספס אימון, לא מזניח כסף, ולא מפסיק ללמוד.'",
      field: "epicGoal", placeholder: "תאר את הגרסה הכי חזקה שלך...", type: "textarea", label: "ה-Epic Goal"
    },
    {
      title: "איפה החזית הכי בוערת?",
      sub: "בחר עד 3 תחומים — הם יקבלו עדיפות במשימות היומיות שלך.",
      field: "priorityCats", type: "multiselect",
      options: [
        { id: "mind", label: "Powerful Mind", icon: "🧠", desc: "מיינדסט, מדיטציה, ויסות רגשי" },
        { id: "focus", label: "Iron Focus", icon: "⚙️", desc: "עסק, קריירה, Deep Work" },
        { id: "body", label: "Alpha Fundamentals", icon: "💪", desc: "כושר, תזונה, שגרות גוף" },
        { id: "money", label: "Power Balance", icon: "💰", desc: "פיננסים, תזרים, חיסכון" },
      ]
    },
    {
      title: "מהי המשימה שאינך מוכן לוותר עליה?",
      sub: "משימת הליבה שלך — זו שאם תעשה רק אותה, היום לא הפסיד. (למשל: 'אימון 30 דקות')",
      field: "habitAnchor", placeholder: "המשימה שאינך מוותר עליה...", type: "text", label: "Anchor Task"
    },
    {
      title: "Implementation Intention",
      sub: "מחקר מראה: מי שמגדיר 'מתי ואיפה' מבצע פי 2-3 יותר. שניות ספורות — תמלא.",
      type: "intention",
    },
  ];

  const cur = steps[step];
  const canNext = () => {
    if (cur.field === "name") return data.name.trim().length > 0;
    if (cur.field === "epicGoal") return data.epicGoal.trim().length > 0;
    if (cur.field === "priorityCats") return data.priorityCats.length >= 1;
    if (cur.field === "habitAnchor") return data.habitAnchor.trim().length > 0;
    if (cur.type === "intention") return data.intentionWhen.trim().length > 0;
    return true;
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else if (!firstWin) setFirstWin(true);
    else onComplete(data);
  };

  if (firstWin) {
    return (
      <div style={OS.root}>
        <div style={OS.card}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🥛</div>
          <div style={OS.title}>משימת First Win</div>
          <div style={OS.sub}>לפני שנמשיך — תעשה דבר אחד עכשיו.<br />שתה כוס מים. עמוד וישר. נשום 3 נשימות עמוקות.</div>
          <div style={OS.sub} className="mt-4">60 שניות. זה הכל. זו ההוכחה שאתה מסוגל לבצע.</div>
          <button onClick={() => onComplete(data)} style={OS.btn}>✓ ביצעתי — מתחיל את המשחק</button>
        </div>
      </div>
    );
  }

  return (
    <div style={OS.root}>
      <div style={OS.card}>
        <div style={OS.progress}>
          {steps.map((_, i) => <div key={i} style={{ ...OS.dot, background: i <= step ? "#f97316" : "#1e293b" }} />)}
        </div>
        <div style={OS.title}>{cur.title}</div>
        <div style={OS.sub}>{cur.sub}</div>

        {cur.type === "text" && (
          <input value={data[cur.field]} onChange={e => setData({ ...data, [cur.field]: e.target.value })}
            placeholder={cur.placeholder} style={OS.input} autoFocus />
        )}
        {cur.type === "textarea" && (
          <textarea value={data[cur.field]} onChange={e => setData({ ...data, [cur.field]: e.target.value })}
            placeholder={cur.placeholder} style={{ ...OS.input, height: 90, resize: "vertical" }} autoFocus />
        )}
        {cur.type === "multiselect" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {cur.options.map(opt => {
              const sel = data.priorityCats.includes(opt.id);
              return (
                <button key={opt.id} onClick={() => {
                  const cur2 = data.priorityCats;
                  if (sel) setData({ ...data, priorityCats: cur2.filter(x => x !== opt.id) });
                  else if (cur2.length < 3) setData({ ...data, priorityCats: [...cur2, opt.id] });
                }} style={{ ...OS.optBtn, borderColor: sel ? "#f97316" : "#1e293b", background: sel ? "rgba(249,115,22,0.1)" : "#06061a" }}>
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: sel ? "#f97316" : "#e2e8f0", fontSize: 14 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{opt.desc}</div>
                  </div>
                  {sel && <span style={{ color: "#f97316" }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}
        {cur.type === "intention" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <input value={data.intentionWhen} onChange={e => setData({ ...data, intentionWhen: e.target.value })}
              placeholder="מתי תבצע את Anchor Task שלך? (למשל: 7:30 בבוקר)" style={OS.input} autoFocus />
            <input value={data.intentionWhere} onChange={e => setData({ ...data, intentionWhere: e.target.value })}
              placeholder="איפה? (למשל: חדר כושר / בית)" style={OS.input} />
          </div>
        )}

        <button onClick={next} disabled={!canNext()} style={{ ...OS.btn, opacity: canNext() ? 1 : 0.4 }}>
          {step < steps.length - 1 ? "הבא ←" : "לסיכום →"}
        </button>
        {step > 0 && <button onClick={() => setStep(step - 1)} style={OS.back}>← חזור</button>}
      </div>
    </div>
  );
}

const OS = {
  root: { background: "#04040e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Segoe UI', sans-serif", direction: "rtl" },
  card: { background: "#06061a", border: "1px solid #1e293b", borderRadius: 20, padding: 28, maxWidth: 440, width: "100%" },
  progress: { display: "flex", gap: 6, marginBottom: 24, justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: "50%", transition: "background 0.3s" },
  title: { fontSize: 20, fontWeight: 900, color: "#f1f5f9", marginBottom: 10, lineHeight: 1.3 },
  sub: { fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.6 },
  input: { width: "100%", background: "#04040e", border: "1px solid #1e293b", borderRadius: 10, color: "#e2e8f0", padding: "12px 14px", fontSize: 14, fontFamily: "inherit", outline: "none", direction: "rtl", boxSizing: "border-box", marginBottom: 4 },
  optBtn: { width: "100%", display: "flex", alignItems: "center", gap: 12, border: "1px solid", borderRadius: 12, padding: "12px 14px", cursor: "pointer", textAlign: "right", fontFamily: "inherit", transition: "all 0.2s" },
  btn: { width: "100%", background: "linear-gradient(135deg, #f97316, #ea580c)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 900, fontSize: 15, padding: "14px", cursor: "pointer", fontFamily: "inherit", marginTop: 20, letterSpacing: 0.5 },
  back: { width: "100%", background: "transparent", border: "none", color: "#475569", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 8, padding: "6px 0" },
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function AscensionV3() {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("today");
  const [todayDone, setTodayDone] = useState({});
  const [todayTasks, setTodayTasks] = useState([]);
  const [popup, setPopup] = useState(null);
  const [bossAlert, setBossAlert] = useState(false);
  const [levelAlert, setLevelAlert] = useState(null);
  const [winNote, setWinNote] = useState("");
  const [editReward, setEditReward] = useState(null);
  const [rewardInput, setRewardInput] = useState("");

  useEffect(() => {
    load().then(saved => {
      const s = saved || initState();
      setState(s);
      if (s.onboarded) {
        const key = todayKey();
        const done = s.history?.[key]?.completedTasks || [];
        const map = {}; done.forEach(id => map[id] = true);
        setTodayDone(map);
        setWinNote(s.history?.[key]?.note || "");
        // Build today tasks
        const shown = s.history?.[key]?.shownTasks;
        if (shown?.length) {
          setTodayTasks(ALL_TASKS.filter(t => shown.includes(t.id)));
        } else {
          const tasks = computeDailyTasks(s.profile, s.history || {}, s.dayIndex || 0);
          setTodayTasks(tasks);
        }
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((s) => { setState(s); save(s); }, []);

  const showPopup = (msg, dur = 2000) => { setPopup(msg); setTimeout(() => setPopup(null), dur); };

  const handleOnboard = (profile) => {
    const tasks = computeDailyTasks({ priorityCats: profile.priorityCats || ["mind","focus","body"] }, {}, 0);
    const key = todayKey();
    const newState = {
      ...initState(),
      onboarded: true,
      profile: { ...profile },
      dayIndex: 1,
      starkMsg: `שלום ${profile.name}. Rise and shine. The world isn't going to disrupt itself.`,
      history: { [key]: { completedTasks: [], shownTasks: tasks.map(t => t.id), earnedPoints: 0, note: "" } },
    };
    setTodayTasks(tasks);
    persist(newState);
  };

  const toggleTask = (task) => {
    if (!state) return;
    const key = todayKey();
    const done = !!todayDone[task.id];
    const newDone = { ...todayDone };
    const prevDay = state.history?.[key] || { completedTasks: [], shownTasks: todayTasks.map(t => t.id), earnedPoints: 0, note: winNote };
    let total = state.totalPoints, boss = state.bossAccum, shards = state.powerShards, stars = state.superStars;

    if (done) {
      delete newDone[task.id];
      total -= task.points;
      boss = Math.max(0, boss - task.points);
    } else {
      newDone[task.id] = true;
      total += task.points;
      boss += task.points;

      let bossTriggered = false;
      while (boss >= BOSS_THRESHOLD) {
        boss -= BOSS_THRESHOLD;
        bossTriggered = true;
        total += 50; shards += 1;
        if (Math.random() < 0.25) stars += 1;
      }
      if (bossTriggered) { setTimeout(() => setBossAlert(true), 200); setTimeout(() => setBossAlert(false), 3800); }
      else showPopup(`+${task.points} ⚡`);

      // Level up check
      const oldStatus = getStatus(state.totalPoints);
      const newStatus = getStatus(total);
      if (newStatus.name !== oldStatus.name) {
        setTimeout(() => { setLevelAlert(newStatus); setTimeout(() => setLevelAlert(null), 4000); }, 300);
      }
    }

    const earnedPoints = Object.keys({ ...newDone }).reduce((acc, id) => {
      const t = ALL_TASKS.find(t => t.id === id); return acc + (t?.points || 0);
    }, 0);

    const newState = {
      ...state, totalPoints: total, bossAccum: boss, powerShards: shards, superStars: stars,
      history: { ...(state.history || {}), [key]: { ...prevDay, completedTasks: Object.keys(newDone).filter(k => newDone[k]), earnedPoints } },
    };
    setTodayDone(newDone);
    persist(newState);
  };

  const saveNote = () => {
    if (!state) return;
    const key = todayKey();
    const prev = state.history?.[key] || { completedTasks: [], shownTasks: [], earnedPoints: 0 };
    persist({ ...state, history: { ...(state.history || {}), [key]: { ...prev, note: winNote } } });
    showPopup("🏆 ניצחון נשמר");
  };

  const saveReward = () => {
    if (!state || !editReward) return;
    persist({ ...state, rewards: { ...(state.rewards || {}), [editReward]: rewardInput } });
    setEditReward(null); setRewardInput(""); showPopup("🎁 פרס נשמר");
  };

  if (!loaded) return <div style={{ background: "#04040e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#f97316", fontFamily: "monospace", letterSpacing: 3 }}>INITIALIZING...</div></div>;
  if (!state?.onboarded) return <Onboarding onComplete={handleOnboard} />;

  const status = getStatus(state.totalPoints);
  const nextStatus = getNextStatus(state.totalPoints);
  const lvlPct = nextStatus ? ((state.totalPoints - status.min) / (nextStatus.min - status.min)) * 100 : 100;
  const bossPct = isFeatureUnlocked(state.totalPoints, "boss") ? (state.bossAccum / BOSS_THRESHOLD) * 100 : 0;
  const todayPts = state.history?.[todayKey()]?.earnedPoints || 0;
  const yesterday = Object.entries(state.history || {}).find(([d]) => daysAgo(d) === 1);
  const yesterdayCount = yesterday?.[1]?.completedTasks?.length || 0;
  const isRecovery = yesterdayCount === 0 && Object.keys(state.history || {}).length > 1;

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* BOSS ALERT */}
      {bossAlert && <div style={S.overlay}><div style={S.bossBox} className="bossIn"><div style={{ fontSize: 52 }}>⚔️</div><div style={S.bossTitle}>BOSS DEFEATED</div><div style={S.bossSub}>+50 ⚡ · Power Shard ×1</div><div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>{getStark("boss_win")}</div></div></div>}

      {/* LEVEL UP */}
      {levelAlert && <div style={S.overlay}><div style={{ ...S.bossBox, borderColor: levelAlert.color }} className="bossIn"><div style={{ fontSize: 52 }}>{levelAlert.icon}</div><div style={{ ...S.bossTitle, color: levelAlert.color }}>LEVEL UP</div><div style={S.bossSub}>{levelAlert.name}</div><div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Unlocks: {levelAlert.unlocks}</div></div></div>}

      {/* POPUP */}
      {popup && <div style={S.popup}>{popup}</div>}

      {/* HEADER */}
      <div style={S.header}>
        <div style={S.logo}><span style={{ color: "#f97316" }}>ASCENSION</span></div>
        <div style={S.chips}>
          <div style={S.chip}><span>⚡</span><b>{state.totalPoints}</b></div>
          {isFeatureUnlocked(state.totalPoints, "boss") && <div style={S.chip}><span style={{ color: "#a855f7" }}>🔮</span><b style={{ color: "#a855f7" }}>{state.powerShards}</b></div>}
          <div style={S.chip}><span>⭐</span><b style={{ color: "#fbbf24" }}>{state.superStars}</b></div>
        </div>
      </div>

      {/* TONY STARK MESSAGE */}
      <div style={S.starkBar}>
        <div style={{ fontSize: 18, flexShrink: 0 }}>🤖</div>
        <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", flex: 1 }}>
          {isRecovery ? getStark("recovery") : state.starkMsg}
        </div>
      </div>

      {/* STATUS CARD */}
      <div style={S.statusCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 36 }}>{status.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#334155", letterSpacing: 2, textTransform: "uppercase" }}>Status</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: status.color }}>{status.name}</div>
            {nextStatus && <div style={{ fontSize: 11, color: "#334155" }}>→ {nextStatus.name} · עוד {nextStatus.min - state.totalPoints}</div>}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#334155" }}>היום</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>+{todayPts}</div>
          </div>
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155", marginBottom: 3 }}><span>Level</span><span>{Math.round(lvlPct)}%</span></div>
          <div style={S.bar}><div style={{ ...S.barFill, width: `${lvlPct}%`, background: `linear-gradient(90deg, ${status.color}, #fbbf24)` }} /></div>
        </div>
        {isFeatureUnlocked(state.totalPoints, "boss") && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155", marginBottom: 3 }}><span>⚔️ Boss Meter</span><span>{state.bossAccum}/{BOSS_THRESHOLD}</span></div>
            <div style={S.bar}><div style={{ ...S.barFill, width: `${bossPct}%`, background: "linear-gradient(90deg, #dc2626, #f97316)" }} /></div>
          </div>
        )}
        {!isFeatureUnlocked(state.totalPoints, "boss") && (
          <div style={{ fontSize: 11, color: "#1e3a5f", padding: "6px 10px", background: "#04040e", borderRadius: 8, marginTop: 4 }}>
            🔒 Boss Meter נפתח ב-200 נקודות · עוד {200 - state.totalPoints}
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={S.tabs}>
        {[["today", "משימות"], ["log", "היסטוריה"], ["rewards", "פרסים"], ["ranks", "דרגות"]].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...S.tab, ...(tab === id ? S.tabOn : {}) }}>{lbl}</button>
        ))}
      </div>

      <div style={S.body}>

        {/* TODAY */}
        {tab === "today" && (
          <div>
            {isRecovery && (
              <div style={S.recoveryBanner}>
                <span style={{ fontSize: 16 }}>🔄</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Recovery Mode — משימות קלות היום. מחר חוזרים חזק.</span>
              </div>
            )}

            <div style={{ fontSize: 11, color: "#334155", marginBottom: 12, textAlign: "center", letterSpacing: 1 }}>
              3 FOCUS QUESTS — {todayKey()}
            </div>

            {todayTasks.map(task => {
              const done = !!todayDone[task.id];
              const meta = CAT[task.cat];
              return (
                <button key={task.id} onClick={() => toggleTask(task)} style={{
                  ...S.taskBtn,
                  borderColor: done ? meta.color + "66" : "#0f172a",
                  background: done ? meta.color + "0a" : "#06061a",
                  boxShadow: done ? `0 0 16px ${meta.color}22` : "none",
                }}>
                  <div style={{ ...S.check, background: done ? meta.color : "transparent", borderColor: done ? meta.color : "#1e293b" }}>
                    {done && <span style={{ fontSize: 9, color: "#000", fontWeight: 900 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: done ? "#475569" : "#f1f5f9", textDecoration: done ? "line-through" : "none" }}>
                      {task.icon} {task.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>{task.desc}</div>
                    <div style={{ fontSize: 10, color: meta.color, marginTop: 3 }}>{meta.label} · {task.type === "routine" ? "שגרה" : "דינמי"}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: done ? meta.color : "#1e3a5f", minWidth: 32, textAlign: "left" }}>
                    +{task.points}
                  </div>
                </button>
              );
            })}

            {todayTasks.length < 3 && (
              <div style={{ color: "#334155", fontSize: 12, textAlign: "center", padding: 16 }}>
                אין מספיק משימות זמינות — הרחב קטגוריות בפרופיל
              </div>
            )}

            {/* WIN NOTE */}
            <div style={S.noteCard}>
              <div style={{ fontSize: 12, color: "#f97316", fontWeight: 800, marginBottom: 8 }}>🏆 ניצחון יומי</div>
              <textarea value={winNote} onChange={e => setWinNote(e.target.value)}
                placeholder="מה הניצחון הכי גדול של היום שלך?" style={S.textarea} rows={2} />
              <button onClick={saveNote} style={S.saveBtn}>שמור</button>
            </div>
          </div>
        )}

        {/* LOG */}
        {tab === "log" && (
          <div>
            {Object.entries(state.history || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30).map(([date, entry]) => (
              <div key={date} style={S.logDay}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#f97316", fontWeight: 700, fontSize: 13 }}>{date}</span>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>+{entry.earnedPoints} ⚡</span>
                </div>
                {entry.note && <div style={S.logNote}>🏆 {entry.note}</div>}
                <div style={{ marginTop: 6 }}>
                  {(entry.completedTasks || []).map(id => {
                    const t = ALL_TASKS.find(t => t.id === id);
                    return t ? <div key={id} style={{ fontSize: 11, color: "#475569", padding: "2px 0" }}>{t.icon} {t.label} <span style={{ color: "#22c55e" }}>+{t.points}</span></div> : null;
                  })}
                </div>
              </div>
            ))}
            {Object.keys(state.history || {}).length === 0 && <div style={{ color: "#334155", textAlign: "center", padding: 40 }}>אין היסטוריה עדיין</div>}
          </div>
        )}

        {/* REWARDS */}
        {tab === "rewards" && (
          <div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 16, lineHeight: 1.6 }}>
              הגדר פרס לכל דרגה. כשתגיע — תממש. כשתממש — תתעד. החוזה עם עצמך הוא הכלי הכי חזק שיש לך.
            </div>
            {STATUSES.filter(s => s.min > 0).map(st => {
              const reached = state.totalPoints >= st.min;
              const locked = !reached && state.totalPoints < st.min - 200;
              const reward = state.rewards?.[st.min];
              return (
                <div key={st.min} style={{ ...S.rewardRow, borderColor: reached ? st.color + "55" : "#0a0a1a", background: reached ? st.color + "08" : "transparent", opacity: locked ? 0.4 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{st.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: reached ? st.color : "#334155" }}>{st.name}</div>
                      <div style={{ fontSize: 11, color: "#334155" }}>{st.min} ⚡</div>
                    </div>
                    {reached && <span style={{ fontSize: 11, color: st.color }}>✓ הגעת</span>}
                  </div>
                  {editReward === st.min ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={rewardInput} onChange={e => setRewardInput(e.target.value)} placeholder="מה הפרס?" style={{ ...S.textarea, height: "auto", padding: "8px 12px", flex: 1 }} autoFocus />
                      <button onClick={saveReward} style={{ ...S.saveBtn, width: "auto", padding: "8px 16px", marginTop: 0 }}>שמור</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, color: reward ? "#e2e8f0" : "#334155", fontStyle: reward ? "normal" : "italic" }}>
                        🎁 {reward || "לא הוגדר עדיין"}
                      </div>
                      <button onClick={() => { setEditReward(st.min); setRewardInput(reward || ""); }} style={S.editBtn}>ערוך</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* RANKS */}
        {tab === "ranks" && (
          <div>
            {STATUSES.map(st => {
              const isNow = st.name === status.name;
              const passed = state.totalPoints >= st.min;
              return (
                <div key={st.name} style={{ ...S.rankRow, borderColor: isNow ? st.color : passed ? "#1e293b" : "#0a0a1a", background: isNow ? st.color + "10" : "transparent" }}>
                  <div style={{ fontSize: 26 }}>{st.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: isNow ? st.color : passed ? "#94a3b8" : "#334155" }}>{st.name}</div>
                    <div style={{ fontSize: 11, color: "#334155" }}>{st.min} ⚡ · {st.unlocks}</div>
                  </div>
                  {isNow && <span style={{ fontSize: 11, color: st.color, fontWeight: 700 }}>← כאן</span>}
                  {passed && !isNow && <span>✅</span>}
                  {!passed && !isNow && <span style={{ fontSize: 11, color: "#1e293b" }}>🔒</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  root: { background: "#04040e", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", direction: "rtl", color: "#e2e8f0", maxWidth: 480, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #0a0a1a", position: "sticky", top: 0, background: "rgba(4,4,14,0.97)", zIndex: 20 },
  logo: { fontFamily: "monospace", fontSize: 18, fontWeight: 900, letterSpacing: 3 },
  chips: { display: "flex", gap: 6 },
  chip: { background: "#080818", border: "1px solid #0f172a", borderRadius: 8, padding: "3px 10px", display: "flex", gap: 5, alignItems: "center", fontSize: 13 },
  starkBar: { display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 18px", background: "#06061a", borderBottom: "1px solid #0a0a1a" },
  statusCard: { margin: "14px 16px", background: "#06061a", border: "1px solid #0f172a", borderRadius: 16, padding: "16px 18px" },
  bar: { height: 5, background: "#0a0a1a", borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99, transition: "width 0.5s ease" },
  tabs: { display: "flex", margin: "0 16px 14px", background: "#06061a", borderRadius: 12, padding: 4, gap: 3 },
  tab: { flex: 1, background: "transparent", border: "none", color: "#334155", padding: "7px 0", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  tabOn: { background: "#0a0a1a", color: "#f97316" },
  body: { padding: "0 16px 40px" },
  recoveryBanner: { display: "flex", gap: 10, alignItems: "center", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: "10px 14px", marginBottom: 14 },
  taskBtn: { width: "100%", display: "flex", alignItems: "flex-start", gap: 10, border: "1px solid", borderRadius: 12, padding: "14px", marginBottom: 10, cursor: "pointer", transition: "all 0.2s", textAlign: "right", fontFamily: "inherit" },
  check: { width: 22, height: 22, borderRadius: 7, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, transition: "all 0.2s" },
  noteCard: { background: "#06061a", border: "1px solid #0f172a", borderRadius: 14, padding: 14, marginTop: 8 },
  textarea: { width: "100%", background: "#04040e", border: "1px solid #0f172a", borderRadius: 10, color: "#e2e8f0", padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", direction: "rtl", boxSizing: "border-box" },
  saveBtn: { marginTop: 8, background: "linear-gradient(135deg, #f97316, #ea580c)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 20px", cursor: "pointer", fontFamily: "inherit", width: "100%" },
  logDay: { background: "#06061a", border: "1px solid #0a0a1a", borderRadius: 12, padding: 14, marginBottom: 10 },
  logNote: { fontSize: 12, color: "#94a3b8", padding: "6px 10px", background: "#04040e", borderRadius: 6, borderRight: "2px solid #f97316" },
  rewardRow: { border: "1px solid", borderRadius: 14, padding: 14, marginBottom: 10, transition: "all 0.2s" },
  editBtn: { background: "#0f172a", border: "none", color: "#475569", borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  rankRow: { display: "flex", alignItems: "center", gap: 14, border: "1px solid", borderRadius: 12, padding: "12px 16px", marginBottom: 8 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  bossBox: { background: "#0a0400", border: "2px solid #f97316", borderRadius: 20, padding: "40px 56px", textAlign: "center", boxShadow: "0 0 80px rgba(249,115,22,0.4)" },
  bossTitle: { fontSize: 22, fontWeight: 900, color: "#f97316", letterSpacing: 3, marginTop: 8 },
  bossSub: { fontSize: 13, color: "#fbbf24", marginTop: 6 },
  popup: { position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", background: "#f97316", color: "#000", fontWeight: 900, fontSize: 16, borderRadius: 12, padding: "8px 24px", zIndex: 200, pointerEvents: "none", fontFamily: "monospace" },
};

const CSS = `
  @keyframes bossIn { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .bossIn { animation: bossIn 0.4s ease; }
  * { box-sizing: border-box; }
  button:active { opacity: 0.7; }
  textarea:focus, input:focus { border-color: #f97316 !important; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: #04040e; }
  ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
`;
