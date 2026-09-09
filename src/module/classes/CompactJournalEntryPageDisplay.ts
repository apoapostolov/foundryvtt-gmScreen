import {
  getJournalCellView,
  journalCellViewKey,
  patchJournalCellView,
  rememberJournalScrollEnabled,
} from '../journalCellMemory';
import { getGame } from '../helpers';
import { MODULE_ID, MySettings } from '../constants';

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
      case 'image': {
        const img = document.createElement('img');
        img.src = this.options.document.src ?? '';
        img.alt = this.options.document.image.caption || 'image';
        gridCellContent.replaceChildren(img);
        if (gridCellLink) {
          gridCellLink.removeAttribute('data-link');
          gridCellLink.setAttribute('data-action', 'open');
        }
        break;
      }
      case 'pdf': {
        const iframe = document.createElement('iframe');
        const src = this.options.document.src ?? '';
        const file = src.startsWith('https://') || src.startsWith('http://') ? src : `/${src}`;
        iframe.src = `scripts/pdfjs/web/viewer.html?file=${file}`;
        gridCellContent.replaceChildren(iframe);
        break;
      }
      case 'video': {
        const video = document.createElement('video');
        video.src = this.options.document.src ?? '';
        if (this.options.document.video.controls) {
          video.controls = true;
        }
        if (this.options.document.video.autoplay) {
          video.autoplay = true;
        }
        gridCellContent.replaceChildren(video);
        break;
      }
      default: {
        const pageHtml = this.options.document.text.content;
        if (!pageHtml) {
          break;
        }
        const plain = getGame().settings.get(MODULE_ID, MySettings.plainJournalCells);
        if (plain) {
          const page = document.createElement('article');
          page.className = 'journal-entry-page text';
          const content = document.createElement('section');
          content.className = 'journal-page-content';
          content.innerHTML = pageHtml;
          page.append(content);
          gridCellContent.replaceChildren(page);
        } else {
          gridCellContent.innerHTML = pageHtml;
        }
        break;
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
    return Promise.resolve(this);
  }
}
