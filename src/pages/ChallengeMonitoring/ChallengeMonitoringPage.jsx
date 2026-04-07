import { useMemo, useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';
import { Badge, Button, Card, Input, PageHeader, Pagination, Select, Skeleton, StatCard, Tabs } from '../../components/ui';
import { useChallengeActionsList, useChallengeActionsSummary, useChallenges } from '../../hooks/useApi';
import { CHALLENGE_SUMMARY_LABELS, formatIsoDateTime } from '../../utils/adminDisplay';
import styles from '../admin.module.css';

const PAGE_SIZE = 50;
const SUMMARY_KEYS = ['distinct_users', 'total_rows', 'completed_rows'];

const TAB_ITEMS = [
  { value: 'actions', label: 'Amallar', icon: <Activity size={16} /> },
  { value: 'summary', label: 'Xulosa', icon: <BarChart3 size={16} /> },
];

const COMPLETED_OPTIONS = [
  { value: '', label: 'Hammasi' },
  { value: '1', label: 'Bajarilgan' },
  { value: '0', label: 'Kutilmoqda' },
];

function buildListParams(filters) {
  const p = { limit: PAGE_SIZE, offset: filters.offset };
  if (filters.challenge_id.trim()) {
    const n = Number(filters.challenge_id);
    if (Number.isFinite(n)) p.challenge_id = n;
  }
  if (filters.user_id.trim()) {
    const n = Number(filters.user_id);
    if (Number.isFinite(n)) p.user_id = n;
  }
  if (filters.is_completed === '0' || filters.is_completed === '1') {
    p.is_completed = filters.is_completed === '1';
  }
  return p;
}

export const ChallengeMonitoringPage = () => {
  const [tab, setTab] = useState('actions');
  const [filters, setFilters] = useState({ challenge_id: '', user_id: '', is_completed: '', offset: 0 });
  const [summaryChallengeId, setSummaryChallengeId] = useState('');

  const listParams = useMemo(() => buildListParams(filters), [filters]);
  const { data: listData, isLoading: listLoading, isError: listErr, error: listError } =
    useChallengeActionsList(listParams, tab === 'actions');
  const { data: challenges = [] } = useChallenges('');

  const summaryIdNum = summaryChallengeId ? Number(summaryChallengeId) : NaN;
  const { data: summaryData, isLoading: summaryLoading, isError: summaryErr, error: summaryError, refetch: refetchSummary } =
    useChallengeActionsSummary(Number.isFinite(summaryIdNum) ? summaryIdNum : null);

  const items = listData?.items ?? [];
  const total = listData?.total ?? 0;

  const challengeOptions = challenges.map((c) => ({
    value: String(c.id),
    label: `#${c.id} — ${c.name || c.title || c.finish_at || 'challenge'}`,
  }));

  return (
    <div className={styles.page}>
      <PageHeader title="Challenge monitoring"/>

      <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />

      {tab === 'actions' && (
        <>
          <Card>
            <div className={styles.challengeMonitorFilters}>
              <Input
                label="Challenge ID"
                value={filters.challenge_id}
                onChange={(e) => setFilters((f) => ({ ...f, challenge_id: e.target.value, offset: 0 }))}
              />
              <Input
                label="User ID"
                value={filters.user_id}
                onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value, offset: 0 }))}
              />
              <Select
                label="Holat"
                options={COMPLETED_OPTIONS}
                value={filters.is_completed}
                onChange={(e) => setFilters((f) => ({ ...f, is_completed: e.target.value, offset: 0 }))}
              />
            </div>

            {listErr && <p style={{ color: 'var(--error)', fontSize: 14, marginBottom: 12 }}>{listError?.response?.data?.error || listError?.message}</p>}

            {listLoading ? (
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
                        <th>Challenge</th>
                        <th>User</th>
                        <th>Audition</th>
                        <th>Kun</th>
                        <th>Holat</th>
                        <th>Yaratilgan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => (
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>{row.challenge_id}</td>
                          <td>{row.user_id}</td>
                          <td>{row.audition_id}</td>
                          <td className={styles.nowrap}>{formatIsoDateTime(row.day)}</td>
                          <td>
                            <Badge variant={row.is_completed ? 'success' : 'warning'}>
                              {row.is_completed ? 'Bajarilgan' : 'Kutilmoqda'}
                            </Badge>
                          </td>
                          <td className={styles.nowrap}>{formatIsoDateTime(row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Natija yo'q</p>}

                <Pagination
                  total={total}
                  offset={filters.offset}
                  pageSize={PAGE_SIZE}
                  onOffsetChange={(o) => setFilters((f) => ({ ...f, offset: o }))}
                />
              </>
            )}
          </Card>
        </>
      )}

      {tab === 'summary' && (
        <>
          <Card>
            <div className={styles.toolbarRow} style={{ marginBottom: 16 }}>
              <Select
                label="Challenge"
                options={challengeOptions}
                placeholder="— tanlang —"
                value={summaryChallengeId}
                onChange={(e) => setSummaryChallengeId(e.target.value)}
                style={{ maxWidth: 300 }}
              />
              <Button variant="secondary" disabled={!summaryChallengeId} onClick={() => refetchSummary()}>
                Yangilash
              </Button>
            </div>
          </Card>

          {summaryErr && <Card style={{ color: 'var(--error)', fontSize: 14 }}>{summaryError?.response?.data?.error || summaryError?.message}</Card>}

          {!summaryChallengeId ? (
            <Card><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Challenge tanlang</p></Card>
          ) : summaryLoading ? (
            <div className={styles.grid3}>{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} height={80} />)}</div>
          ) : summaryData && typeof summaryData === 'object' ? (
            <>
              <div className={styles.grid3}>
                {SUMMARY_KEYS.filter((k) => k in summaryData).map((k) => (
                  <StatCard
                    key={k}
                    title={CHALLENGE_SUMMARY_LABELS[k] ?? k}
                    value={typeof summaryData[k] === 'number' ? summaryData[k].toLocaleString('uz-UZ') : String(summaryData[k] ?? '—')}
                  />
                ))}
                {Object.keys(summaryData).filter((k) => !SUMMARY_KEYS.includes(k)).map((k) => (
                  <StatCard key={k} title={k.replace(/_/g, ' ')} value={String(summaryData[k] ?? '—')} />
                ))}
              </div>

              {(() => {
                const totalRows = Number(summaryData.total_rows);
                const completed = Number(summaryData.completed_rows);
                if (!Number.isFinite(totalRows) || totalRows <= 0) return null;
                const pct = Math.min(100, Math.round((completed / totalRows) * 100));
                return (
                  <Card>
                    <div className={styles.progressBlock}>
                      <div className={styles.progressLabelRow}>
                        <span>Bajarilish</span>
                        <strong>{completed.toLocaleString('uz-UZ')} / {totalRows.toLocaleString('uz-UZ')} ({pct}%)</strong>
                      </div>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </>
          ) : (
            <Card><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Ma'lumot yo'q</p></Card>
          )}
        </>
      )}
    </div>
  );
};
