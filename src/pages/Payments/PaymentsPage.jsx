import { useMemo, useState } from 'react';
import { Badge, Button, Card, FormModal, Input, PageHeader, Pagination, Select, Skeleton, useToast } from '../../components/ui';
import { useAdminPayments, usePatchAdminPayment } from '../../hooks/useApi';
import { formatIsoDateTime, formatUzs, paymentProviderLabel, paymentStatusLabel } from '../../utils/adminDisplay';
import { extractApiError } from '../../utils/error';
import styles from '../admin.module.css';

const PAGE_SIZE = 50;

const PAYMENT_STATUS_OPTIONS = [
  { value: '0', label: 'Kutilmoqda' },
  { value: '1', label: 'Muvaffaqiyatli' },
  { value: '2', label: 'Xato / bekor' },
  { value: '3', label: 'Qaytarilgan' },
];

export const PaymentsPage = () => {
  const [offset, setOffset] = useState(0);
  const params = useMemo(() => ({ limit: PAGE_SIZE, offset }), [offset]);
  const { data, isLoading, isError, error } = useAdminPayments(params);
  const patchPay = usePatchAdminPayment();
  const { show: toast, ToastRenderer } = useToast();

  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({ payment_status: '1', transaction_id: '' });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const openEdit = (row) => {
    setForm({
      payment_status: String(row.payment_status ?? row.status ?? '0'),
      transaction_id: String(row.transaction_id ?? ''),
    });
    setEditRow(row);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = {};
    if (form.payment_status !== '') payload.payment_status = Number(form.payment_status);
    if (form.transaction_id.trim()) payload.transaction_id = form.transaction_id.trim();
    if (Object.keys(payload).length === 0) {
      toast('Kamida bitta maydon kiriting', 'error');
      return;
    }
    try {
      await patchPay.mutateAsync({ id: editRow.id, payload });
      toast("To'lov yangilandi");
      setEditRow(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="To'lovlar" description={`Jami: ${total.toLocaleString('uz-UZ')}`} />

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
                    <th>Summa</th>
                    <th>Provayder</th>
                    <th>Holat</th>
                    <th>Tranzaksiya</th>
                    <th>Sana</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const st = paymentStatusLabel(row.payment_status);
                    return (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.user_id}</td>
                        <td>{row.plan_id}</td>
                        <td className={styles.nowrap}>{formatUzs(row.amount)}</td>
                        <td>{paymentProviderLabel(row.payment_provider)}</td>
                        <td><Badge variant={st.variant}>{st.text}</Badge></td>
                        <td className={styles.textCell} title={row.transaction_id}>{row.transaction_id || '—'}</td>
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

            {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>To'lovlar topilmadi</p>}

            <Pagination total={total} offset={offset} pageSize={PAGE_SIZE} onOffsetChange={setOffset} />
          </>
        )}
      </Card>

      {editRow && (
        <FormModal
          title="To'lovni tahrirlash"
          onClose={() => setEditRow(null)}
          onSubmit={save}
          isLoading={patchPay.isPending}
        >
          <Select
            label="Holat"
            options={PAYMENT_STATUS_OPTIONS}
            value={form.payment_status}
            onChange={(e) => setForm((f) => ({ ...f, payment_status: e.target.value }))}
          />
          <Input
            label="Tranzaksiya ID"
            value={form.transaction_id}
            onChange={(e) => setForm((f) => ({ ...f, transaction_id: e.target.value }))}
            placeholder="Tranzaksiya identifikatori"
          />
        </FormModal>
      )}

      <ToastRenderer />
    </div>
  );
};
