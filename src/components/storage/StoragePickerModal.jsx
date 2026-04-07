import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Folder,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Music,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { Button, ConfirmModal } from '../ui';
import {
  useCreateStorageFolder,
  useDeleteStorageObject,
  useStorageBrowseInfinite,
  useStorageBuckets,
  useUploadFile,
} from '../../hooks/useApi';
import { ASSETS_PUBLIC_BASE } from '../../services/api';
import {
  breadcrumbFromPrefix,
  buildFolderCreatePath,
  displayNameForStoragePrefix,
  folderDeleteKey,
  formatBytes,
  prefixForBrowseApi,
  prefixThroughSegment,
} from './storageListing';
import styles from './StoragePickerModal.module.css';

function objectPreviewSrc(obj) {
  const u = obj.url?.trim();
  if (u) return u;
  const k = obj.key?.trim();
  if (!k) return null;
  if (/^https?:\/\//i.test(k)) return k;
  return `${ASSETS_PUBLIC_BASE}/${k.replace(/^\//, '')}`;
}

function isImageObject(obj) {
  const ct = (obj.content_type || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?|#|$)/i.test(obj.key || '');
}

function FileTypeIcon({ obj, size = 22 }) {
  const ct = (obj.content_type || '').toLowerCase();
  if (ct.startsWith('video/') || /\.(mp4|webm|mov|mkv|m4v)(\?|#|$)/i.test(obj.key || '')) {
    return <Video size={size} className={styles.thumbIcon} aria-hidden />;
  }
  if (ct.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg)(\?|#|$)/i.test(obj.key || '')) {
    return <Music size={size} className={styles.thumbIcon} aria-hidden />;
  }
  if (isImageObject(obj)) {
    return <ImageIcon size={size} className={styles.thumbIcon} aria-hidden />;
  }
  return <HardDrive size={size} className={styles.thumbIcon} aria-hidden />;
}

/** Navigatsiya: root `''`, ichkarida odatda `auditions/audio/` */
function normalizeNavPrefix(p) {
  const t = String(p || '').trim().replace(/^\/+/, '');
  if (!t) return '';
  return t.endsWith('/') ? t : `${t}/`;
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(sel: { key: string, url?: string, content_type?: string, bucket?: string }) => void} props.onSelect
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.initialPrefix]
 * @param {(obj: { key: string, url?: string, content_type?: string }) => boolean} [props.fileFilter]
 * @param {string} [props.localUploadAccept]
 * @param {(file: File) => string} [props.getUploadPrefix]
 * @param {string} [props.localUploadHint]
 */
export function StoragePickerModal({
  open,
  onClose,
  onSelect,
  title = 'Fayl tanlash',
  subtitle = 'Yuklash, papkalar bo‘ylab yurish yoki fayl tanlash.',
  initialPrefix = '',
  fileFilter,
  localUploadAccept,
  getUploadPrefix,
  localUploadHint,
}) {
  const [bucket, setBucket] = useState(null);
  const [prefix, setPrefix] = useState('');
  const [selected, setSelected] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const localFileRef = useRef(null);
  const newFolderTriggerRef = useRef(null);
  const newFolderPopoverRef = useRef(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const queryClient = useQueryClient();
  const bucketsQuery = useStorageBuckets(open);
  const buckets = bucketsQuery.data?.buckets ?? [];

  const browsePrefixParam = prefixForBrowseApi(prefix);
  const browseQuery = useStorageBrowseInfinite(bucket, browsePrefixParam, open && Boolean(bucket));
  const deleteMutation = useDeleteStorageObject();
  const createFolderMutation = useCreateStorageFolder();
  const uploadMutation = useUploadFile();

  const showLocalUpload = Boolean(localUploadAccept && typeof getUploadPrefix === 'function');

  useEffect(() => {
    if (!open) {
      setDeleteConfirm(null);
      return;
    }
    setPrefix(normalizeNavPrefix(initialPrefix));
    setSelected(null);
    setUploadError('');
    setNewFolderName('');
    setFolderError('');
    setNewFolderOpen(false);
    setDeleteConfirm(null);
  }, [open, initialPrefix]);

  useEffect(() => {
    setNewFolderOpen(false);
  }, [prefix]);

  useEffect(() => {
    if (!newFolderOpen) return;
    const onDown = (e) => {
      const pop = newFolderPopoverRef.current;
      const trig = newFolderTriggerRef.current;
      if (pop?.contains(e.target) || trig?.contains(e.target)) return;
      setNewFolderOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [newFolderOpen]);

  useEffect(() => {
    if (!open || bucketsQuery.isLoading) return;
    if (buckets.length === 0) {
      setBucket(null);
      return;
    }
    setBucket((prev) => {
      if (prev && buckets.includes(prev)) return prev;
      return buckets[0];
    });
  }, [open, bucketsQuery.isLoading, buckets]);

  const { folderRows, rawFiles } = useMemo(() => {
    const pages = browseQuery.data?.pages ?? [];
    const prefMap = new Map();
    const objMap = new Map();
    for (const page of pages) {
      for (const pr of page.prefixes || []) {
        const path = pr.endsWith('/') ? pr : `${pr}/`;
        prefMap.set(path, displayNameForStoragePrefix(path, prefix));
      }
      for (const ob of page.objects || []) {
        const k = ob.key;
        if (!k) continue;
        if (k.endsWith('/')) {
          if (!prefMap.has(k)) prefMap.set(k, displayNameForStoragePrefix(k, prefix));
        } else {
          objMap.set(k, ob);
        }
      }
    }
    const folderRowsSorted = [...prefMap.entries()]
      .map(([path, label]) => ({ path, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { folderRows: folderRowsSorted, rawFiles: [...objMap.values()] };
  }, [browseQuery.data?.pages, prefix]);

  const files = useMemo(() => {
    if (!fileFilter) return rawFiles;
    return rawFiles.filter(fileFilter);
  }, [rawFiles, fileFilter]);

  const segments = useMemo(() => breadcrumbFromPrefix(prefix), [prefix]);

  const onBreadcrumb = (index) => {
    if (index < 0) setPrefix('');
    else setPrefix(normalizeNavPrefix(prefixThroughSegment(segments, index)));
    setSelected(null);
  };

  const requestDeleteFile = (e, obj) => {
    e.stopPropagation();
    if (!bucket) return;
    setDeleteConfirm({ type: 'file', obj });
  };

  const requestDeleteFolder = (e, folderPath) => {
    e.stopPropagation();
    if (!bucket) return;
    setDeleteConfirm({
      type: 'folder',
      path: folderPath,
      label: displayNameForStoragePrefix(folderPath, prefix),
    });
  };

  const executeConfirmedDelete = async () => {
    if (!deleteConfirm || !bucket) return;
    try {
      if (deleteConfirm.type === 'file') {
        const { obj } = deleteConfirm;
        await deleteMutation.mutateAsync({ key: obj.key, bucket });
        if (selected?.key === obj.key) setSelected(null);
      } else {
        const key = folderDeleteKey(deleteConfirm.path);
        await deleteMutation.mutateAsync({ key, bucket });
      }
      setDeleteConfirm(null);
    } catch (err) {
      window.alert(
        err.response?.data?.message || err.response?.data?.error || err.message || 'O‘chirishda xato'
      );
    }
  };

  const confirmSelect = useCallback(() => {
    if (!selected?.key) return;
    onSelect({
      key: selected.key,
      url: selected.url,
      content_type: selected.content_type,
      bucket,
    });
    onClose();
  }, [selected, bucket, onSelect, onClose]);

  const onLocalFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    try {
      const fromPath = prefixForBrowseApi(prefix);
      const uploadPrefix = fromPath || getUploadPrefix(file);
      const data = await uploadMutation.mutateAsync({ file, prefix: uploadPrefix });
      const key = data?.key;
      if (!key) throw new Error('Yuklash javobida key yo‘q');
      await queryClient.invalidateQueries({ queryKey: ['storage-browse'] });
      onSelect({
        key,
        url: data?.url,
        content_type: file.type || undefined,
        bucket: data?.bucket,
      });
      onClose();
    } catch (err) {
      setUploadError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Yuklashda xato'
      );
    }
  };

  const onCreateFolder = async (e) => {
    e.preventDefault();
    setFolderError('');
    const path = buildFolderCreatePath(prefix, newFolderName);
    if (!path) {
      setFolderError('Papka nomini kiriting');
      return;
    }
    try {
      await createFolderMutation.mutateAsync({ bucket: bucket ?? '', path });
      setNewFolderName('');
      setFolderError('');
      setNewFolderOpen(false);
    } catch (err) {
      setFolderError(
        err.response?.data?.message || err.response?.data?.error || err.message || 'Yaratishda xato'
      );
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (newFolderOpen) {
        setNewFolderOpen(false);
        setFolderError('');
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, newFolderOpen]);

  if (!open) return null;

  const loadingBuckets = bucketsQuery.isLoading;
  const bucketsError = bucketsQuery.isError;
  const browseError = browseQuery.isError;
  const errorMessage =
    bucketsQuery.error?.response?.data?.message ||
    bucketsQuery.error?.message ||
    browseQuery.error?.response?.data?.message ||
    browseQuery.error?.message;

  const isFetchingFirst = browseQuery.isFetching && !browseQuery.data;
  const hasNext = Boolean(browseQuery.hasNextPage);
  const isEmpty =
    !isFetchingFirst &&
    folderRows.length === 0 &&
    files.length === 0 &&
    !browseQuery.isFetching;

  return (
    <>
    <div
      className={styles.overlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="storage-picker-title">
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 id="storage-picker-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Yopish">
            <X size={20} />
          </button>
        </div>

        <div className={styles.bodySimple}>
          <div className={styles.main}>
            <div className={styles.contentPad}>
              {(bucketsError || browseError) && (
                <div className={styles.errorBanner}>{errorMessage || 'So‘rovda xatolik'}</div>
              )}

              {loadingBuckets && !bucket && (
                <div className={styles.bucketsLoading}>
                  <Loader2 size={18} className={styles.spinner} aria-hidden />
                  <span>Storage ulanmoqda…</span>
                </div>
              )}

              {showLocalUpload && (
                <div className={styles.localUploadPanel}>
                  <div className={styles.localUploadTop}>
                    <div className={styles.localUploadIcon}>
                      <Upload size={20} strokeWidth={2} aria-hidden />
                    </div>
                    <div>
                      <h3 className={styles.localUploadTitle}>Kompyuterdan yuklash</h3>
                      {localUploadHint ? (
                        <p className={styles.localUploadHint}>{localUploadHint}</p>
                      ) : (
                        <p className={styles.localUploadHint}>
                          Joriy papkaga yuklanadi; agar bosh papkadasiz, avtomatik prefix ishlatiladi.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={styles.localUploadActions}>
                    <input
                      ref={localFileRef}
                      type="file"
                      accept={localUploadAccept}
                      className={styles.hiddenFileInput}
                      onChange={onLocalFileChange}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Upload size={17} />}
                      isLoading={uploadMutation.isPending}
                      aria-label="Kompyuterdan fayl tanlash"
                      onClick={() => localFileRef.current?.click()}
                    >
                      Fayl tanlash va yuklash
                    </Button>
                  </div>
                  {uploadError ? <p className={styles.uploadError}>{uploadError}</p> : null}
                </div>
              )}

              <div className={styles.browsePanel}>
                <div className={styles.browsePanelLabel}>Storage</div>
                <div className={styles.breadcrumbRowWrap}>
                  <div className={styles.breadcrumbBar}>
                    <nav className={styles.breadcrumb} aria-label="Papka yo‘li">
                      <button type="button" className={styles.crumb} onClick={() => onBreadcrumb(-1)}>
                        Bosh
                      </button>
                      {segments.map((seg, i) => (
                        <span
                          key={`${seg}-${i}`}
                          style={{ display: 'inline-flex', alignItems: 'center' }}
                        >
                          <ChevronRight size={14} className={styles.chev} aria-hidden />
                          {i === segments.length - 1 ? (
                            <span className={`${styles.crumb} ${styles.crumbCurrent}`}>{seg}</span>
                          ) : (
                            <button type="button" className={styles.crumb} onClick={() => onBreadcrumb(i)}>
                              {seg}
                            </button>
                          )}
                        </span>
                      ))}
                    </nav>
                    <button
                      ref={newFolderTriggerRef}
                      type="button"
                      className={styles.newFolderIconBtn}
                      aria-expanded={newFolderOpen}
                      aria-label="Yangi papka yaratish"
                      title="Yangi papka"
                      disabled={!bucket}
                      onClick={() => {
                        setFolderError('');
                        setNewFolderOpen((v) => !v);
                      }}
                    >
                      <FolderPlus size={20} strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                  {newFolderOpen && (
                    <div ref={newFolderPopoverRef} className={styles.newFolderPopover}>
                      <form className={styles.newFolderPopoverForm} onSubmit={onCreateFolder}>
                        <input
                          type="text"
                          className={styles.newFolderInputCompact}
                          placeholder="Papka nomi"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          disabled={createFolderMutation.isPending || !bucket}
                          autoComplete="off"
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          isLoading={createFolderMutation.isPending}
                          disabled={!bucket}
                        >
                          OK
                        </Button>
                      </form>
                      {folderError ? (
                        <p className={styles.folderErrorInline}>{folderError}</p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.scrollArea}>
              {isFetchingFirst ? (
                <div className={styles.loadingList}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={styles.skelRow} />
                  ))}
                </div>
              ) : (
                <>
                  {folderRows.length > 0 && (
                    <>
                      <div className={styles.explorerSectionTitle}>Papkalar</div>
                      <div className={styles.explorerList}>
                        {folderRows.map(({ path, label }) => (
                          <div key={path} className={styles.explorerRow}>
                            <button
                              type="button"
                              className={styles.explorerRowMain}
                              onClick={() => {
                                setPrefix(normalizeNavPrefix(path));
                                setSelected(null);
                              }}
                            >
                              <Folder size={20} className={styles.explorerFolderIcon} aria-hidden />
                              <span className={styles.explorerRowTitle}>{label}</span>
                            </button>
                            <button
                              type="button"
                              className={styles.explorerRowDelete}
                              title="Papkani o‘chirish"
                              disabled={deleteMutation.isPending}
                              onClick={(e) => requestDeleteFolder(e, path)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {files.length > 0 && (
                    <>
                      <div className={styles.explorerSectionTitle}>Fayllar</div>
                      <div className={styles.explorerList}>
                        {files.map((obj) => {
                          const src = objectPreviewSrc(obj);
                          const sel = selected?.key === obj.key;
                          return (
                            <div
                              key={obj.key}
                              tabIndex={0}
                              className={`${styles.explorerRow} ${sel ? styles.explorerRowSelected : ''}`}
                              onClick={() => setSelected(obj)}
                              onDoubleClick={() => {
                                onSelect({
                                  key: obj.key,
                                  url: obj.url,
                                  content_type: obj.content_type,
                                  bucket,
                                });
                                onClose();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelected(obj);
                                }
                              }}
                            >
                              <div className={styles.explorerThumb}>
                                {isImageObject(obj) && src ? (
                                  <img src={src} alt="" loading="lazy" />
                                ) : (
                                  <FileTypeIcon obj={obj} />
                                )}
                              </div>
                              <div className={styles.explorerRowBody}>
                                <div className={styles.explorerRowTitle} title={obj.key}>
                                  {obj.key.split('/').pop() || obj.key}
                                </div>
                                <div className={styles.explorerRowMeta}>
                                  {formatBytes(obj.size)}
                                  {obj.content_type ? ` · ${obj.content_type}` : ''}
                                </div>
                              </div>
                              <button
                                type="button"
                                className={styles.explorerRowDelete}
                                title="O‘chirish"
                                disabled={deleteMutation.isPending}
                                onClick={(e) => requestDeleteFile(e, obj)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {hasNext && (
                    <div className={styles.loadMoreWrap}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        isLoading={browseQuery.isFetchingNextPage}
                        onClick={() => browseQuery.fetchNextPage()}
                      >
                        Yana yuklash
                      </Button>
                    </div>
                  )}

                  {isEmpty && !bucketsError && (
                    <div className={styles.empty}>
                      {buckets.length === 0
                        ? 'Bucket topilmadi yoki storage sozlanmagan.'
                        : 'Bu yerda papka yoki fayl yo‘q (yoki filtr mos kelmaydi).'}
                    </div>
                  )}
                </>
              )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerHint}>
            {selected?.key ? (
              <span title={selected.key}>{selected.key.split('/').pop() || selected.key}</span>
            ) : (
              'Faylni bosing, ikki marta bosing yoki yuqoridan yuklang'
            )}
          </div>
          <div className={styles.footerActions}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Bekor
            </Button>
            <Button type="button" onClick={confirmSelect} disabled={!selected?.key}>
              Tanlash
            </Button>
          </div>
        </div>
      </div>
    </div>

    {deleteConfirm && (
      <ConfirmModal
        title={deleteConfirm.type === 'file' ? 'Faylni o‘chirish' : 'Papkani o‘chirish'}
        message={
          deleteConfirm.type === 'file' ? (
            <>
              Quyidagi fayl butunlay o‘chiriladi (storage dan):
              <br />
              <code className={styles.deleteConfirmKey}>{deleteConfirm.obj.key}</code>
            </>
          ) : (
            <>
              Papka o‘chiriladi: <strong>{deleteConfirm.label}</strong>
              <br />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Ichidagi barcha fayllar ham yo‘qolishi mumkin — ehtiyotkor bo‘ling.
              </span>
            </>
          )
        }
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeConfirmedDelete}
        isLoading={deleteMutation.isPending}
      />
    )}
    </>
  );
}
