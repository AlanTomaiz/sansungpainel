export type TrophyGrade = 'platinum' | 'gold' | 'silver' | 'bronze';

export interface PsnDeal {
  name: string;
  price: string;
  was: string;
  until: string;
  cover: string;
}

export interface PsnSummary {
  level: number;
  counts: Record<TrophyGrade, number>;
  last: { name: string; game: string; grade: TrophyGrade; rarity: number } | null;
  progress: { game: string; pct: number } | null;
  deals: PsnDeal[];
}

export const shouldRotate = (summary: Pick<PsnSummary, 'deals'>): boolean =>
  summary.deals.length > 0;

export class PsnAuthError extends Error {
  constructor() {
    super('psn auth rejected');
    this.name = 'PsnAuthError';
  }
}
