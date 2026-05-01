import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search } from 'lucide-react';
import { Badge, Button, Card, Input, Modal, PageHeader, Pagination, Skeleton } from '../../components/ui';
import { useAdminUsers } from '../../hooks/useApi';
import { formatIsoDateTime, formatIsoDateOnly } from '../../utils/adminDisplay';
import styles from '../admin.module.css';

const PAGE_SIZE = 50;

function userInitials(row) {
  const name = row.full_name || row.name || '';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1 && parts[0][0]) return parts[0][0].toUpperCase();
  return String(row.phone || '').slice(-2) || '?';
}

export const UsersPage = () => {
  const [phoneDraft, setPhoneDraft] = useState('');
  const [query, setQuery] = useState({ limit: PAGE_SIZE, offset: 0 });
  const [detailUser, setDetailUser] = useState(null);

  const params = useMemo(() => {
    const p = { limit: query.limit, offset: query.offset };
    if (query.phone) p.phone = query.phone;
    return p;
  }, [query]);

  const { data, isLoading, isError, error } = useAdminUsers(params);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const applyFilter = () => {
    setQuery((q) => ({ ...q, offset: 0, phone: phoneDraft.trim() || undefined }));
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Foydalanuvchilar" description={`Jami: ${total.toLocaleString('uz-UZ')}`} />

      <Card>
        <div className={styles.toolbarRow} style={{ marginBottom: 16 }}>
          <Input
            placeholder="Telefon raqami bo'yicha qidirish..."
            leftIcon={<Search size={18} />}
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
            style={{ maxWidth: 280 }}
          />
          <Button onClick={applyFilter}>Qidirish</Button>
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
                      <td>{row.region_id ?? '—'}</td>
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
              ['Viloyat', detailUser.region_id ?? '—'],
              ['Faoliyat', detailUser.activity_id ?? '—'],
              ['Daromad', detailUser.income ?? '—'],
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
