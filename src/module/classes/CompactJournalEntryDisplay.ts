import {
  findJournalScrollElement,
  getJournalCellView,
  journalCellViewKey,
  patchJournalCellView,
  rememberJournalPageEnabled,
  rememberJournalScrollEnabled,
} from '../journalCellMemory';
import { extractCoreJournalView, getGame, getLocalization } from '../helpers';
import { MODULE_ABBREV, MODULE_ID, MySettings } from '../constants';

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

  _hiddenSidebarHoverBound = new WeakSet<Element>();

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
    // incomplete JournalEntrySheet types
    // @ts-expect-error
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
      const sidebarOpen = gridCellContent.classList.contains('gm-screen-journal-sidebar-open');
      gridCellContent.classList.remove(...Array.from(gridCellContent.classList));
      gridCellContent.classList.add('gm-screen-grid-cell-content');
      if (sidebarOpen) {
        gridCellContent.classList.add('gm-screen-journal-sidebar-open');
      }

      const plain = getGame().settings.get(MODULE_ID, MySettings.plainJournalCells);
      if (plain) {
        const coreView = extractCoreJournalView(this.form);
        this.form.style.display = 'none';
        if (coreView) {
          gridCellContent.append(coreView);
        }
      } else {
        this._syncHiddenSidebar(gridCellContent);
        this._remapPageIndexes(this.form);
      }
    }

    if (!this._initialRenderDone) {
      this._initialRenderDone = true;
      if (!getGame().settings.get(MODULE_ID, MySettings.plainJournalCells)) {
        this.toggleSidebar();
      }
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._installPageJump();
    this._bindScrollMemory();
    this._restoreScroll();
    this._persistMemory();
  }

  _remapPageIndexes(root: HTMLElement) {
    if (!getGame().settings.get(MODULE_ID, MySettings.remapJournalPagesIndexFrom1)) {
      return;
    }
    root.querySelectorAll('.page-index').forEach((node) => {
      const el = node as HTMLElement;
      if (el.dataset.gmScreenIndexRemapped === '1') {
        return;
      }
      const n = Number.parseInt(el.textContent ?? '', 10);
      if (!Number.isFinite(n)) {
        return;
      }
      el.textContent = String(n + 1);
      el.dataset.gmScreenIndexRemapped = '1';
    });
  }

  _syncHiddenSidebar(gridCellContent: Element) {
    const root = gridCellContent as HTMLElement;
    root.querySelectorAll('.gm-screen-journal-sidebar-rail').forEach((rail) => rail.remove());
    const hidden = !!getGame().settings.get(MODULE_ID, MySettings.hiddenJournalSidebar);
    const sidebar = this.form?.querySelector('.journal-sidebar');
    if (!hidden || !sidebar) {
      root.classList.remove('gm-screen-journal-sidebar-open');
      return;
    }
    this._bindHiddenSidebarHover(root);
  }

  _bindHiddenSidebarHover(root: HTMLElement) {
    if (this._hiddenSidebarHoverBound.has(root)) {
      return;
    }
    this._hiddenSidebarHoverBound.add(root);
    let hideTimer: number | undefined;
    const stripWidth = () => {
      const sidebar = root.querySelector('.journal-sidebar');
      const raw = sidebar ? getComputedStyle(sidebar).getPropertyValue('--sidebar-width-collapsed') : '';
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 40;
    };
    const isSidebarChrome = (node: EventTarget | null) => {
      const el = node as HTMLElement | null;
      return !!el?.closest?.('.journal-sidebar');
    };
    const inHoverZone = (event: PointerEvent) => {
      if (isSidebarChrome(event.target)) {
        return true;
      }
      const rect = root.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.left + stripWidth() &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    };
    const open = () => {
      window.clearTimeout(hideTimer);
      hideTimer = undefined;
      root.classList.add('gm-screen-journal-sidebar-open');
    };
    const scheduleHide = () => {
      if (hideTimer !== undefined) {
        return;
      }
      hideTimer = window.setTimeout(() => {
        hideTimer = undefined;
        root.classList.remove('gm-screen-journal-sidebar-open');
      }, 400);
    };
    root.addEventListener('pointermove', (event) => {
      if (inHoverZone(event)) {
        open();
      } else if (root.classList.contains('gm-screen-journal-sidebar-open')) {
        scheduleHide();
      }
    });
    root.addEventListener('pointerleave', scheduleHide);
  }

  get sheetApi() {
    return this as unknown as JournalSheetApi;
  }

  _pageNumberBounds() {
    const pages = this.sheetApi._pages;
    const { pageIndex } = this.sheetApi;
    const count = Object.keys(pages ?? {}).length;
    const remap = !!getGame().settings.get(MODULE_ID, MySettings.remapJournalPagesIndexFrom1);
    return {
      count,
      remap,
      min: remap ? 1 : 0,
      max: remap ? count : Math.max(count - 1, 0),
      display: remap ? pageIndex + 1 : pageIndex,
    };
  }

  _installPageJump() {
    if (getGame().settings.get(MODULE_ID, MySettings.plainJournalCells)) {
      return;
    }
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
    const { count, remap, min, max } = this._pageNumberBounds();
    const raw = Number.parseInt(input.value, 10);
    if (!count || !Number.isFinite(raw)) {
      this._syncPageJumpValue();
      return;
    }
    const clamped = Math.min(max, Math.max(min, raw));
    const pageIndex = remap ? clamped - 1 : clamped;
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

  toggleSidebar() {
    const hidden = !!getGame().settings.get(MODULE_ID, MySettings.hiddenJournalSidebar);
    const left = this.position?.left;
    const width = this.position?.width;
    // incomplete type definitions
    // @ts-expect-error
    super.toggleSidebar();
    if (!hidden) {
      return;
    }
    this.element.style.pointerEvents = '';
    this.element.style.minWidth = '';
    this.element.classList.remove('collapsing');
    // incomplete type definitions
    // @ts-expect-error
    this.element.classList.toggle('expanded', this.sidebarExpanded);
    if (Number.isFinite(left) && Number.isFinite(width)) {
      this.setPosition({ left, width });
    }
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
    return Promise.resolve(this);
  }
}
