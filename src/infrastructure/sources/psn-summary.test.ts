import { describe, expect, it, vi } from 'vitest';

import { PsnAuthError } from '@/domain/psn';

import { buildSummary } from './psn-summary';

const API = 'https://m.np.playstation.com/api/trophy/v1';
const TOKEN = 'fake-access';

const fixtures: Record<string, unknown> = {
  [`${API}/users/me/trophySummary`]: {
    trophyLevel: 347,
    earnedTrophies: { platinum: 12, gold: 98, silver: 311, bronze: 1204 },
  },
  [`${API}/users/me/trophyTitles?limit=10`]: {
    trophyTitles: [
      {
        npServiceName: 'trophy',
        npCommunicationId: 'NPWR00000_00',
        trophyTitleName: 'Jogo Zerado',
        trophyTitlePlatform: 'PS5',
        progress: 0,
        earnedTrophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 },
      },
      {
        earnedTrophies: { platinum: 0, gold: 1, silver: 0, bronze: 1 },
        npServiceName: 'trophy',
        npCommunicationId: 'NPWR00001_00',
        trophyTitleName: 'Jogo Falso',
        trophyTitlePlatform: 'PS4',
        progress: 78,
      },
    ],
  },
  [`${API}/users/me/npCommunicationIds/NPWR00001_00/trophyGroups/all/trophies?npServiceName=trophy`]:
    {
      trophies: [
        {
          trophyId: 0,
          earned: true,
          earnedDateTime: '2026-10-01T10:00:00Z',
          trophyEarnedRate: '30.2',
        },
        {
          trophyId: 1,
          earned: true,
          earnedDateTime: '2026-10-20T10:00:00Z',
          trophyEarnedRate: '4.1',
        },
        { trophyId: 2, earned: false, trophyEarnedRate: '1.0' },
      ],
    },
  [`${API}/npCommunicationIds/NPWR00001_00/trophyGroups/all/trophies?npServiceName=trophy`]: {
    trophies: [
      { trophyId: 0, trophyType: 'bronze', trophyName: 'Primeiro' },
      { trophyId: 1, trophyType: 'gold', trophyName: 'Troféu Raro' },
      { trophyId: 2, trophyType: 'platinum', trophyName: 'Platina' },
    ],
  },
};

function fakeFetch(overrides: Record<string, unknown> = {}) {
  const table = { ...fixtures, ...overrides };
  return vi.fn(async (url: string, init?: RequestInit) => {
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    return table[url] === undefined
      ? new Response('nf', { status: 404 })
      : Response.json(table[url]);
  });
}

describe('buildSummary', () => {
  it('toda chamada à Sony leva um AbortSignal de timeout', async () => {
    const fetchFn = fakeFetch();
    await buildSummary(TOKEN, fetchFn);
    expect(fetchFn.mock.calls.length).toBeGreaterThan(0);
    for (const [, init] of fetchFn.mock.calls) expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('monta contagens, último troféu e progresso', async () => {
    const summary = await buildSummary(TOKEN, fakeFetch());
    expect(summary.level).toBe(347);
    expect(summary.counts).toEqual({ platinum: 12, gold: 98, silver: 311, bronze: 1204 });
    expect(summary.last).toEqual({
      name: 'Troféu Raro',
      game: 'Jogo Falso',
      grade: 'gold',
      rarity: 4.1,
    });
    expect(summary.progress).toEqual({ game: 'Jogo Falso', pct: 78 });
    expect(summary.deals).toEqual([]);
  });

  it('usa trophy2 para títulos de PS5', async () => {
    const ps5 = vi.fn(async (url: string) => {
      if (url.endsWith('trophyTitles?limit=10'))
        return Response.json({
          trophyTitles: [
            {
              npServiceName: 'trophy2',
              npCommunicationId: 'NPWR2',
              trophyTitleName: 'G',
              progress: 5,
              earnedTrophies: { platinum: 0, gold: 0, silver: 0, bronze: 2 },
            },
          ],
        });
      if (url.endsWith('trophySummary'))
        return Response.json({
          trophyLevel: 1,
          earnedTrophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 },
        });
      expect(url).toContain('npServiceName=trophy2');
      return Response.json({ trophies: [] });
    });
    const summary = await buildSummary(TOKEN, ps5);
    expect(summary.last).toBeNull();
    expect(summary.progress).toEqual({ game: 'G', pct: 5 });
  });
});

describe('título com troféus', () => {
  it('ignora títulos sem troféus ganhos', async () => {
    const summary = await buildSummary(TOKEN, fakeFetch());
    expect(summary.progress).toEqual({ game: 'Jogo Falso', pct: 78 });
    expect(summary.last?.game).toBe('Jogo Falso');
  });

  it('sem nenhum título com troféus, last e progress são null', async () => {
    const none = {
      trophyTitles: [
        {
          npCommunicationId: 'X',
          trophyTitleName: 'Z',
          progress: 0,
          earnedTrophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 },
        },
      ],
    };
    const summary = await buildSummary(
      TOKEN,
      fakeFetch({ [`${API}/users/me/trophyTitles?limit=10`]: none }),
    );
    expect(summary.last).toBeNull();
    expect(summary.progress).toBeNull();
  });
});

describe('erros da Sony', () => {
  it('401 vira PsnAuthError', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 401 }));
    await expect(buildSummary(TOKEN, fetchFn)).rejects.toBeInstanceOf(PsnAuthError);
  });

  it('outro status falha sem ser PsnAuthError', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 503 }));
    const error = await buildSummary(TOKEN, fetchFn).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(PsnAuthError);
  });
});
