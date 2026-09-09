import { getGame, getLocalization } from './helpers';
import { MODULE_ABBREV } from './constants';

export interface ScenePickerItem {
  id: string;
  name: string;
  checked: boolean;
}

export interface ScenePickerGroup {
  folderName: string;
  scenes: ScenePickerItem[];
}

export function normalizeSceneIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }
  if (typeof value === 'string' && value) {
    return [value];
  }
  return [];
}

export function buildScenePickerGroups(selected: string[] = []): ScenePickerGroup[] {
  const selectedSet = new Set(selected);
  const grouped = new Map<string, ScenePickerGroup>();
  const uncategorized: ScenePickerGroup = { folderName: '', scenes: [] };
  const scenes = [...(getGame().scenes ?? [])].sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0));

  scenes.forEach((scene) => {
    const { id } = scene;
    if (!id) {
      return;
    }
    const item: ScenePickerItem = {
      id,
      name: scene.name ?? id,
      checked: selectedSet.has(id),
    };
    const { folder } = scene;
    if (!folder) {
      uncategorized.scenes.push(item);
      return;
    }
    const folderId = folder.id ?? folder.name ?? 'folder';
    const existing = grouped.get(folderId);
    if (existing) {
      existing.scenes.push(item);
      return;
    }
    grouped.set(folderId, { folderName: folder.name ?? '', scenes: [item] });
  });

  return [...grouped.values(), ...(uncategorized.scenes.length ? [uncategorized] : [])];
}

export function scenePickerSummary(ids: string[] | undefined) {
  const list = normalizeSceneIds(ids);
  const i18n = getLocalization();
  if (!list.length) {
    return i18n.localize(`${MODULE_ABBREV}.gridConfig.scenePicker.None`);
  }
  if (list.length === 1) {
    return getGame().scenes?.get(list[0])?.name ?? i18n.localize(`${MODULE_ABBREV}.gridConfig.scenePicker.None`);
  }
  const format = getGame().i18n?.format?.bind(getGame().i18n);
  if (format) {
    return format(`${MODULE_ABBREV}.gridConfig.scenePicker.Count`, { count: list.length });
  }
  return `${list.length}`;
}

function setStyles(el: HTMLElement, styles: Record<string, string>) {
  Object.entries(styles).forEach(([name, value]) => {
    el.style.setProperty(name, value);
  });
}

function pickerList(details: HTMLDetailsElement) {
  return (
    details.querySelector('.gms-multi-list') ??
    document.body.querySelector(`.gms-multi-list[data-owner="${details.dataset.gridId}"]`)
  );
}

function paintList(list: HTMLElement, form: HTMLElement) {
  const field = form.querySelector<HTMLElement>('input[type="text"], input[type="number"]');
  const content = form.closest('.window-content') ?? form;
  const fieldStyle = field ? getComputedStyle(field) : getComputedStyle(content);
  const surface = getComputedStyle(content);
  const veil = fieldStyle.backgroundColor || 'transparent';
  const surfaceLayer =
    surface.backgroundImage && surface.backgroundImage !== 'none' ? surface.backgroundImage : surface.backgroundColor;
  setStyles(list, {
    background: `linear-gradient(${veil}, ${veil}), ${surfaceLayer}`,
    color: surface.color,
  });
}

function nudgeList(list: HTMLElement) {
  const pad = 5;
  const rect = list.getBoundingClientRect();
  let { left } = rect;
  let { top } = rect;
  if (rect.right > window.innerWidth - pad) {
    left -= rect.right - (window.innerWidth - pad);
  }
  if (left < pad) {
    left = pad;
  }
  if (rect.bottom > window.innerHeight - pad) {
    top -= rect.bottom - (window.innerHeight - pad);
  }
  if (top < pad) {
    top = pad;
  }
  setStyles(list, {
    left: `${left}px`,
    top: `${top}px`,
    'max-height': `${Math.max(128, window.innerHeight - pad - top)}px`,
  });
}

function pinList(summary: HTMLElement, list: HTMLElement) {
  const rect = summary.getBoundingClientRect();
  setStyles(list, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.bottom}px`,
    'min-width': `${Math.max(rect.width, 12 * 16)}px`,
    'z-index': '99999',
  });
  nudgeList(list);
}

function updateSummary(details: HTMLDetailsElement) {
  const summary = details.querySelector('summary');
  const list = pickerList(details);
  if (!summary || !(list instanceof HTMLElement)) {
    return;
  }
  const ids = [...list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map(
    (input) => input.value
  );
  summary.textContent = scenePickerSummary(ids);
}

function filterList(list: HTMLElement, query: string) {
  const needle = query.trim().toLowerCase();
  list.querySelectorAll('.gms-multi-group').forEach((group) => {
    let anyVisible = false;
    group.querySelectorAll('label').forEach((label) => {
      const text = `${label.textContent ?? ''} ${label.querySelector('input')?.value ?? ''}`.toLowerCase();
      const show = !needle || text.includes(needle);
      label.toggleAttribute('hidden', !show);
      anyVisible = anyVisible || show;
    });
    group.toggleAttribute('hidden', !!needle && !anyVisible);
  });
}

function restoreList(details: HTMLDetailsElement) {
  const list = pickerList(details);
  if (list instanceof HTMLElement) {
    details.append(list);
    ['position', 'left', 'top', 'min-width', 'max-height', 'z-index', 'background', 'color'].forEach((name) =>
      list.style.removeProperty(name)
    );
    const filter = list.querySelector<HTMLInputElement>('.gms-multi-filter');
    if (filter) {
      filter.value = '';
      filterList(list, '');
    }
  }
  updateSummary(details);
}

function closePicker(details: HTMLDetailsElement) {
  restoreList(details);
  details.removeAttribute('open');
}

export function closeOpenScenePickers(root: ParentNode | Document = document) {
  const owners = new Set<string>();
  root.querySelectorAll('details.gms-multi').forEach((node) => {
    const details = node as HTMLDetailsElement;
    if (details.dataset.gridId) {
      owners.add(details.dataset.gridId);
    }
    closePicker(details);
  });
  document.body.querySelectorAll('.gms-multi-list[data-owner]').forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    const owner = node.dataset.owner ?? '';
    if (owners.has(owner)) {
      return;
    }
    node.remove();
  });
}

export function bindScenePickers(root: HTMLElement, abort: AbortController) {
  const form = root;

  root.addEventListener(
    'toggle',
    (event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement) || !details.classList.contains('gms-multi')) {
        return;
      }
      if (!details.open) {
        restoreList(details);
        return;
      }
      root.querySelectorAll('details.gms-multi[open]').forEach((other) => {
        if (other !== details) {
          closePicker(other as HTMLDetailsElement);
        }
      });
      const list = pickerList(details);
      if (!(list instanceof HTMLElement)) {
        return;
      }
      list.setAttribute('data-owner', details.dataset.gridId ?? '');
      document.body.append(list);
      paintList(list, form);
      pinList(details.querySelector('summary') as HTMLElement, list);
      const filter = list.querySelector<HTMLInputElement>('.gms-multi-filter');
      if (filter) {
        filter.value = '';
        filterList(list, '');
        filter.focus();
      }
      window.setTimeout(() => nudgeList(list), 0);
    },
    { signal: abort.signal, capture: true }
  );

  document.addEventListener(
    'input',
    (event) => {
      const filter = event.target;
      if (!(filter instanceof HTMLInputElement) || !filter.classList.contains('gms-multi-filter')) {
        return;
      }
      const list = filter.closest('.gms-multi-list');
      if (list instanceof HTMLElement) {
        filterList(list, filter.value);
        nudgeList(list);
      }
    },
    { signal: abort.signal }
  );

  document.addEventListener(
    'change',
    (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') {
        return;
      }
      const list = input.closest('.gms-multi-list');
      const owner = list instanceof HTMLElement ? list.dataset.owner : undefined;
      const details =
        input.closest('details.gms-multi') ??
        (owner ? root.querySelector(`details.gms-multi[data-grid-id="${owner}"]`) : null);
      if (details instanceof HTMLDetailsElement) {
        updateSummary(details);
      }
    },
    { signal: abort.signal }
  );

  document.addEventListener(
    'keydown',
    (event) => {
      const open = root.querySelector('details.gms-multi[open]');
      if (!(open instanceof HTMLDetailsElement)) {
        return;
      }
      if (
        event.key === 'Enter' &&
        event.target instanceof HTMLInputElement &&
        event.target.classList.contains('gms-multi-filter')
      ) {
        event.preventDefault();
        return;
      }
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closePicker(open);
    },
    { signal: abort.signal, capture: true }
  );

  document.addEventListener(
    'pointerdown',
    (event) => {
      const open = root.querySelector('details.gms-multi[open]');
      if (!(open instanceof HTMLDetailsElement)) {
        return;
      }
      const list = pickerList(open);
      const { target } = event;
      if (target instanceof Node && (open.contains(target) || (list instanceof Node && list.contains(target)))) {
        return;
      }
      closePicker(open);
    },
    { signal: abort.signal, capture: true }
  );

  abort.signal.addEventListener('abort', () => {
    closeOpenScenePickers(root);
  });
}
