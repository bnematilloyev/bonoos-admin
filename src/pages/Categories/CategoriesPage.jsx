import { useCallback, useEffect, useRef, useState } from 'react';
import { FolderOpen, Headphones, Music2, Pause, Pencil, Play, Plus, Trash2, Video, X } from 'lucide-react';
import { Button, Card, ConfirmModal, FormModal, Input, PageHeader, Select, Skeleton, useToast } from '../../components/ui';
import { AuditionWaveform } from '../../components/audition/AuditionWaveform';
import { AuditionVideoPlayer } from '../../components/audition/AuditionVideoPlayer';
import { StoragePickerModal } from '../../components/storage/StoragePickerModal';
import {
  useAuditions, useCategories, useCreateAudition, useCreateCategory,
  useDeleteAudition, useDeleteCategory, useUpdateAudition, useUpdateCategory,
} from '../../hooks/useApi';
import { ASSETS_PUBLIC_BASE, AUDITION_AUDIO_UPLOAD_PREFIX, AUDITION_VIDEO_UPLOAD_PREFIX } from '../../services/api';
import { extractApiError } from '../../utils/error';
import styles from './CategoriesPage.module.css';

function mediaSrc(stored) {
  if (!stored?.trim()) return null;
  const s = String(stored).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `${ASSETS_PUBLIC_BASE}/${s.replace(/^\//, '')}`;
}

const VIDEO_EXT = /\.(mp4|webm|mov|mkv|m4v|ogv)(\?|#|$)/i;
function isVideoKey(key) {
  if (!key?.trim()) return false;
  const s = String(key).trim().toLowerCase();
  return VIDEO_EXT.test(s) || s.includes('auditions/video') || s.includes('/video/');
}
function isVideoFile(file) { return file?.type?.startsWith?.('video/') || VIDEO_EXT.test(file?.name || ''); }

function auditionFileFilter(obj) {
  const ct = (obj.content_type || '').toLowerCase();
  if (ct.startsWith('audio/') || ct.startsWith('video/')) return true;
  return /\.(mp3|m4a|wav|aac|ogg|mp4|webm|mov|mkv|m4v)(\?|#|$)/i.test(obj.key || '');
}

function getMedia(item) {
  if (!item) return { kind: null, key: '' };
  const vk = item.video ?? item.video_key ?? item.video_url;
  if (vk?.trim()) return { kind: 'video', key: String(vk).trim() };
  const ak = item.audio ?? item.file ?? item.audio_key ?? item.audio_url ?? item.media_url ?? item.media;
  if (ak?.trim()) return { kind: 'audio', key: String(ak).trim() };
  return { kind: null, key: '' };
}

function resolveKind(fileKey, hint) {
  if (!fileKey?.trim()) return null;
  return hint === 'video' || isVideoKey(fileKey.trim()) ? 'video' : 'audio';
}

function displayText(item) { return String(item?.text ?? item?.title ?? ''); }

function formatDuration(sec) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—:—';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

const BARS = [40, 65, 35, 80, 45, 70, 30, 55, 60, 25, 75, 50, 45, 35, 55];
function WaveFallback() {
  return <div className={styles.waveFallback}>{BARS.map((h, i) => <span key={i} className={styles.waveFallbackBar} style={{ height: `${h}%` }} />)}</div>;
}

const LONG_PRESS_MS = 520;

function CategoryChip({ category, selected, onSelect, onEdit, onRequestDelete, deletePending }) {
  const longPressTimer = useRef(null);
  const suppressNextClick = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimer.current != null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => () => clearLongPressTimer(), []);

  const handleLabelPointerDown = (e) => {
    if (e.button !== 0) return;
    suppressNextClick.current = false;
    clearLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      suppressNextClick.current = true;
      onEdit(category);
    }, LONG_PRESS_MS);
  };

  const handleLabelPointerEnd = () => {
    clearLongPressTimer();
  };

  const handleLabelClick = (e) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      e.preventDefault();
      return;
    }
    onSelect(category);
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    clearLongPressTimer();
    suppressNextClick.current = false;
    onEdit(category);
  };

  return (
    <div
      className={`${styles.chip} ${selected ? styles.chipActive : styles.chipDim}`}
      role="listitem"
    >
      <button
        type="button"
        className={styles.chipLabel}
        onPointerDown={handleLabelPointerDown}
        onPointerUp={handleLabelPointerEnd}
        onPointerLeave={handleLabelPointerEnd}
        onPointerCancel={handleLabelPointerEnd}
        onClick={handleLabelClick}
        onDoubleClick={handleDoubleClick}
        title="Bir marta — tanlash · ikki marta yoki uzoq bosish (~0.5s) — tahrirlash"
        aria-label={`${category.name}. Tanlash. Tahrirlash uchun ikki marta bosing yoki uzoq bosing.`}
      >
        <span className={styles.chipLabelText}>{category.name}</span>
      </button>
      <button
        type="button"
        className={styles.chipRemove}
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete(category);
        }}
        disabled={deletePending}
        aria-label={`${category.name} — o'chirish`}
        title="O'chirish"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function AuditionListSkeleton() {
  return (
    <div className={styles.skeletonList} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <Skeleton height={44} width={44} className={styles.skeletonThumb} />
          <div className={styles.skeletonMeta}>
            <Skeleton height={14} width="55%" />
            <Skeleton height={12} width="35%" />
          </div>
          <Skeleton height={40} className={styles.skeletonWave} />
          <Skeleton height={14} width={40} />
          <div className={styles.skeletonActions}>
            <Skeleton height={36} width={36} />
            <Skeleton height={36} width={36} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayerBar({ nowPlaying, activeWsRef, onDismiss }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!nowPlaying) { setPlaying(false); return; }
    const ws = activeWsRef.current;
    if (!ws) { setPlaying(false); return; }
    setPlaying(ws.isPlaying());
    const u1 = ws.on('play', () => setPlaying(true));
    const u2 = ws.on('pause', () => setPlaying(false));
    const u3 = ws.on('finish', () => setPlaying(false));
    return () => { u1(); u2(); u3(); };
  }, [nowPlaying?.id, nowPlaying, activeWsRef]);

  if (!nowPlaying) return null;
  return (
    <div className={styles.playerBar}>
      <div className={styles.playerBarInner}>
        <div className={styles.playerBarThumb}><Headphones size={22} /></div>
        <div className={styles.playerBarMeta}>
          <span className={styles.playerBarTitle}>{nowPlaying.title}</span>
          <span className={styles.playerBarSub}>Bonoos</span>
        </div>
        <button type="button" className={styles.playerBarToggle} onClick={() => {
          const ws = activeWsRef.current;
          if (!ws) return;
          ws.isPlaying() ? ws.pause() : ws.play();
          setPlaying(ws.isPlaying());
        }}>{playing ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 3 }} />}</button>
        <button type="button" className={styles.iconBtn} onClick={onDismiss}><X size={18} /></button>
      </div>
    </div>
  );
}

function TrackRow({ item, categoryName, mediaKind, mediaSrc: src, onEdit, onDelete, deletePending, onWavePlay, bindWave, unbindWave, registerVideo, onVideoPlayStart }) {
  const apiDur = item.duration ?? item.duration_sec ?? item.length_sec;
  const [dur, setDur] = useState(() => (typeof apiDur === 'number' ? apiDur : null));
  const [waveErr, setWaveErr] = useState(false);

  return (
    <div className={styles.trackRow}>
      <div className={styles.trackThumb}>{mediaKind === 'video' ? <Video size={22} strokeWidth={1.75} /> : <Music2 size={22} strokeWidth={1.75} />}</div>
      <div className={styles.trackMeta}>
        <div className={styles.trackTitle}>{displayText(item) || '—'}</div>
        <div className={styles.trackSub}>ID {item.id}{item.type != null ? ` · tur ${item.type}` : ''}{mediaKind ? ` · ${mediaKind}` : ''}</div>
      </div>
      <div className={styles.trackWave}>
        {!src ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Media yo'q</span>
          : mediaKind === 'video' ? <AuditionVideoPlayer src={src} auditionId={item.id} title={displayText(item)} onPlayStart={() => onVideoPlayStart(item.id)} registerVideo={registerVideo} />
          : waveErr ? <WaveFallback />
          : <AuditionWaveform url={src} auditionId={item.id} onPlay={onWavePlay} onInstanceReady={bindWave} onInstanceDestroy={unbindWave} onDuration={setDur} onWaveError={() => setWaveErr(true)} className={styles.trackWaveCanvas} />}
      </div>
      <div className={styles.trackDuration}>{formatDuration(dur)}</div>
      <div className={styles.trackTag}><span className={styles.trackTagLabel}>Kategoriya</span><span className={styles.trackTagName}>{categoryName}</span></div>
      <div className={styles.trackActions}>
        <button type="button" className={styles.iconBtn} title="Tahrirlash" onClick={() => onEdit(item)}><Pencil size={17} /></button>
        <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="O'chirish" disabled={deletePending} onClick={() => onDelete(item)}><Trash2 size={17} /></button>
      </div>
    </div>
  );
}

export const CategoriesPage = () => {
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createAudition = useCreateAudition();
  const updateAudition = useUpdateAudition();
  const deleteAudition = useDeleteAudition();
  const { show: toast, ToastRenderer } = useToast();

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);
  const [deleteAuditionTarget, setDeleteAuditionTarget] = useState(null);

  const [auditionModal, setAuditionModal] = useState(null);
  const [audForm, setAudForm] = useState({ text: '', type: '0', duration: '0', fileKey: '', mediaKind: 'audio' });
  const [storageOpen, setStorageOpen] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);

  const didInitCat = useRef(false);
  useEffect(() => {
    if (didInitCat.current || categories.length === 0) return;
    didInitCat.current = true;
    setSelectedCategoryId((prev) => prev ?? categories[0].id);
  }, [categories]);

  const { data: auditions = [], isLoading: auditionsLoading, isError: auditionsError, error: auditionsErr } = useAuditions(selectedCategoryId);

  const waveSurfersRef = useRef(new Map());
  const videoElsRef = useRef(new Map());
  const activeWsRef = useRef(null);
  const auditionsRef = useRef(auditions);
  auditionsRef.current = auditions;

  const pauseAllVideos = useCallback(() => { videoElsRef.current.forEach((v) => { try { v.pause(); } catch {} }); }, []);
  const registerVideoEl = useCallback((id, el) => { el ? videoElsRef.current.set(id, el) : videoElsRef.current.delete(id); }, []);
  const bindWave = useCallback((id, ws) => { waveSurfersRef.current.set(id, ws); }, []);
  const unbindWave = useCallback((id) => { waveSurfersRef.current.delete(id); }, []);

  const handleVideoPlayStart = useCallback((id) => {
    waveSurfersRef.current.forEach((ws) => { if (ws.isPlaying()) ws.pause(); });
    videoElsRef.current.forEach((v, vid) => { if (String(vid) !== String(id)) try { v.pause(); } catch {} });
    activeWsRef.current = null;
    setNowPlaying(null);
  }, []);

  const handleWavePlay = useCallback((id) => {
    pauseAllVideos();
    waveSurfersRef.current.forEach((ws, oid) => { if (String(oid) !== String(id) && ws.isPlaying()) ws.pause(); });
    activeWsRef.current = waveSurfersRef.current.get(id) ?? null;
    const row = auditionsRef.current.find((a) => String(a.id) === String(id));
    setNowPlaying({ id, title: displayText(row) || 'Audio' });
  }, [pauseAllVideos]);

  const dismissPlayer = useCallback(() => { activeWsRef.current?.pause(); activeWsRef.current = null; setNowPlaying(null); }, []);

  const selectedCategory = categories.find((c) => String(c.id) === String(selectedCategoryId)) ?? null;

  const selectCategory = (item) => {
    setSelectedCategoryId(item.id);
    setAuditionModal(null);
    dismissPlayer();
  };

  /* Category CRUD */
  const openCreateCategory = () => { setCategoryName(''); setCategoryModal('create'); };
  const openEditCategory = (c) => { setCategoryName(c.name || ''); setCategoryModal({ type: 'edit', id: c.id }); };
  const submitCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      if (categoryModal === 'create') { await createCategory.mutateAsync({ name: categoryName }); toast('Kategoriya yaratildi'); }
      else { await updateCategory.mutateAsync({ id: categoryModal.id, payload: { name: categoryName } }); toast('Kategoriya yangilandi'); }
      setCategoryModal(null);
    } catch (err) { toast(extractApiError(err), 'error'); }
  };
  const confirmDeleteCategory = async () => {
    if (String(selectedCategoryId) === String(deleteCategoryTarget.id)) { setSelectedCategoryId(null); dismissPlayer(); }
    try { await deleteCategory.mutateAsync(deleteCategoryTarget.id); toast("Kategoriya o'chirildi"); setDeleteCategoryTarget(null); }
    catch (err) { toast(extractApiError(err), 'error'); }
  };

  const confirmDeleteAudition = async () => {
    if (!deleteAuditionTarget) return;
    try {
      await deleteAudition.mutateAsync(deleteAuditionTarget.id);
      toast("Media o'chirildi");
      setDeleteAuditionTarget(null);
    } catch (err) { toast(extractApiError(err), 'error'); }
  };

  /* Audition CRUD */
  const openCreateAudition = () => { setAudForm({ text: '', type: '0', duration: '0', fileKey: '', mediaKind: 'audio' }); setAuditionModal('create'); };
  const openEditAudition = (item) => {
    const m = getMedia(item);
    setAudForm({
      text: displayText(item),
      type: String(item.type ?? 0),
      duration: String(item.duration ?? item.duration_sec ?? 0),
      fileKey: m.key,
      mediaKind: m.kind === 'video' ? 'video' : 'audio',
    });
    setAuditionModal({ type: 'edit', id: item.id });
  };
  const submitAudition = async (e) => {
    e.preventDefault();
    if (!selectedCategoryId) { toast('Avval kategoriya tanlang', 'error'); return; }
    if (!audForm.text.trim()) { toast('Matn majburiy', 'error'); return; }

    const base = { category_id: selectedCategoryId, text: audForm.text.trim(), type: Number(audForm.type) || 0, duration: Math.max(0, Number(audForm.duration) || 0) };
    const key = audForm.fileKey.trim();
    const kind = resolveKind(key, audForm.mediaKind);

    try {
      if (auditionModal === 'create') {
        const created = await createAudition.mutateAsync(base);
        if (key && created?.id) {
          const mp = { ...base };
          kind === 'video' ? (mp.video = key) : (mp.audio = key);
          await updateAudition.mutateAsync({ id: created.id, payload: mp });
        }
        toast('Audition yaratildi');
      } else {
        const payload = { ...base };
        if (key) kind === 'video' ? (payload.video = key) : (payload.audio = key);
        await updateAudition.mutateAsync({ id: auditionModal.id, payload });
        toast('Audition yangilandi');
      }
      setAuditionModal(null);
    } catch (err) { toast(extractApiError(err), 'error'); }
  };

  return (
    <div className={`${styles.catalogRoot} ${nowPlaying ? styles.hasPlayer : ''}`}>
      <PageHeader
        title={`${auditionsLoading ? '…' : auditions.length} ta media${selectedCategory ? ` · ${selectedCategory.name}` : ''}`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" leftIcon={<Plus size={18} />} onClick={openCreateCategory}>Kategoriya</Button>
            {selectedCategoryId && <Button leftIcon={<Plus size={18} />} onClick={openCreateAudition}>Audition</Button>}
          </div>
        }
      />

      <div className={styles.chipsWrap}>
        {categoriesLoading ? (
          <div className={styles.chipsSkeletonRow} aria-busy="true" aria-label="Kategoriyalar yuklanmoqda">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={40} width={132} className={styles.chipSkeleton} />
            ))}
          </div>
        ) : (
          <div className={styles.chipsRow} role="list" aria-label="Kategoriyalar">
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                category={c}
                selected={String(selectedCategoryId) === String(c.id)}
                onSelect={selectCategory}
                onEdit={openEditCategory}
                onRequestDelete={(cat) => setDeleteCategoryTarget(cat)}
                deletePending={deleteCategory.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <section className={styles.trackList}>
        {selectedCategoryId == null ? <div className={styles.listEmpty}>Kategoriya tanlang</div>
          : auditionsError ? <div className={styles.listEmpty} style={{ color: 'var(--error)' }}>{extractApiError(auditionsErr)}</div>
          : auditionsLoading ? <AuditionListSkeleton />
          : auditions.length === 0 ? (
            <div className={styles.mediaEmpty}>
              <p className={styles.mediaEmptyTitle}>Hali bu yerda media yo&apos;q</p>
              <p className={styles.mediaEmptyHint}>Birinchi faylni qo&apos;shish uchun quyidagi tugmani bosing.</p>
              <Button leftIcon={<Plus size={18} />} onClick={openCreateAudition}>
                Media qo&apos;shish
              </Button>
            </div>
          )
          : auditions.map((a) => {
            const m = getMedia(a);
            return (
              <TrackRow key={`${a.id}-${m.kind ?? 'none'}-${m.key || 'empty'}`} item={a} categoryName={selectedCategory?.name ?? '—'}
                mediaKind={m.kind} mediaSrc={m.key ? mediaSrc(m.key) : null}
                onEdit={openEditAudition} onDelete={(row) => setDeleteAuditionTarget(row)} deletePending={deleteAudition.isPending}
                onWavePlay={handleWavePlay} bindWave={bindWave} unbindWave={unbindWave} registerVideo={registerVideoEl} onVideoPlayStart={handleVideoPlayStart} />
            );
          })}
      </section>

      <PlayerBar nowPlaying={nowPlaying} activeWsRef={activeWsRef} onDismiss={dismissPlayer} />

      {/* Modals */}
      {categoryModal && (
        <FormModal title={categoryModal === 'create' ? 'Yangi kategoriya' : 'Kategoriyani tahrirlash'} onClose={() => setCategoryModal(null)} onSubmit={submitCategory}
          isLoading={createCategory.isPending || updateCategory.isPending} submitLabel={categoryModal === 'create' ? 'Yaratish' : 'Saqlash'}>
          <Input label="Kategoriya nomi" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required />
        </FormModal>
      )}

      {auditionModal && (
        <FormModal title={auditionModal === 'create' ? 'Yangi audition' : 'Auditionni tahrirlash'} onClose={() => setAuditionModal(null)} onSubmit={submitAudition}
          isLoading={createAudition.isPending || updateAudition.isPending} submitLabel={auditionModal === 'create' ? 'Yaratish' : 'Saqlash'} size="lg">
          <Input label="Matn / nom" value={audForm.text} onChange={(e) => setAudForm((p) => ({ ...p, text: e.target.value }))} required />
          <Input label="Tur (type)" type="number" value={audForm.type} onChange={(e) => setAudForm((p) => ({ ...p, type: e.target.value }))} />
          <Input label="Davomiylik (soniya)" type="number" min={0} value={audForm.duration} onChange={(e) => setAudForm((p) => ({ ...p, duration: e.target.value }))} />
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Media fayl</label>
            <Button type="button" variant="secondary" size="sm" leftIcon={<FolderOpen size={17} />} onClick={() => setStorageOpen(true)}>Media tanlash</Button>
          </div>
          <Input label="Media kaliti yoki URL" value={audForm.fileKey}
            onChange={(e) => { const v = e.target.value; setAudForm((p) => ({ ...p, fileKey: v, mediaKind: isVideoKey(v) ? 'video' : 'audio' })); }}
            placeholder="auditions/audio/... yoki auditions/video/..." />
          {mediaSrc(audForm.fileKey) && resolveKind(audForm.fileKey, audForm.mediaKind) === 'video' && (
            <div style={{ maxWidth: 480 }}>
              <AuditionVideoPlayer src={mediaSrc(audForm.fileKey)} auditionId="__preview__" title={audForm.text || 'Oldindan ko\'rish'}
                onPlayStart={() => handleVideoPlayStart('__preview__')} registerVideo={registerVideoEl} />
            </div>
          )}
          {mediaSrc(audForm.fileKey) && resolveKind(audForm.fileKey, audForm.mediaKind) === 'audio' && (
            <audio controls src={mediaSrc(audForm.fileKey)} preload="metadata" style={{ width: '100%', maxWidth: 400, borderRadius: 8 }}
              onLoadedMetadata={(e) => { const s = Math.round(e.currentTarget.duration); if (Number.isFinite(s) && s >= 0) setAudForm((p) => p.duration === '0' || p.duration === '' ? { ...p, duration: String(s) } : p); }} />
          )}
        </FormModal>
      )}

      {deleteCategoryTarget && (
        <ConfirmModal message={<><strong>{deleteCategoryTarget.name}</strong> kategoriyasi o&apos;chiriladi.</>} onClose={() => setDeleteCategoryTarget(null)} onConfirm={confirmDeleteCategory} isLoading={deleteCategory.isPending} />
      )}

      {deleteAuditionTarget && (
        <ConfirmModal
          message={<>Quyidagi media o&apos;chiriladi: <strong>{displayText(deleteAuditionTarget) || `ID ${deleteAuditionTarget.id}`}</strong></>}
          onClose={() => setDeleteAuditionTarget(null)}
          onConfirm={confirmDeleteAudition}
          isLoading={deleteAudition.isPending}
        />
      )}

      <StoragePickerModal open={storageOpen} onClose={() => setStorageOpen(false)} title="Media tanlash" subtitle="Kompyuterdan yuklang yoki storagedan tanlang"
        initialPrefix="" fileFilter={auditionFileFilter} localUploadAccept="audio/*,video/*,.mp3,.m4a,.wav,.aac,.ogg,.mp4,.webm,.mov,.mkv,.m4v"
        getUploadPrefix={(file) => isVideoFile(file) ? AUDITION_VIDEO_UPLOAD_PREFIX : AUDITION_AUDIO_UPLOAD_PREFIX}
        localUploadHint="Audio yoki video faylni tanlang"
        onSelect={(sel) => setAudForm((p) => ({ ...p, fileKey: sel.key, mediaKind: isVideoKey(sel.key) ? 'video' : 'audio' }))} />

      <ToastRenderer />
    </div>
  );
};
