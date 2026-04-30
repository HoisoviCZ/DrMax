import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const LEADERBOARD_LIMIT = 20;

export type LeaderboardMode = 'supabase' | 'local';

const LOCAL_STORAGE_KEY = 'drmax-leaderboard-v1';

export const leaderboardMode: LeaderboardMode = URL && KEY ? 'supabase' : 'local';
/** Always true now: leaderboard works either online (Supabase) or offline (localStorage). */
export const isLeaderboardEnabled = true;

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  if (!URL || !KEY) return null;
  _client = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export interface ScoreEntry {
  id: number;
  initials: string;
  score: number;
  level: number;
  created_at: string;
}

function cleanInitials(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').padEnd(3, 'A').slice(0, 3);
}

// ─── localStorage provider ────────────────────────────────────────────────

function readLocal(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScoreEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeLocal(entries: ScoreEntry[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
}

async function fetchLocal(limit: number): Promise<ScoreEntry[]> {
  return readLocal()
    .slice()
    .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at))
    .slice(0, limit);
}

async function submitLocal(initials: string, score: number, level: number): Promise<ScoreEntry> {
  const entry: ScoreEntry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    initials: cleanInitials(initials),
    score,
    level,
    created_at: new Date().toISOString(),
  };
  const next = [...readLocal(), entry]
    .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at))
    .slice(0, LEADERBOARD_LIMIT);
  writeLocal(next);
  return entry;
}

// ─── Supabase provider ────────────────────────────────────────────────────

async function fetchSupabase(limit: number): Promise<ScoreEntry[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client
    .from('scores')
    .select('id, initials, score, level, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

async function submitSupabase(
  initials: string,
  score: number,
  level: number,
): Promise<ScoreEntry | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client
    .from('scores')
    .insert({ initials: cleanInitials(initials), score, level })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Public API (dispatches by mode) ──────────────────────────────────────

export async function fetchTopScores(limit: number = LEADERBOARD_LIMIT): Promise<ScoreEntry[]> {
  return leaderboardMode === 'supabase' ? fetchSupabase(limit) : fetchLocal(limit);
}

export async function submitScore(
  initials: string,
  score: number,
  level: number,
): Promise<ScoreEntry | null> {
  return leaderboardMode === 'supabase'
    ? submitSupabase(initials, score, level)
    : submitLocal(initials, score, level);
}

export function qualifiesForTop(score: number, leaderboard: ScoreEntry[]): boolean {
  if (score <= 0) return false;
  if (leaderboard.length < LEADERBOARD_LIMIT) return true;
  const lowest = leaderboard[leaderboard.length - 1]?.score ?? 0;
  return score > lowest;
}
