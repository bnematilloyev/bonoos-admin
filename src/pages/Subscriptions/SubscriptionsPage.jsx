import { useMemo, useState } from 'react';
import { Badge, Button, Card, FormModal, Input, PageHeader, Pagination, Select, Skeleton, useToast } from '../../components/ui';
import { usePatchUserSubscription, useUserSubscriptions } from '../../hooks/useApi';
import { formatIsoDateTime, subscriptionStatusLabel } from '../../utils/adminDisplay';
import { extractApiError } from '../../utils/error';
import styles from '../admin.module.css';

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: '0', label: 'Nofaol / kutish' },
  { value: '1', label: 'Faol' },
  { value: '2', label: 'Tugagan' },
];

function toDatetimeLocal(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const SubscriptionsPage = () => {
  const [offset, setOffset] = useState(0);
  const params = useMemo(() => ({ limit: PAGE_SIZE, offset }), [offset]);
  const { data, isLoading, isError, error } = useUserSubscriptions(params);
  const patchSub = usePatchUserSubscription();
  const { show: toast, ToastRenderer } = useToast();

  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({ end_at: '', status: '1' });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const openEdit = (row) => {
    const end = row.end_at ?? row.ends_at ?? row.endAt;
    setForm({
      end_at: toDatetimeLocal(typeof end === 'string' ? end : ''),
      status: String(row.status ?? '1'),
    });
    setEditRow(row);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = {};
    if (form.end_at) {
      const d = new Date(form.end_at);
      if (!Number.isNaN(d.getTime())) payload.end_at = d.toISOString();
    }
    if (form.status !== '') payload.status = Number(form.status);
    if (Object.keys(payload).length === 0) {
      toast('Kamida bitta maydonni yangilang', 'error');
      return;
    }
    try {
      await patchSub.mutateAsync({ id: editRow.id, payload });
      toast('Obuna yangilandi');
      setEditRow(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Obunalar" description={`Jami: ${total.toLocaleString('uz-UZ')}`} />

      {isError && (
        <Card style={{ color: 'var(--error)', fontSize: 14 }}>
          {error?.response?.data?.error || error?.message}
        </Card>
      )}

      <Card>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} height={48} />)}
          </div>
        ) : (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Tarif</th>
                    <th>Boshlanish</th>
                    <th>Tugash</th>
                    <th>Holat</th>
                    <th>Yaratilgan</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const st = subscriptionStatusLabel(row.status);
                    return (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.user_id}</td>
                        <td>{row.plan_name || row.plan_id}</td>
                        <td className={styles.nowrap}>{formatIsoDateTime(row.start_at)}</td>
                        <td className={styles.nowrap}>{formatIsoDateTime(row.end_at)}</td>
                        <td><Badge variant={st.variant}>{st.text}</Badge></td>
                        <td className={styles.nowrap}>{formatIsoDateTime(row.created_at)}</td>
                        <td>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Tahrirlash</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Obunalar topilmadi</p>}

            <Pagination total={total} offset={offset} pageSize={PAGE_SIZE} onOffsetChange={setOffset} />
          </>
        )}
      </Card>

      {editRow && (
        <FormModal
          title="Obunani tahrirlash"
          onClose={() => setEditRow(null)}
          onSubmit={save}
          isLoading={patchSub.isPending}
        >
          <Input label="Tugash vaqti" type="datetime-local" value={form.end_at} onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))} />
          <Select
            label="Holat"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          />
        </FormModal>
      )}

      <ToastRenderer />
    </div>
  );
};
