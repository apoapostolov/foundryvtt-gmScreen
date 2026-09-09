import { getGame } from './helpers';
import { MODULE_ID, MySettings } from './constants';

export interface JournalCellView {
  pageId?: string;
  scrollTop?: number;
}

type JournalCellViews = Record<string, JournalCellView>;

const FLUSH_MS = 150;

let pending: JournalCellViews = {};
let flushTimer: number | undefined;

export function journalCellViewKey(entryId: string, uuid: string) {
  return `${entryId}:${uuid}`;
}

export function getJournalCellViews(): JournalCellViews {
  const stored = getGame().settings.get(MODULE_ID, MySettings.journalCellViews);
  return stored && typeof stored === 'object' ? { ...stored } : {};
}

export function getJournalCellView(key: string): JournalCellView | undefined {
  return pending[key] ?? getJournalCellViews()[key];
}

export function rememberJournalPageEnabled() {
  return !!getGame().settings.get(MODULE_ID, MySettings.rememberJournalPage);
}

export function rememberJournalScrollEnabled() {
  return !!getGame().settings.get(MODULE_ID, MySettings.rememberJournalScroll);
}

export async function flushJournalCellViews() {
  if (!Object.keys(pending).length) {
    return;
  }
  const next = { ...getJournalCellViews(), ...pending };
  pending = {};
  await getGame().settings.set(MODULE_ID, MySettings.journalCellViews, next);
}

export function patchJournalCellView(key: string, partial: JournalCellView) {
  if (!key) {
    return;
  }
  const current = getJournalCellView(key) ?? {};
  pending[key] = { ...current, ...partial };
  if (flushTimer !== undefined) {
    window.clearTimeout(flushTimer);
  }
  flushTimer = window.setTimeout(() => {
    flushTimer = undefined;
    flushJournalCellViews().catch(() => undefined);
  }, FLUSH_MS);
}

export function clearJournalCellView(key: string) {
  if (!key) {
    return;
  }
  delete pending[key];
  const views = getJournalCellViews();
  if (!(key in views)) {
    return;
  }
  delete views[key];
  getGame()
    .settings.set(MODULE_ID, MySettings.journalCellViews, views)
    .catch(() => undefined);
}

export function findJournalScrollElement(root: ParentNode | null | undefined): HTMLElement | null {
  if (!root) {
    return null;
  }
  return (
    root.querySelector<HTMLElement>('.journal-entry-pages') ?? root.querySelector<HTMLElement>('.journal-entry-content')
  );
}
