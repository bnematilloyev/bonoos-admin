import { useState } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Button, Card, ConfirmModal, FormModal, Input, PageHeader, Textarea, useToast } from '../../components/ui';
import { StoragePickerModal } from '../../components/storage/StoragePickerModal';
import { useCreateQuote, useDeleteQuote, useQuotes, useUpdateQuote } from '../../hooks/useApi';
import { ASSETS_PUBLIC_BASE, QUOTE_IMAGE_UPLOAD_PREFIX } from '../../services/api';
import { extractApiError } from '../../utils/error';
import styles from '../admin.module.css';

function quoteImageFileFilter(obj) {
  const ct = (obj.content_type || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?|#|$)/i.test(obj.key || '');
}

function quoteImageSrc(stored) {
  if (!stored?.trim()) return null;
  const s = String(stored).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `${ASSETS_PUBLIC_BASE}/${s.replace(/^\//, '')}`;
}

const emptyForm = () => ({ text: '', image: '', status: '' });

export const QuotesPage = () => {
  const { data = [], isLoading } = useQuotes();
  const createMutation = useCreateQuote();
  const updateMutation = useUpdateQuote();
  const deleteMutation = useDeleteQuote();
  const { show: toast, ToastRenderer } = useToast();

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [storageOpen, setStorageOpen] = useState(false);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const buildPayload = () => {
    const payload = { text: form.text.trim() };
    if (form.image.trim()) payload.image = form.image.trim();
    if (form.status !== '' && form.status != null) {
      const n = Number(form.status);
      if (!Number.isNaN(n)) payload.status = n;
    }
    return payload;
  };

  const openCreate = () => { setForm(emptyForm()); setModal('create'); };

  const openEdit = (item) => {
    setForm({
      text: item.text ?? '',
      image: item.image ?? '',
      status: item.status != null ? String(item.status) : '',
    });
    setModal({ type: 'edit', id: item.id });
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) { toast('Matn majburiy', 'error'); return; }
    try {
      if (modal === 'create') {
        await createMutation.mutateAsync(buildPayload());
        toast('Iqtibos yaratildi');
      } else {
        await updateMutation.mutateAsync({ id: modal.id, payload: buildPayload() });
        toast('Iqtibos yangilandi');
      }
      setModal(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast("Iqtibos o'chirildi");
      setDeleteTarget(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Iqtiboslar"
        description={`${data.length} ta iqtibos`}
        actions={<Button leftIcon={<Plus size={18} />} onClick={openCreate}>Yangi iqtibos</Button>}
      />

      <Card>
        {isLoading ? (
          <p style={{ color: 'var(--text-muted)', padding: 20 }}>Yuklanmoqda...</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Rasm</th>
                  <th>Matn</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      {quoteImageSrc(item.image) ? (
                        <img className={styles.thumb} src={quoteImageSrc(item.image)} alt="" loading="lazy" />
                      ) : '—'}
                    </td>
                    <td className={styles.textCell} title={item.text}>{item.text ?? '—'}</td>
                    <td>{item.status ?? '—'}</td>
                    <td>
                      <div className={styles.actions}>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>Tahrirlash</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>O'chirish</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && (
        <FormModal
          title={modal === 'create' ? 'Yangi iqtibos' : 'Iqtibosni tahrirlash'}
          onClose={() => setModal(null)}
          onSubmit={submitForm}
          isLoading={createMutation.isPending || updateMutation.isPending}
          submitLabel={modal === 'create' ? 'Yaratish' : 'Saqlash'}
        >
          <Textarea label="Matn" value={form.text} onChange={(e) => setField('text', e.target.value)} placeholder="Iqtibos matni..." required />
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Rasm</label>
            <Button type="button" variant="secondary" size="sm" leftIcon={<FolderOpen size={17} />} onClick={() => setStorageOpen(true)}>
              Rasmni tanlash
            </Button>
          </div>
          <Input label="Rasm kaliti yoki URL" value={form.image} onChange={(e) => setField('image', e.target.value)} placeholder="auditions/images/..." />
          {quoteImageSrc(form.image) && (
            <div className={styles.previewRow}>
              <img className={styles.previewImg} src={quoteImageSrc(form.image)} alt="" />
            </div>
          )}
          <Input label="Status" type="number" value={form.status} onChange={(e) => setField('status', e.target.value)} placeholder="Ixtiyoriy" />
        </FormModal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={<>Ushbu iqtibos o&apos;chiriladi.</>}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          isLoading={deleteMutation.isPending}
        />
      )}

      <StoragePickerModal
        open={storageOpen}
        onClose={() => setStorageOpen(false)}
        title="Rasm tanlash"
        subtitle="Kompyuterdan yuklang yoki storagedan tanlang."
        initialPrefix={QUOTE_IMAGE_UPLOAD_PREFIX}
        fileFilter={quoteImageFileFilter}
        localUploadAccept="image/*"
        getUploadPrefix={() => QUOTE_IMAGE_UPLOAD_PREFIX}
        localUploadHint="Rasm fayli tanlang"
        onSelect={(sel) => setField('image', sel.key)}
      />

      <ToastRenderer />
    </div>
  );
};
