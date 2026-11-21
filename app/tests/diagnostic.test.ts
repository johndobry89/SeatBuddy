// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_VERSION, formatDiagnostic } from '../src/core/diagnostic';
import { checkProposal } from '../src/core/compare';
import { discover } from '../src/core/seats';
import { ReadError } from '../src/popup/browser';
import { mount } from '../src/popup/ui';
import type { Observation } from '../src/core/types';
import { makeMap, makeRow } from './helpers';

const showing = { movie: 'Geheime Titel', cinema: 'Vue Ergens', date: '2026-11-22', time: '18:40', hall: 'Zaal 6' };
const observation: Observation = { status: 'OK', observedAt: 1, showing, map: makeMap([makeRow(7, 4, { 4: { category: null } })]) };

describe('developer report', () => {
  test('version matches the manifest (no drift between files)', () => {
    const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../static/manifest.json'), 'utf8'));
    expect(manifest.version_name).toBe(APP_VERSION);
  });

  test('codes and counts only: no titles, cinema or seat numbers', () => {
    const report = formatDiagnostic({ phase: 'SEARCH', observation, discovery: discover(observation.map!) });
    expect(report).toMatch(/Pagina: OK/);
    expect(report).toMatch(/Stoelkaart: OK · schema LUX_4 · rijen 1 · stoelen 4/);
    expect(report).toMatch(/vrij zonder soort 1/);
    expect(report).toMatch(/Paren: 1 · volgorde PAGE_ORDER · overgeslagen door buffer 1/);
    expect(report).not.toMatch(/Geheime|Ergens|18:40|Zaal 6|rij 7|\b7\b/);
  });

  test('distinguishes the states the old report could not (audit F4)', () => {
    const noMap = formatDiagnostic({ phase: 'SEARCH', observation: { ...observation, map: { ...makeMap([]), status: 'NOT_VISIBLE' } } });
    const incomplete = formatDiagnostic({ phase: 'SEARCH', observation: { status: 'INCOMPLETE', observedAt: 1, showing: { movie: 'x' }, map: null } });
    const failure = formatDiagnostic({ phase: 'CHECK', failure: 'TAB_CHANGED' });
    expect(noMap).toMatch(/Stoelkaart: NOT_VISIBLE/);
    expect(incomplete).toMatch(/Pagina: INCOMPLETE[\s\S]*movie ja, cinema nee/);
    expect(failure).toMatch(/Browser: TAB_CHANGED/);
    const check = formatDiagnostic({ phase: 'CHECK', observation, check: checkProposal({ showing: { ...showing, time: '21:00' }, row: 7, sender: 1, receiver: 2, categories: ['Lux', 'Lux'], readAt: '12:00' }, observation) });
    expect(check).toMatch(/Controle: OTHER_SHOWING:time/);
  });

  test('offered in the popup after a failure, copied on request only', async () => {
    document.body.innerHTML = '<main id="app"></main>';
    const root = document.getElementById('app')!;
    const copy = vi.fn(async (_text: string) => undefined);
    mount(root, { read: vi.fn(async () => Promise.reject(new ReadError('NOT_VUE_TAB'))), copy, now: () => 0 });
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Zoek twee stoelen')!.click();
    await new Promise((r) => setTimeout(r, 0));
    const report = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Kopieer foutrapport')!;
    expect(copy).not.toHaveBeenCalled();
    report.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(copy.mock.calls[0]![0]).toMatch(/Browser: NOT_VUE_TAB/);
    expect(report.textContent).toBe('Foutrapport gekopieerd');
  });
});
