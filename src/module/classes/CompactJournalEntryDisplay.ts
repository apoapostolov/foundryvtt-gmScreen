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
      this._syncHiddenSidebarRail(gridCellContent);
    }

    if (!this._initialRenderDone) {
      this._initialRenderDone = true;
      // incomplete type definitions
      this.toggleSidebar();
    }
  }

  _syncHiddenSidebarRail(gridCellContent: Element) {
    gridCellContent.querySelectorAll('.gm-screen-journal-sidebar-rail').forEach((rail) => rail.remove());
    const hidden = !!getGame().settings.get(MODULE_ID, MySettings.hiddenJournalSidebar);
    if (!hidden || !this.form?.querySelector('.journal-sidebar')) {
      return;
    }
    const rail = document.createElement('div');
    rail.className = 'gm-screen-journal-sidebar-rail';
    rail.setAttribute('aria-hidden', 'true');
    gridCellContent.append(rail);
  }

  toggleSidebar() {
    // incomplete type definitions
    // @ts-expect-error
    super.toggleSidebar();
    if (!getGame().settings.get(MODULE_ID, MySettings.hiddenJournalSidebar)) {
      return;
    }
    this.element.style.pointerEvents = '';
    this.element.classList.remove('collapsing');
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
