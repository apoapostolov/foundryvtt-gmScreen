import {
  findJournalScrollElement,
  getJournalCellView,
  journalCellViewKey,
  patchJournalCellView,
  rememberJournalPageEnabled,
  rememberJournalScrollEnabled,
} from '../journalCellMemory';
import { getLocalization } from '../helpers';
import { MODULE_ABBREV } from '../constants';

interface JournalSheetApi {
  _pages: Record<string, { id: string }>;
  pageId: string;
  pageIndex: number;
  goToPage: (pageId: string, options?: { anchor?: string }) => unknown;
  _setCurrentPage: (options?: object) => void;
}

export class CompactJournalEntryDisplay extends foundry.applications.sheets.journal.JournalEntrySheet {
  cellId: string;

  _initialRenderDone?: boolean;

  _memoryAbort?: AbortController;

  _restoringScroll = false;

  constructor(options) {
    super(options);
    this.cellId = options.cellId;
  }

  get viewKey() {
    const cell = document.getElementById(this.cellId.replace('#', ''));
    const entryId = String(cell?.dataset.entryId || this.cellId.replace('#', ''));
    const uuid = String(this.document.uuid || this.document.id || this.cellId);
    return journalCellViewKey(entryId, uuid);
  }

  get sheetApi() {
    return this as unknown as JournalSheetApi;
  }

  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get isEditable() {
    return false;
  }

  async render(options: boolean | object = {}, _options: object = {}) {
    const renderOptions = typeof options === 'boolean' ? { ..._options, force: options } : { ...options };
    if (rememberJournalPageEnabled() && !('pageId' in renderOptions) && !('pageIndex' in renderOptions)) {
      const stored = getJournalCellView(this.viewKey);
      if (stored?.pageId && this.document.pages.has(stored.pageId)) {
        (renderOptions as { pageId: string }).pageId = stored.pageId;
      }
    }
    return super.render(renderOptions);
  }

  _setCurrentPage(options = {}) {
    super._setCurrentPage(options);
    this._persistMemory();
    this._syncPageJumpValue();
  }

  _replaceHTML(element, html, options) {
    super._replaceHTML(element, html, options);
    if (!this.form) {
      return;
    }

    const cell = document.getElementById(this.cellId.replace('#', ''));
    if (!cell) {
      return;
    }
    const titleElement = cell.querySelector('.gm-screen-grid-cell-title');
    if (titleElement) {
      titleElement.textContent = this.title;
    }

    const gridCellContent = cell.querySelector('.gm-screen-grid-cell-content');
    if (gridCellContent) {
      gridCellContent.replaceChildren(this.form);
      const windowHeader = gridCellContent.querySelector('.window-header');
      if (windowHeader) {
        windowHeader.remove();
      }
      gridCellContent.classList.remove(...gridCellContent.classList);
      gridCellContent.classList.add('gm-screen-grid-cell-content');
    }

    if (!this._initialRenderDone) {
      this._initialRenderDone = true;
      this.toggleSidebar();
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._installPageJump();
    this._bindScrollMemory();
    this._restoreScroll();
    this._persistMemory();
  }

  _pageNumberBounds() {
    const pages = this.sheetApi._pages;
    const { pageIndex } = this.sheetApi;
    const count = Object.keys(pages ?? {}).length;
    return {
      count,
      min: 0,
      max: Math.max(count - 1, 0),
      display: pageIndex,
    };
  }

  _installPageJump() {
    const footer = this.element?.querySelector('footer.action-buttons');
    if (!(footer instanceof HTMLElement)) {
      return;
    }
    footer.querySelectorAll('.gm-screen-page-jump').forEach((node) => node.remove());
    const { count, min, max, display } = this._pageNumberBounds();
    if (!count) {
      return;
    }
    const label = document.createElement('label');
    label.className = 'gm-screen-page-jump';
    const labelText = document.createElement('span');
    labelText.className = 'gm-screen-page-jump-label';
    labelText.textContent = getLocalization().localize(`${MODULE_ABBREV}.gmScreen.JumpToPage`);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.step = '1';
    input.inputMode = 'numeric';
    input.value = String(display);
    input.setAttribute('aria-label', labelText.textContent);
    label.append(labelText, input);
    const next = footer.querySelector('[data-action="nextPage"]');
    if (next) {
      next.before(label);
    } else {
      footer.append(label);
    }
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this._jumpToEnteredPage(input);
    });
    input.addEventListener('change', () => this._jumpToEnteredPage(input));
  }

  _syncPageJumpValue() {
    const input = this.element?.querySelector<HTMLInputElement>('.gm-screen-page-jump input');
    if (!input) {
      return;
    }
    const { min, max, display } = this._pageNumberBounds();
    input.min = String(min);
    input.max = String(max);
    if (document.activeElement !== input) {
      input.value = String(display);
    }
  }

  _jumpToEnteredPage(input: HTMLInputElement) {
    const { count, min, max } = this._pageNumberBounds();
    const raw = Number.parseInt(input.value, 10);
    if (!count || !Number.isFinite(raw)) {
      this._syncPageJumpValue();
      return;
    }
    const clamped = Math.min(max, Math.max(min, raw));
    const pageIndex = clamped;
    const pageId = Object.keys(this.sheetApi._pages ?? {})[pageIndex];
    if (!pageId) {
      this._syncPageJumpValue();
      return;
    }
    // keep the field in sync with the page that will render
    // eslint-disable-next-line no-param-reassign
    input.value = String(clamped);
    this.sheetApi.goToPage(pageId);
  }

  _scrollRoot(): ParentNode | null {
    const cell = document.getElementById(this.cellId.replace('#', ''));
    return cell?.querySelector('.gm-screen-grid-cell-content') ?? this.element;
  }

  _bindScrollMemory() {
    this._memoryAbort?.abort();
    this._memoryAbort = new AbortController();
    const scrollEl = findJournalScrollElement(this._scrollRoot());
    if (!scrollEl) {
      return;
    }
    scrollEl.addEventListener(
      'scroll',
      () => {
        if (this._restoringScroll) {
          return;
        }
        this._persistMemory();
      },
      { signal: this._memoryAbort.signal, passive: true }
    );
  }

  _restoreScroll() {
    if (!rememberJournalScrollEnabled()) {
      return;
    }
    const stored = getJournalCellView(this.viewKey);
    if (stored?.pageId && stored.pageId !== this.sheetApi.pageId) {
      return;
    }
    if (typeof stored?.scrollTop !== 'number') {
      return;
    }
    const { scrollTop } = stored;
    this._restoringScroll = true;
    const apply = () => {
      const scrollEl = findJournalScrollElement(this._scrollRoot());
      if (scrollEl) {
        scrollEl.scrollTop = scrollTop;
      }
    };
    apply();
    requestAnimationFrame(() => {
      apply();
      window.setTimeout(() => {
        apply();
        this._restoringScroll = false;
      }, 50);
    });
  }

  _persistMemory() {
    const rememberPage = rememberJournalPageEnabled();
    const rememberScroll = rememberJournalScrollEnabled();
    if (!rememberPage && !rememberScroll) {
      return;
    }
    const patch: { pageId?: string; scrollTop?: number } = {};
    if (rememberPage && this.sheetApi.pageId) {
      patch.pageId = this.sheetApi.pageId;
    }
    if (rememberScroll) {
      const scrollEl = findJournalScrollElement(this._scrollRoot());
      if (scrollEl) {
        patch.scrollTop = scrollEl.scrollTop;
      }
    }
    if (!Object.keys(patch).length) {
      return;
    }
    patchJournalCellView(this.viewKey, patch);
  }

  /** @override */
  get id() {
    return `gmscreen-journal-${this.document.id}`;
  }

  async close(...args) {
    this._memoryAbort?.abort();
    if (args.length === 0) {
      return super.close(...args);
    }
    // prevent closing if esc is pressed
    return this;
  }
}
