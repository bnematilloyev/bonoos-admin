import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search } from 'lucide-react';
import { Badge, Button, Card, Input, Modal, PageHeader, Pagination, Select, Skeleton } from '../../components/ui';
import { useActivities, useAdminUsers, useIncomeRanges, useRegions } from '../../hooks/useApi';
import { formatIsoDateTime, formatIsoDateOnly, localizedNameUz } from '../../utils/adminDisplay';
import styles from '../admin.module.css';

const PAGE_SIZE = 50;

const EMPTY_FILTERS = {
  user_id: '',
  phone: '',
  full_name: '',
  region_id: '',
  activity_id: '',
  income: '',
};

function userInitials(row) {
  const name = row.full_name || row.name || '';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1 && parts[0][0]) return parts[0][0].toUpperCase();
  return String(row.phone || '').slice(-2) || '?';
}

function refSelectOptions(items) {
  return (items || []).map((item) => ({
    value: String(item.id),
    label: item.name_uz || item.name_en || `#${item.id}`,
  }));
}

function buildUserListParams(filters) {
  const p = { limit: PAGE_SIZE, offset: filters.offset };
  const trim = (s) => String(s ?? '').trim();

  const userId = trim(filters.user_id);
  if (userId) {
    const n = Number(userId);
    if (Number.isFinite(n)) p.user_id = n;
  }

  if (trim(filters.phone)) p.phone = trim(filters.phone);
  if (trim(filters.full_name)) p.full_name = trim(filters.full_name);

  if (filters.region_id) {
    const n = Number(filters.region_id);
    if (Number.isFinite(n)) p.region_id = n;
  }
  if (filters.activity_id) {
    const n = Number(filters.activity_id);
    if (Number.isFinite(n)) p.activity_id = n;
  }
  if (filters.income) {
    const n = Number(filters.income);
    if (Number.isFinite(n)) p.income = n;
  }

  return p;
}

export const UsersPage = () => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [query, setQuery] = useState({ ...EMPTY_FILTERS, offset: 0 });
  const [detailUser, setDetailUser] = useState(null);

  const { data: regions = [] } = useRegions();
  const { data: activities = [] } = useActivities();
  const { data: incomeRanges = [] } = useIncomeRanges();

  const regionOptions = useMemo(() => refSelectOptions(regions), [regions]);
  const activityOptions = useMemo(() => refSelectOptions(activities), [activities]);
  const incomeOptions = useMemo(() => refSelectOptions(incomeRanges), [incomeRanges]);

  const params = useMemo(() => buildUserListParams(query), [query]);

  const { data, isLoading, isError, error } = useAdminUsers(params);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const setDraftField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const applyFilter = () => setQuery({ ...draft, offset: 0 });

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setQuery({ ...EMPTY_FILTERS, offset: 0 });
  };

  const onFilterKeyDown = (e) => {
    if (e.key === 'Enter') applyFilter();
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Foydalanuvchilar" description={`Jami: ${total.toLocaleString('uz-UZ')}`} />

      <Card>
        <div className={styles.userFiltersRow}>
          <Input
            label="User ID"
            placeholder="Aniq ID"
            value={draft.user_id}
            onChange={(e) => setDraftField('user_id', e.target.value)}
            onKeyDown={onFilterKeyDown}
          />
          <Input
            label="Telefon"
            placeholder="Qisman qidirish..."
            leftIcon={<Search size={18} />}
            value={draft.phone}
            onChange={(e) => setDraftField('phone', e.target.value)}
            onKeyDown={onFilterKeyDown}
          />
          <Input
            label="Ism"
            placeholder="Qisman qidirish..."
            value={draft.full_name}
            onChange={(e) => setDraftField('full_name', e.target.value)}
            onKeyDown={onFilterKeyDown}
          />
          <Select
            label="Viloyat"
            placeholder="Hammasi"
            options={regionOptions}
            value={draft.region_id}
            onChange={(e) => setDraftField('region_id', e.target.value)}
          />
          <Select
            label="Faoliyat"
            placeholder="Hammasi"
            options={activityOptions}
            value={draft.activity_id}
            onChange={(e) => setDraftField('activity_id', e.target.value)}
          />
          <Select
            label="Daromad"
            placeholder="Hammasi"
            options={incomeOptions}
            value={draft.income}
            onChange={(e) => setDraftField('income', e.target.value)}
          />
          <div className={styles.userFilterActions}>
            <Button onClick={applyFilter}>Qidirish</Button>
            <Button variant="secondary" onClick={clearFilters}>Tozalash</Button>
          </div>
        </div>

        {isError && (
          <p style={{ color: 'var(--error)', fontSize: 14 }}>
            {error?.response?.data?.error || error?.message}
          </p>
        )}

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
                    <th />
                    <th>Ism</th>
                    <th>Email</th>
                    <th>Telefon</th>
                    <th>Viloyat</th>
                    <th>Tug'ilgan kun</th>
                    <th>Ro'yxatdan</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td className={styles.userAvatarCell}>
                        <div className={styles.userAvatar}>
                          {row.avatar ? <img src={row.avatar} alt="" /> : userInitials(row)}
                        </div>
                      </td>
                      <td>{row.full_name || '—'}</td>
                      <td>
                        <div className={styles.emailCell}>
                          <span>{row.email || '—'}</span>
                          {row.email && (
                            <Badge variant={row.verified_email ? 'success' : 'warning'}>
                              {row.verified_email ? 'Tasdiqlangan' : 'Tasdiqlanmagan'}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className={styles.nowrap}>{row.phone || '—'}</td>
                      <td>{localizedNameUz(row.region, row.region_id)}</td>
                      <td>{formatIsoDateOnly(row.birthday)}</td>
                      <td className={styles.nowrap}>{formatIsoDateTime(row.created_at)}</td>
                      <td>
                        <div className={styles.actions}>
                          <Button
                            size="sm"
                            variant="secondary"
                            type="button"
                            leftIcon={<MessageCircle size={16} />}
                            onClick={() => navigate(`/chat?user=${row.id}`)}
                          >
                            Chat
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDetailUser(row)}>Batafsil</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Foydalanuvchilar topilmadi</p>}

            <Pagination
              total={total}
              offset={query.offset}
              pageSize={PAGE_SIZE}
              onOffsetChange={(o) => setQuery((q) => ({ ...q, offset: o }))}
            />
          </>
        )}
      </Card>

      {detailUser && (
        <Modal title={detailUser.full_name || `Foydalanuvchi #${detailUser.id}`} onClose={() => setDetailUser(null)} size="lg">
          <dl className={styles.detailDl}>
            {[
              ['ID', detailUser.id],
              ['Ism', detailUser.full_name],
              ['Telefon', detailUser.phone],
              ['Email', detailUser.email],
              ['Email tasdiqlangan', detailUser.verified_email ? 'Ha' : 'Yo\'q'],
              ['Telegram ID', detailUser.telegram_id || '—'],
              ['Tug\'ilgan kun', formatIsoDateOnly(detailUser.birthday)],
              ['Bio', detailUser.bio || '—'],
              ['Viloyat', localizedNameUz(detailUser.region, detailUser.region_id)],
              ['Faoliyat', localizedNameUz(detailUser.activity, detailUser.activity_id)],
              ['Daromad', localizedNameUz(detailUser.income_range, detailUser.income)],
              ['Ro\'yxatdan', formatIsoDateTime(detailUser.created_at)],
              ['Yangilangan', formatIsoDateTime(detailUser.updated_at)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt>{k}</dt>
                <dd>{v === '' || v == null ? '—' : String(v)}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  );
};
