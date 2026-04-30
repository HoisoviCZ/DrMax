import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const LEADERBOARD_LIMIT = 20;
export const isLeaderboardEnabled = Boolean(URL && KEY);

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

export async function fetchTopScores(limit: number = LEADERBOARD_LIMIT): Promise<ScoreEntry[]> {
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

export async function submitScore(
  initials: string,
  score: number,
  level: number,
): Promise<ScoreEntry | null> {
  const client = getClient();
  if (!client) return null;
  const cleaned = initials.toUpperCase().replace(/[^A-Z]/g, '').padEnd(3, 'A').slice(0, 3);
  const { data, error } = await client
    .from('scores')
    .insert({ initials: cleaned, score, level })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function qualifiesForTop(score: number, leaderboard: ScoreEntry[]): boolean {
  if (score <= 0) return false;
  if (leaderboard.length < LEADERBOARD_LIMIT) return true;
  const lowest = leaderboard[leaderboard.length - 1]?.score ?? 0;
  return score > lowest;
}
