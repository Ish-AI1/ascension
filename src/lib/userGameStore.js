import { supabase } from "./supabaseClient";

export async function signInWithGoogle() {
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
}

export async function loadUserGameData(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("game_data")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.game_data ?? null;
}

function buildUsersUpsertPayload({
  userId,
  gameData,
  email = undefined,
  displayName = undefined,
  streakData = undefined,
}) {
  const payload = {
    id: userId,
    updated_at: new Date().toISOString(),
    game_data: gameData,
  };

  // Only include optional columns when we have a value.
  // This avoids 400s if DB columns are NOT NULL (common for email/name),
  // and keeps the write minimal for anonymous sessions.
  if (email != null && email !== "") payload.user_email = email;
  if (displayName != null && displayName !== "") payload.display_name = displayName;
  if (streakData != null) payload.streak_data = streakData;

  return payload;
}

function throwUpsertError(error, payload) {
  console.log("[userGameStore] Supabase upsert error:", {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    fullError: error,
  });

  const e = new Error(
    [
      "Supabase upsert to public.users failed.",
      error?.message,
      error?.details,
      error?.hint,
      error?.code ? `code=${error.code}` : null,
      `payload=${JSON.stringify(payload)}`,
    ]
      .filter(Boolean)
      .join(" ")
  );
  e.cause = error;
  throw e;
}

async function upsertUsersRow(payload) {
  console.log("[userGameStore] Upserting users row with payload:", payload);
  const { error } = await supabase.from("users").upsert(payload, { onConflict: "id" });
  if (error) throwUpsertError(error, payload);
}

async function saveUserGameDataNow(userId, gameData) {
  const payload = buildUsersUpsertPayload({ userId, gameData });
  await upsertUsersRow(payload);
}

let saveTimer = null;
let inflight = null;

export function scheduleSaveUserGameData(userId, gameData, delayMs = 600) {
  if (!userId) return;

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    // Keep last write; if a save is in flight, chain after it.
    const run = async () => {
      await saveUserGameDataNow(userId, gameData);
    };
    inflight = (inflight || Promise.resolve()).then(run).catch(() => {});
  }, delayMs);
}

const FORCE_WELCOME_KEY = "ascension_force_welcome";

async function ensureSession() {
  const { data: existing } = await supabase.auth.getSession();
  if (existing?.session) return existing.session;

  // If the user explicitly signed out, don't auto-create an anonymous session.
  // The app should show the welcome screen until the user chooses how to continue.
  try {
    if (localStorage.getItem(FORCE_WELCOME_KEY) === "1") return null;
  } catch {}

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

export async function load() {
  try {
    const session = await ensureSession();
    const userId = session?.user?.id;
    if (!userId) return null;
    return await loadUserGameData(userId);
  } catch {
    return null;
  }
}

async function saveNow(userId, state) {
  const user = (await supabase.auth.getUser())?.data?.user ?? null;
  const email = user?.email ?? null;
  const displayName = state?.profile?.name ?? user?.user_metadata?.full_name ?? null;

  const payload = buildUsersUpsertPayload({
    userId,
    gameData: state,
    email,
    displayName,
    streakData: state?.streaks ?? null,
  });

  await upsertUsersRow(payload);
}

export async function save(state, delayMs = 600) {
  try {
    const session = await ensureSession();
    const userId = session?.user?.id;
    if (!userId) return;

    if (delayMs <= 0) {
      await saveNow(userId, state);
      return;
    }

    scheduleSaveUserGameData(userId, state, delayMs);
  } catch {}
}

