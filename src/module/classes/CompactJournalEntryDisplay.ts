import { getGame } from '../helpers';
import { MODULE_ID, MySettings } from '../constants';

export class CompactJournalEntryDisplay extends foundry.applications.sheets.journal.JournalEntrySheet {
  cellId: string;

  _initialRenderDone?: boolean;

  constructor(options) {
    super(options);
    this.cellId = options.cellId;
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
      this._remapPageIndexes(this.form);
    }

    if (!this._initialRenderDone) {
      this._initialRenderDone = true;
      this.toggleSidebar();
    }
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

  /** @override */
  get id() {
    return `gmscreen-journal-${this.document.id}`;
  }

  async close(...args) {
    if (args.length === 0) {
      return super.close(...args);
    }
    // prevent closing if esc is pressed
    return this;
  }
}
