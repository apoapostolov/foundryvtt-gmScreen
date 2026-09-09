import {
  getJournalCellView,
  journalCellViewKey,
  patchJournalCellView,
  rememberJournalScrollEnabled,
} from '../journalCellMemory';

export class CompactJournalEntryPageDisplay
  extends foundry.applications.sheets.journal.JournalEntryPageHandlebarsSheet
{
  cellId: string;

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
      titleElement.textContent = this.options.document.name;
    }

    const gridCellContent = cell.querySelector('.gm-screen-grid-cell-content');
    if (!gridCellContent) {
      return;
    }

    const gridCellLink = cell.querySelector('a[data-link]');

    switch (this.options.document.type) {
      case 'image':
        gridCellContent.innerHTML = `<img src="${this.options.document.src}" alt="${this.options.document.image.caption || 'image'}"></img>`;
        if (!gridCellLink) {
          break;
        }
        gridCellLink.removeAttribute('data-link');
        gridCellLink.setAttribute('data-action', 'open');
        break;
      case 'pdf':
        gridCellContent.innerHTML = `<iframe src="scripts/pdfjs/web/viewer.html?file=${
          this.options.document.src?.startsWith('https://') || this.options.document.src?.startsWith('http://')
            ? this.options.document.src
            : `/${this.options.document.src}`
        }"></iframe>`;
        break;
      case 'video':
        gridCellContent.innerHTML = `<video src="${this.options.document.src}" ${this.options.document.video.controls ? 'controls' : ''} ${this.options.document.video.autoplay ? 'autoplay' : ''}></video>`;
        break;
      default:
        if (this.options.document.text.content) {
          gridCellContent.innerHTML = this.options.document.text.content;
        }
    }

    this.form.style.display = 'none';
    this._bindScrollMemory();
    this._restoreScroll();
  }

  _scrollElement(): HTMLElement | null {
    const cell = document.getElementById(this.cellId.replace('#', ''));
    return cell?.querySelector('.gm-screen-grid-cell-content') ?? null;
  }

  _bindScrollMemory() {
    this._memoryAbort?.abort();
    this._memoryAbort = new AbortController();
    const scrollEl = this._scrollElement();
    if (!scrollEl || !rememberJournalScrollEnabled()) {
      return;
    }
    scrollEl.addEventListener(
      'scroll',
      () => {
        if (this._restoringScroll) {
          return;
        }
        patchJournalCellView(this.viewKey, { scrollTop: scrollEl.scrollTop });
      },
      { signal: this._memoryAbort.signal, passive: true }
    );
  }

  _restoreScroll() {
    if (!rememberJournalScrollEnabled()) {
      return;
    }
    const stored = getJournalCellView(this.viewKey);
    if (typeof stored?.scrollTop !== 'number') {
      return;
    }
    const { scrollTop } = stored;
    if (!this._scrollElement()) {
      return;
    }
    this._restoringScroll = true;
    const apply = () => {
      const el = this._scrollElement();
      if (el) {
        el.scrollTop = scrollTop;
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

  /** @override */
  get id() {
    return `gmscreen-journal-page-${this.document.id}`;
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
