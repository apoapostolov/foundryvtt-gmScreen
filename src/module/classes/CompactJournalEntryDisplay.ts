import { extractCoreJournalView, getGame } from '../helpers';
import { MODULE_ID, MySettings } from '../constants';

export class CompactJournalEntryDisplay extends foundry.applications.sheets.journal.JournalEntrySheet {
  cellId: string;

  _initialRenderDone?: boolean;

  _hiddenSidebarHoverBound = new WeakSet<Element>();

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
      const sidebarOpen = gridCellContent.classList.contains('gm-screen-journal-sidebar-open');
      gridCellContent.classList.remove(...gridCellContent.classList);
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
      }
    }

    if (!this._initialRenderDone) {
      this._initialRenderDone = true;
      if (!getGame().settings.get(MODULE_ID, MySettings.plainJournalCells)) {
        this.toggleSidebar();
      }
    }
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
    if (args.length === 0) {
      return super.close(...args);
    }
    // prevent closing if esc is pressed
    return Promise.resolve(this);
  }
}
