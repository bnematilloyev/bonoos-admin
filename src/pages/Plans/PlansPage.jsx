import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, ConfirmModal, FormModal, Input, PageHeader, Textarea, useToast } from '../../components/ui';
import { useCreatePlan, useDeletePlan, usePlans, useUpdatePlan } from '../../hooks/useApi';
import { formatIsoDateTime, formatUzs } from '../../utils/adminDisplay';
import { extractApiError } from '../../utils/error';
import styles from '../admin.module.css';

const emptyForm = () => ({ name: '', price: '', duration_days: '', description: '' });

export const PlansPage = () => {
  const { data: plans = [], isLoading } = usePlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const { show: toast, ToastRenderer } = useToast();

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const openCreate = () => {
    setForm(emptyForm());
    setModal('create');
  };

  const openEdit = (plan) => {
    setForm({
      name: plan.name ?? '',
      price: String(plan.price ?? ''),
      duration_days: String(plan.duration_days ?? ''),
      description: plan.description ?? '',
    });
    setModal({ type: 'edit', id: plan.id });
  };

  const submitForm = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      price: Number(form.price),
      duration_days: Number(form.duration_days),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };

    try {
      if (modal === 'create') {
        await createPlan.mutateAsync(payload);
        toast('Tarif yaratildi');
      } else {
        await updatePlan.mutateAsync({ id: modal.id, payload });
        toast('Tarif yangilandi');
      }
      setModal(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  const confirmDelete = async () => {
    try {
      await deletePlan.mutateAsync(deleteTarget.id);
      toast("Tarif o'chirildi");
      setDeleteTarget(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tariflar"
        description={`${plans.length} ta tarif`}
        actions={
          <Button leftIcon={<Plus size={18} />} onClick={openCreate}>Yangi tarif</Button>
        }
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
                  <th>Nomi</th>
                  <th>Narx</th>
                  <th>Kunlar</th>
                  <th>Tavsif</th>
                  <th>Yaratilgan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td>{plan.id}</td>
                    <td>{plan.name}</td>
                    <td className={styles.nowrap}>{formatUzs(plan.price)}</td>
                    <td>{plan.duration_days}</td>
                    <td className={styles.textCell} title={plan.description}>{plan.description || '—'}</td>
                    <td className={styles.nowrap}>{formatIsoDateTime(plan.created_at)}</td>
                    <td>
                      <div className={styles.actions}>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(plan)}>Tahrirlash</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(plan)}>O'chirish</Button>
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
          title={modal === 'create' ? 'Yangi tarif' : 'Tarifni tahrirlash'}
          onClose={() => setModal(null)}
          onSubmit={submitForm}
          isLoading={createPlan.isPending || updatePlan.isPending}
          submitLabel={modal === 'create' ? 'Yaratish' : 'Saqlash'}
        >
          <Input label="Nomi" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
          <Input label="Narx (so'm)" type="number" value={form.price} onChange={(e) => setField('price', e.target.value)} required />
          <Input label="Davomiyligi (kun)" type="number" value={form.duration_days} onChange={(e) => setField('duration_days', e.target.value)} required />
          <Textarea label="Tavsif (ixtiyoriy)" value={form.description} onChange={(e) => setField('description', e.target.value)} rows={3} />
        </FormModal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={<><strong>{deleteTarget.name}</strong> tarifi o&apos;chiriladi.</>}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          isLoading={deletePlan.isPending}
        />
      )}

      <ToastRenderer />
    </div>
  );
};
