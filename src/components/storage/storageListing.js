/**
 * S3/MinIO ro‘yxatidan joriy prefix ostidagi "papka" va fayllarni ajratadi.
 * @param {{ key: string }[]} objects
 * @param {string} prefix
 */
export function parseStorageListing(objects, prefix) {
  const p = prefix === '' ? '' : prefix.endsWith('/') ? prefix : `${prefix}/`;
  const folders = new Set();
  const files = [];

  for (const obj of objects) {
    const key = obj.key;
    if (key == null || key === '') continue;
    if (p && !key.startsWith(p)) continue;

    const rel = p ? key.slice(p.length) : key;
    if (rel === '') continue;
    const slash = rel.indexOf('/');
    if (slash === -1) {
      files.push(obj);
    } else {
      folders.add(rel.slice(0, slash));
    }
  }

  return {
    folders: [...folders].sort((a, b) => a.localeCompare(b)),
    files,
  };
}

export function formatBytes(bytes) {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / k ** i).toFixed(i ? 1 : 0))} ${sizes[i]}`;
}

export function breadcrumbFromPrefix(prefix) {
  const trimmed = String(prefix || '').replace(/\/+$/, '');
  if (!trimmed) return [];
  return trimmed.split('/').filter(Boolean);
}

/** @param {string[]} segments @param {number} index - inclusive segment index */
export function prefixThroughSegment(segments, index) {
  if (index < 0 || !segments.length) return '';
  const parts = segments.slice(0, index + 1);
  return `${parts.join('/')}/`;
}

/** API uchun prefix: bo‘sh yoki `auditions/audio` (oxirgi `/` ixtiyoriy) */
export function prefixForBrowseApi(internalPrefix) {
  const s = String(internalPrefix || '').trim();
  return s.replace(/\/+$/, '') || '';
}

/**
 * To‘liq papka kaliti (masalan `auditions/audio/`) dan sarlavha — joriy papkaga nisbatan.
 */
export function displayNameForStoragePrefix(fullPrefix, parentInternalPrefix) {
  const parent = prefixForBrowseApi(parentInternalPrefix);
  let fp = String(fullPrefix || '');
  if (parent) {
    const pa = `${parent}/`;
    if (fp.startsWith(pa)) fp = fp.slice(pa.length);
  }
  const name = fp.replace(/\/+$/, '').split('/').filter(Boolean).pop();
  return name || fullPrefix.replace(/\/+$/, '') || fullPrefix;
}

/**
 * Yangi papka yaratish: `path` backend talabiga mos (slashsiz segmentlar).
 */
export function buildFolderCreatePath(parentInternalPrefix, rawName) {
  const name = String(rawName || '')
    .trim()
    .replace(/[/\\]+/g, '')
    .replace(/^\.\.+$/, '');
  if (!name) return '';
  const base = prefixForBrowseApi(parentInternalPrefix);
  return base ? `${base}/${name}` : name;
}

/** Papka o‘chirish / kalit: oxirida `/` bo‘lishi kerak */
export function folderDeleteKey(fullPrefix) {
  const s = String(fullPrefix || '').trim();
  if (!s) return '';
  return s.endsWith('/') ? s : `${s}/`;
}
