import { supabase } from "./supabaseClient";

export async function signInWithGoogle() {
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // CRA runs on 3000 by default; Supabase should allow this redirect URL.
      redirectTo: window.location.origin,
    },
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
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

async function saveUserGameDataNow(userId, gameData) {
  const { error } = await supabase
    .from("users")
    .upsert(
      {
        id: userId,
        game_data: gameData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) throw error;
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

