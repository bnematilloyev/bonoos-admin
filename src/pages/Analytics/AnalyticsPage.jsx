import { RefreshCw } from 'lucide-react';
import { Button, Card, PageHeader, Skeleton, StatCard } from '../../components/ui';
import { useAnalyticsSummary } from '../../hooks/useApi';
import { ANALYTICS_ORDER, analyticsLabel, formatAnalyticsValue } from '../../utils/adminDisplay';
import styles from '../admin.module.css';

const HIGHLIGHT_KEYS = new Set(['revenue_completed_last_30_days', 'total_users', 'active_subscriptions']);

function SummaryContent({ data }) {
  if (!data || typeof data !== 'object') return null;

  const orderedKeys = [
    ...ANALYTICS_ORDER.filter((k) => Object.prototype.hasOwnProperty.call(data, k)),
    ...Object.keys(data).filter((k) => !ANALYTICS_ORDER.includes(k)),
  ];

  return (
    <div className={styles.grid3}>
      {orderedKeys.map((key) => {
        const value = data[key];

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          return (
            <Card key={key} style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{analyticsLabel(key)}</h3>
              <div className={styles.grid3}>
                {Object.entries(value).map(([k, v]) => (
                  <StatCard key={k} title={analyticsLabel(k)} value={formatAnalyticsValue(k, v)} />
                ))}
              </div>
            </Card>
          );
        }

        return (
          <StatCard
            key={key}
            title={analyticsLabel(key)}
            value={formatAnalyticsValue(key, value)}
            highlight={HIGHLIGHT_KEYS.has(key)}
          />
        );
      })}
    </div>
  );
}

export const AnalyticsPage = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useAnalyticsSummary();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Analitika"
        actions={
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={18} />}
            onClick={() => refetch()}
            isLoading={isFetching}
          >
            Yangilash
          </Button>
        }
      />
      {isError && (
        <Card style={{ color: 'var(--error)', fontSize: 14 }}>
          {error?.response?.data?.error || error?.message || 'Ma\'lumotlarni olishda xato'}
        </Card>
      )}
      {isLoading ? (
        <div className={styles.grid3}>
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={100} />)}
        </div>
      ) : (
        <SummaryContent data={data} />
      )}
    </div>
  );
};
