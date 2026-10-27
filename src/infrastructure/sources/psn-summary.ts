import { PsnAuthError, type PsnSummary, type TrophyGrade } from '@/domain/psn';

import { type FetchFn, timedJson } from './psn-token';

const API = 'https://m.np.playstation.com/api/trophy/v1';

interface TitleInfo {
  npServiceName?: string;
  npCommunicationId: string;
  trophyTitleName: string;
  trophyTitlePlatform?: string;
  progress: number;
  earnedTrophies?: Partial<PsnSummary['counts']>;
}

interface EarnedTrophy {
  trophyId: number;
  earned?: boolean;
  earnedDateTime?: string;
  trophyEarnedRate?: string;
}

interface TitleTrophy {
  trophyId: number;
  trophyType: TrophyGrade;
  trophyName: string;
}

async function getJson<T>(url: string, token: string, fetchFn: FetchFn): Promise<T> {
  const res = await timedJson(fetchFn, url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new PsnAuthError();
  if (!res.ok) throw new Error('psn-unavailable');
  return res.data as T;
}

const serviceOf = (t: TitleInfo): string =>
  t.npServiceName ?? (t.trophyTitlePlatform?.includes('PS5') ? 'trophy2' : 'trophy');

function pickLast(
  title: TitleInfo,
  earned: EarnedTrophy[],
  catalog: TitleTrophy[],
): PsnSummary['last'] {
  const latest = earned
    .filter((t) => t.earned && t.earnedDateTime)
    .sort((a, b) => Date.parse(b.earnedDateTime ?? '') - Date.parse(a.earnedDateTime ?? ''))[0];
  const info = catalog.find((t) => t.trophyId === latest?.trophyId);
  if (!latest || !info) return null;
  return {
    name: info.trophyName,
    game: title.trophyTitleName,
    grade: info.trophyType,
    rarity: Number(latest.trophyEarnedRate ?? 0),
  };
}

const earnedTotal = (t: TitleInfo): number =>
  Object.values(t.earnedTrophies ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);

export async function buildSummary(token: string, fetchFn: FetchFn): Promise<PsnSummary> {
  const [summary, titles] = await Promise.all([
    getJson<{ trophyLevel: number; earnedTrophies: PsnSummary['counts'] }>(
      `${API}/users/me/trophySummary`,
      token,
      fetchFn,
    ),
    getJson<{ trophyTitles: TitleInfo[] }>(`${API}/users/me/trophyTitles?limit=10`, token, fetchFn),
  ]);
  const level = summary.trophyLevel;
  const counts = summary.earnedTrophies;
  const title = titles.trophyTitles.find((t) => earnedTotal(t) > 0);
  if (!title) return { level, counts, last: null, progress: null, deals: [] };
  const path = `npCommunicationIds/${title.npCommunicationId}/trophyGroups/all/trophies`;
  const query = `?npServiceName=${serviceOf(title)}`;
  const [earned, catalog] = await Promise.all([
    getJson<{ trophies: EarnedTrophy[] }>(`${API}/users/me/${path}${query}`, token, fetchFn),
    getJson<{ trophies: TitleTrophy[] }>(`${API}/${path}${query}`, token, fetchFn),
  ]);
  return {
    level,
    counts,
    last: pickLast(title, earned.trophies, catalog.trophies),
    progress: { game: title.trophyTitleName, pct: title.progress },
    deals: [],
  };
}
