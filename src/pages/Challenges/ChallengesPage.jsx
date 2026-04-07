import { useEffect, useMemo, useState } from 'react';
import {
  Calendar, Clock, Edit2, Layers, Link2, Music, Plus, Search,
  Target, Trash2, Trophy, Unlink, Zap,
} from 'lucide-react';
import {
  Badge, Button, Card, ConfirmModal, FormModal, Input,
  Modal, PageHeader, Select, Tabs, useToast,
} from '../../components/ui';
import {
  useAddChallengeMeditation, useAuditions, useCategories,
  useChallengeMeditations, useChallengeTypes, useChallenges,
  useCreateChallenge, useCreateChallengeType, useDeleteChallenge,
  useDeleteChallengeType, useRemoveChallengeMeditation,
  useUpdateChallenge, useUpdateChallengeType,
} from '../../hooks/useApi';
import { extractApiError } from '../../utils/error';
import styles from './ChallengesPage.module.css';

const TAB_ITEMS = [
  { value: 'challenges', label: "Challenge'lar", icon: <Target size={16} /> },
  { value: 'types', label: 'Turlar', icon: <Layers size={16} /> },
];

function typeLabel(t) { return t?.name ?? t?.title ?? `#${t?.id}`; }

function challengeLabel(c) {
  if (c?.name ?? c?.title) return String(c.name ?? c.title);
  if (c?.finish_at) {
    try { return new Date(c.finish_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return String(c.finish_at); }
  }
  return `Challenge #${c?.id ?? '—'}`;
}

function challengeTypeId(c) { return c?.challenge_type_id ?? c?.type_id ?? c?.challengeTypeId; }
function meditationRowId(row) { return row?.id ?? row?.pivot_id ?? row?.meditation_id ?? row?.audition_id; }
function meditationDisplay(row) {
  return { mid: row?.meditation_id ?? row?.audition_id ?? row?.id, title: row?.title ?? row?.text ?? row?.name };
}
function auditionDisplayText(item) { return item?.text ?? item?.title ?? ''; }

function finishAtToLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d - Date.now()) / 86400000);
}

function statusInfo(status) {
  const s = Number(status);
  if (s === 1) return { text: 'Faol', variant: 'success' };
  if (s === 0) return { text: 'Nofaol', variant: 'default' };
  return { text: `Status ${status ?? '—'}`, variant: 'default' };
}

const emptyTypeForm = () => ({ name: '', days: '7', status: '1' });
const emptyChallengeForm = () => ({ challenge_type_id: '', status: '1', finish_at: '' });

/* ─────────────────────────────────────────────
   Meditation Link Modal
   ───────────────────────────────────────────── */
function LinkMeditationModal({ challengeId, challengeName, onClose, onLinked }) {
  const { data: categories = [] } = useCategories();
  const [catId, setCatId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const { data: auditions = [], isLoading: audLoading } = useAuditions(catId || null);
  const addMed = useAddChallengeMeditation();
  const { show: toast, ToastRenderer } = useToast();

  const filtered = useMemo(() => {
    if (!search.trim()) return auditions;
    const q = search.toLowerCase();
    return auditions.filter((a) => auditionDisplayText(a).toLowerCase().includes(q) || String(a.id).includes(q));
  }, [auditions, search]);

  const catOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));

  const onLink = async () => {
    const n = Number(selectedId);
    if (!Number.isFinite(n) || n <= 0) return;
    try {
      await addMed.mutateAsync({ challengeId, payload: { audition_id: n } });
      onLinked?.();
      onClose();
    } catch (err) {
      try {
        await addMed.mutateAsync({ challengeId, payload: { meditation_id: n } });
        onLinked?.();
        onClose();
      } catch { toast(extractApiError(err), 'error'); }
    }
  };

  return (
    <Modal title="Meditsiya biriktirish" onClose={onClose} size="lg">
      <p className={styles.linkHint}>
        <strong>{challengeName}</strong> uchun meditsiya tanlang
      </p>

      <div className={styles.linkFilters}>
        <Select label="Kategoriya" options={catOptions} placeholder="Kategoriya tanlang" value={catId}
          onChange={(e) => { setCatId(e.target.value); setSelectedId(''); setSearch(''); }} />
        {catId && (
          <Input placeholder="Qidirish..." leftIcon={<Search size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} />
        )}
      </div>

      <div className={styles.linkList}>
        {!catId ? (
          <div className={styles.linkEmpty}>
            <Music size={28} strokeWidth={1.5} />
            <span>Avval kategoriya tanlang</span>
          </div>
        ) : audLoading ? (
          <div className={styles.linkEmpty}><span>Yuklanmoqda...</span></div>
        ) : filtered.length === 0 ? (
          <div className={styles.linkEmpty}><span>{search ? 'Natija topilmadi' : "Bu kategoriyada audition yo'q"}</span></div>
        ) : (
          filtered.map((a) => {
            const active = String(selectedId) === String(a.id);
            return (
              <button key={a.id} type="button" className={`${styles.linkItem} ${active ? styles.linkItemActive : ''}`}
                onClick={() => setSelectedId(String(a.id))}>
                <div className={`${styles.linkItemIcon} ${active ? styles.linkItemIconActive : ''}`}><Music size={16} /></div>
                <div className={styles.linkItemBody}>
                  <span className={styles.linkItemTitle}>{auditionDisplayText(a) || 'Nomsiz'}</span>
                  <span className={styles.linkItemSub}>ID {a.id}</span>
                </div>
                {active && <Zap size={16} className={styles.linkItemCheck} />}
              </button>
            );
          })
        )}
      </div>

      <div className={styles.linkFooter}>
        <Button variant="secondary" onClick={onClose}>Bekor</Button>
        <Button leftIcon={<Link2 size={16} />} disabled={!selectedId} isLoading={addMed.isPending} onClick={onLink}>Biriktirish</Button>
      </div>
      <ToastRenderer />
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   Challenge Detail Panel (right side)
   ───────────────────────────────────────────── */
function ChallengeDetail({ challenge, types, onEdit, onDelete }) {
  const tid = challengeTypeId(challenge);
  const tname = types.find((x) => String(x.id) === String(tid));
  const st = statusInfo(challenge.status);
  const days = daysUntil(challenge.finish_at);

  const removeMed = useRemoveChallengeMeditation();
  const { data: meditations = [], isLoading: medLoading, isError: medError } = useChallengeMeditations(challenge.id);
  const { show: toast, ToastRenderer } = useToast();
  const [linkOpen, setLinkOpen] = useState(false);

  return (
    <div className={styles.detail}>
      {/* Header */}
      <div className={styles.detailHead}>
        <div className={styles.detailHeadLeft}>
          <span className={styles.detailId}>#{challenge.id}</span>
          <Badge variant={st.variant}>{st.text}</Badge>
          {tname && <Badge variant="info">{typeLabel(tname)}</Badge>}
        </div>
        <div className={styles.detailHeadActions}>
          <button type="button" className={styles.iconBtn} title="Tahrirlash" onClick={() => onEdit(challenge)}><Edit2 size={16} /></button>
          <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="O'chirish" onClick={() => onDelete(challenge)}><Trash2 size={16} /></button>
        </div>
      </div>

      <h2 className={styles.detailTitle}>{challengeLabel(challenge)}</h2>

      {/* Time info */}
      <div className={styles.detailTimeRow}>
        <div className={styles.detailTimeBlock}>
          <Calendar size={15} />
          <div>
            <div className={styles.detailTimeLabel}>Tugash sanasi</div>
            <div className={styles.detailTimeValue}>{formatDate(challenge.finish_at)}</div>
          </div>
        </div>
        <div className={styles.detailTimeBlock}>
          <Clock size={15} />
          <div>
            <div className={styles.detailTimeLabel}>Soat</div>
            <div className={styles.detailTimeValue}>{formatTime(challenge.finish_at) || '—'}</div>
          </div>
        </div>
        {days != null && (
          <div className={`${styles.detailDaysChip} ${days < 0 ? styles.daysExpired : days <= 3 ? styles.daysWarn : styles.daysOk}`}>
            {days < 0 ? `${Math.abs(days)} kun oldin tugagan` : days === 0 ? 'Bugun tugaydi' : `${days} kun qoldi`}
          </div>
        )}
      </div>

      {/* Meditations */}
      <div className={styles.detailMedSection}>
        <div className={styles.detailMedHeader}>
          <span className={styles.detailMedTitle}>
            <Link2 size={15} />
            Meditsiyalar
            {!medLoading && <span className={styles.detailMedCount}>{meditations.length}</span>}
          </span>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setLinkOpen(true)}>Biriktirish</Button>
        </div>

        {medError ? (
          <p className={styles.detailMedHint}>Yuklab bo'lmadi</p>
        ) : medLoading ? (
          <div className={styles.medSkeleton}><div /><div /><div /></div>
        ) : meditations.length === 0 ? (
          <div className={styles.medEmpty}>
            <Music size={24} strokeWidth={1.5} />
            <span>Hali meditsiya biriktirilmagan</span>
            <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={() => setLinkOpen(true)}>
              Birinchisini biriktiring
            </Button>
          </div>
        ) : (
          <ul className={styles.medList}>
            {meditations.map((row) => {
              const { mid, title } = meditationDisplay(row);
              const delId = meditationRowId(row);
              return (
                <li key={String(delId)} className={styles.medItem}>
                  <div className={styles.medItemIcon}><Music size={15} /></div>
                  <div className={styles.medItemBody}>
                    <span className={styles.medItemTitle}>{title || 'Nomsiz'}</span>
                    <span className={styles.medItemSub}>ID {mid}</span>
                  </div>
                  <button type="button" className={styles.medRemoveBtn} title="Ajratish" disabled={removeMed.isPending}
                    onClick={() => {
                      if (delId != null) removeMed.mutate(
                        { challengeId: challenge.id, meditationId: delId },
                        { onSuccess: () => toast('Ajratildi'), onError: (err) => toast(extractApiError(err), 'error') },
                      );
                    }}>
                    <Unlink size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {linkOpen && (
        <LinkMeditationModal
          challengeId={challenge.id}
          challengeName={challengeLabel(challenge)}
          onClose={() => setLinkOpen(false)}
          onLinked={() => toast('Meditsiya ulandi')}
        />
      )}
      <ToastRenderer />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
   ───────────────────────────────────────────── */
export const ChallengesPage = () => {
  const [tab, setTab] = useState('challenges');
  const { data: types = [], isLoading: typesLoading } = useChallengeTypes();
  const [filterTypeId, setFilterTypeId] = useState('');
  const { data: challenges = [], isLoading: challengesLoading } = useChallenges(filterTypeId === '' ? null : filterTypeId);

  const createType = useCreateChallengeType();
  const updateType = useUpdateChallengeType();
  const deleteType = useDeleteChallengeType();
  const createChallenge = useCreateChallenge();
  const updateChallenge = useUpdateChallenge();
  const deleteChallenge = useDeleteChallenge();
  const { show: toast, ToastRenderer } = useToast();

  const [typeModal, setTypeModal] = useState(null);
  const [typeForm, setTypeForm] = useState(emptyTypeForm);
  const [deleteTypeTarget, setDeleteTypeTarget] = useState(null);

  const [challengeModal, setChallengeModal] = useState(null);
  const [challengeForm, setChallengeForm] = useState(emptyChallengeForm);
  const [deleteChallengeTarget, setDeleteChallengeTarget] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const stats = useMemo(() => ({ typeCount: types.length, challengeCount: challenges.length }), [types.length, challenges.length]);
  const typeOptions = types.map((t) => ({ value: String(t.id), label: typeLabel(t) }));

  useEffect(() => {
    if (challenges.length && !challenges.find((c) => String(c.id) === String(selectedId))) {
      setSelectedId(challenges[0].id);
    }
  }, [challenges, selectedId]);

  /* ── Type CRUD ── */
  const openCreateType = () => { setTypeForm(emptyTypeForm()); setTypeModal('create'); };
  const openEditType = (t) => {
    setTypeForm({ name: t.name ?? '', days: String(t.days ?? t.sort ?? '7'), status: String(t.status ?? '1') });
    setTypeModal({ type: 'edit', id: t.id });
  };
  const submitType = async (e) => {
    e.preventDefault();
    const name = typeForm.name.trim();
    const days = Number(typeForm.days);
    const status = Number(typeForm.status);
    if (!name) { toast('Tur nomi majburiy', 'error'); return; }
    if (!Number.isFinite(days) || days < 1) { toast('Kunlar musbat son bo\'lsin', 'error'); return; }
    try {
      if (typeModal === 'create') { await createType.mutateAsync({ name, days, status }); toast('Tur yaratildi'); }
      else { await updateType.mutateAsync({ id: typeModal.id, payload: { name, days, status } }); toast('Tur yangilandi'); }
      setTypeModal(null);
    } catch (err) { toast(extractApiError(err), 'error'); }
  };
  const confirmDeleteType = async () => {
    try { await deleteType.mutateAsync(deleteTypeTarget.id); toast("Tur o'chirildi"); setDeleteTypeTarget(null); }
    catch (err) { toast(extractApiError(err), 'error'); }
  };

  /* ── Challenge CRUD ── */
  const openCreateChallenge = () => { setChallengeForm(emptyChallengeForm()); setChallengeModal('create'); };
  const openEditChallenge = (c) => {
    const tid = challengeTypeId(c);
    setChallengeForm({ challenge_type_id: tid != null ? String(tid) : '', status: String(c.status ?? '1'), finish_at: finishAtToLocal(c.finish_at) });
    setChallengeModal({ type: 'edit', id: c.id });
  };
  const submitChallenge = async (e) => {
    e.preventDefault();
    const tid = challengeForm.challenge_type_id;
    if (!tid) { toast('Tur tanlang', 'error'); return; }
    const raw = challengeForm.finish_at?.trim();
    if (!raw) { toast('Tugash vaqti majburiy', 'error'); return; }
    const ms = Date.parse(raw);
    if (Number.isNaN(ms)) { toast('Noto\'g\'ri vaqt', 'error'); return; }
    const payload = { challenge_type_id: Number(tid), status: Number(challengeForm.status) || 1, finish_at: new Date(ms).toISOString() };
    try {
      if (challengeModal === 'create') {
        const res = await createChallenge.mutateAsync(payload);
        toast('Challenge yaratildi');
        if (res?.id) setSelectedId(res.id);
      } else {
        await updateChallenge.mutateAsync({ id: challengeModal.id, payload });
        toast('Challenge yangilandi');
      }
      setChallengeModal(null);
    } catch (err) { toast(extractApiError(err), 'error'); }
  };
  const confirmDeleteChallenge = async () => {
    try {
      if (String(selectedId) === String(deleteChallengeTarget.id)) setSelectedId(null);
      await deleteChallenge.mutateAsync(deleteChallengeTarget.id);
      toast("Challenge o'chirildi");
      setDeleteChallengeTarget(null);
    } catch (err) { toast(extractApiError(err), 'error'); }
  };

  const selected = challenges.find((c) => String(c.id) === String(selectedId));

  return (
    <div className={styles.root}>
      <PageHeader
        title={<><Trophy size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />Challenge'lar</>}
        description={`${stats.typeCount} tur · ${stats.challengeCount} challenge`}
        actions={
          tab === 'types'
            ? <Button leftIcon={<Plus size={18} />} onClick={openCreateType}>Yangi tur</Button>
            : <Button leftIcon={<Plus size={18} />} onClick={openCreateChallenge}>Yangi challenge</Button>
        }
      />

      <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />

      {/* ── TYPES TAB ── */}
      {tab === 'types' && (
        <Card>
          {typesLoading ? <p className={styles.emptyMsg}>Yuklanmoqda...</p> : types.length === 0 ? (
            <div className={styles.emptyBlock}>
              <Layers size={36} strokeWidth={1.5} />
              <p>Hali challenge turi yaratilmagan</p>
              <Button size="sm" leftIcon={<Plus size={16} />} onClick={openCreateType}>Yangi tur</Button>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>ID</th><th>Nom</th><th>Kunlar</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {types.map((t) => {
                    const st = statusInfo(t.status);
                    return (
                      <tr key={t.id}>
                        <td>{t.id}</td>
                        <td className={styles.cellBold}>{typeLabel(t)}</td>
                        <td><Badge variant="default">{t.days ?? t.sort ?? '—'} kun</Badge></td>
                        <td><Badge variant={st.variant}>{st.text}</Badge></td>
                        <td>
                          <div className={styles.actions}>
                            <Button size="sm" variant="ghost" onClick={() => openEditType(t)}>Tahrir</Button>
                            <Button size="sm" variant="danger" onClick={() => setDeleteTypeTarget(t)}>O'chirish</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── CHALLENGES TAB ── */}
      {tab === 'challenges' && (
        <>
          {/* Filter pills */}
          <div className={styles.pills}>
            <button type="button" className={`${styles.pill} ${filterTypeId === '' ? styles.pillOn : ''}`} onClick={() => setFilterTypeId('')}>
              Hammasi
            </button>
            {types.map((t) => (
              <button key={t.id} type="button" className={`${styles.pill} ${String(filterTypeId) === String(t.id) ? styles.pillOn : ''}`}
                onClick={() => setFilterTypeId(String(t.id))}>
                {typeLabel(t)}
              </button>
            ))}
          </div>

          {challengesLoading ? <p className={styles.emptyMsg}>Yuklanmoqda...</p> : challenges.length === 0 ? (
            <div className={styles.emptyBlock}>
              <Target size={40} strokeWidth={1.5} />
              <p>Challenge yo'q</p>
              <Button size="sm" leftIcon={<Plus size={16} />} onClick={openCreateChallenge}>Yangi challenge</Button>
            </div>
          ) : (
            <div className={styles.master}>
              {/* ---- List (left) ---- */}
              <div className={styles.listCol}>
                <div className={styles.listHeader}>
                  <span className={styles.listTitle}>{challenges.length} challenge</span>
                </div>
                <div className={styles.list}>
                  {challenges.map((c) => {
                    const tid = challengeTypeId(c);
                    const tname = types.find((x) => String(x.id) === String(tid));
                    const active = String(selectedId) === String(c.id);
                    const st = statusInfo(c.status);
                    const days = daysUntil(c.finish_at);

                    return (
                      <button key={c.id} type="button" className={`${styles.listItem} ${active ? styles.listItemActive : ''}`}
                        onClick={() => setSelectedId(c.id)}>
                        <div className={`${styles.listDot} ${st.variant === 'success' ? styles.dotGreen : styles.dotGray}`} />
                        <div className={styles.listItemBody}>
                          <span className={styles.listItemName}>{challengeLabel(c)}</span>
                          <span className={styles.listItemMeta}>
                            {tname ? typeLabel(tname) : ''}
                            {tname && c.finish_at ? ' · ' : ''}
                            {formatDate(c.finish_at)}
                            {days != null && (
                              <span className={days < 0 ? styles.txtDanger : days <= 3 ? styles.txtWarn : ''}>
                                {' · '}{days < 0 ? 'Tugagan' : days === 0 ? 'Bugun' : `${days}k`}
                              </span>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ---- Detail (right) ---- */}
              <div className={styles.detailCol}>
                {selected ? (
                  <ChallengeDetail
                    key={selected.id}
                    challenge={selected}
                    types={types}
                    onEdit={openEditChallenge}
                    onDelete={setDeleteChallengeTarget}
                  />
                ) : (
                  <div className={styles.detailEmpty}>
                    <Target size={36} strokeWidth={1.2} />
                    <span>Challenge tanlang</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MODALS ── */}
      {typeModal && (
        <FormModal title={typeModal === 'create' ? 'Yangi challenge turi' : 'Turni tahrirlash'} onClose={() => setTypeModal(null)}
          onSubmit={submitType} isLoading={createType.isPending || updateType.isPending}
          submitLabel={typeModal === 'create' ? 'Yaratish' : 'Saqlash'}>
          <Input label="Tur nomi" value={typeForm.name} onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))} placeholder="Masalan: 7 kunlik" required />
          <Input label="Davomiyligi (kun)" type="number" min={1} value={typeForm.days} onChange={(e) => setTypeForm((p) => ({ ...p, days: e.target.value }))} required />
          <Select label="Holat" options={[{ value: '1', label: 'Faol' }, { value: '0', label: 'Nofaol' }]} value={typeForm.status} onChange={(e) => setTypeForm((p) => ({ ...p, status: e.target.value }))} />
        </FormModal>
      )}

      {challengeModal && (
        <FormModal title={challengeModal === 'create' ? 'Yangi challenge' : 'Challengeni tahrirlash'} onClose={() => setChallengeModal(null)}
          onSubmit={submitChallenge} isLoading={createChallenge.isPending || updateChallenge.isPending}
          submitLabel={challengeModal === 'create' ? 'Yaratish' : 'Saqlash'}>
          <Select label="Challenge turi" options={typeOptions} placeholder="Tur tanlang" value={challengeForm.challenge_type_id}
            onChange={(e) => setChallengeForm((p) => ({ ...p, challenge_type_id: e.target.value }))} />
          <Select label="Holat" options={[{ value: '1', label: 'Faol' }, { value: '0', label: 'Nofaol' }]} value={challengeForm.status}
            onChange={(e) => setChallengeForm((p) => ({ ...p, status: e.target.value }))} />
          <Input label="Tugash vaqti" type="datetime-local" value={challengeForm.finish_at}
            onChange={(e) => setChallengeForm((p) => ({ ...p, finish_at: e.target.value }))} />
        </FormModal>
      )}

      {deleteTypeTarget && <ConfirmModal message={<><strong>{typeLabel(deleteTypeTarget)}</strong> turi o'chiriladi.</>} onClose={() => setDeleteTypeTarget(null)} onConfirm={confirmDeleteType} isLoading={deleteType.isPending} />}
      {deleteChallengeTarget && <ConfirmModal message={<><strong>{challengeLabel(deleteChallengeTarget)}</strong> o'chiriladi. Bog'langan meditsiyalar ham ajraladi.</>} onClose={() => setDeleteChallengeTarget(null)} onConfirm={confirmDeleteChallenge} isLoading={deleteChallenge.isPending} />}

      <ToastRenderer />
    </div>
  );
};
