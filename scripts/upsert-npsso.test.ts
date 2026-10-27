import { describe, expect, it } from 'vitest';

import { upsertNpsso } from './upsert-npsso.ts';

describe('upsertNpsso', () => {
  it('substitui a linha existente preservando as demais', () => {
    expect(upsertNpsso('A=1\nPSN_NPSSO=old\nB=2\n', 'new')).toBe('A=1\nPSN_NPSSO=new\nB=2\n');
  });
  it('acrescenta quando não existe, com quebra de linha', () => {
    expect(upsertNpsso('A=1', 'new')).toBe('A=1\nPSN_NPSSO=new\n');
    expect(upsertNpsso('A=1\n', 'new')).toBe('A=1\nPSN_NPSSO=new\n');
  });
  it('arquivo vazio', () => {
    expect(upsertNpsso('', 'new')).toBe('PSN_NPSSO=new\n');
  });
  it('não interpreta $ do valor como padrão de substituição', () => {
    expect(upsertNpsso('PSN_NPSSO=x\n', 'a$&b')).toBe('PSN_NPSSO=a$&b\n');
  });
});
