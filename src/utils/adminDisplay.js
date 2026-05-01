/** Admin API javoblarini UI da ko‘rsatish (Postman misollariga mos) */

/** @param {unknown} iso */
export function formatIsoDateTime(iso) {
  if (iso == null || iso === '') return '—';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
}

/** @param {unknown} iso */
export function formatIsoDateOnly(iso) {
  if (iso == null || iso === '') return '—';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('uz-UZ');
}

/** Chat xabarlari: soat va daqiqa (24 soat). @param {unknown} iso */
export function formatIsoTime(iso) {
  if (iso == null || iso === '') return '—';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** So‘m (UZS) — API dagi butun/ kasr summalar */
export function formatUzs(amount) {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return `${n.toLocaleString('uz-UZ', { maximumFractionDigits: 2 })} so‘m`;
}

export const ANALYTICS_LABELS = {
  total_users: 'Jami foydalanuvchilar',
  new_users_last_7_days: 'Yangi (7 kun)',
  new_users_last_30_days: 'Yangi (30 kun)',
  active_subscriptions: 'Faol obunalar',
  payments_completed_last_30_days: 'To‘lovlar (30 kun, yakunlangan)',
  revenue_completed_last_30_days: 'Tushum (30 kun, yakunlangan)',
  listen_events_last_30_days: 'Tinglash hodisalari (30 kun)',
  distinct_challenge_users_last_30_days: 'Challenge ishtirokchilari (30 kun, noyob)',
};

/** Ko‘rsatkichlar tartibi — API misolidagi ma’noli tartib */
export const ANALYTICS_ORDER = [
  'total_users',
  'active_subscriptions',
  'revenue_completed_last_30_days',
  'new_users_last_7_days',
  'new_users_last_30_days',
  'payments_completed_last_30_days',
  'listen_events_last_30_days',
  'distinct_challenge_users_last_30_days',
];

/** @param {string} key */
export function analyticsLabel(key) {
  return ANALYTICS_LABELS[key] ?? key.replace(/_/g, ' ');
}

/** @param {string} key @param {unknown} value */
export function formatAnalyticsValue(key, value) {
  if (value === null || value === undefined) return '—';
  if (key === 'revenue_completed_last_30_days') return formatUzs(value);
  if (typeof value === 'number') return value.toLocaleString('uz-UZ');
  if (typeof value === 'boolean') return value ? 'Ha' : 'Yo‘q';
  return String(value);
}

/** subscription status 0 / 1 / 2 (Postman ENUM) */
export function subscriptionStatusLabel(status) {
  const s = Number(status);
  if (s === 1) return { text: 'Faol', variant: 'success' };
  if (s === 0) return { text: 'Nofaol / kutish', variant: 'warning' };
  if (s === 2) return { text: 'Tugagan', variant: 'default' };
  return { text: String(status ?? '—'), variant: 'default' };
}

/** payment_status 0–3 */
export function paymentStatusLabel(status) {
  const s = Number(status);
  if (s === 1) return { text: 'Muvaffaqiyatli', variant: 'success' };
  if (s === 0) return { text: 'Kutilmoqda', variant: 'warning' };
  if (s === 2) return { text: 'Xato / bekor', variant: 'error' };
  if (s === 3) return { text: 'Qaytarilgan', variant: 'info' };
  return { text: String(status ?? '—'), variant: 'default' };
}

/** payment_provider: 1 = Payme */
export function paymentProviderLabel(provider) {
  const p = Number(provider);
  if (p === 1) return 'Payme';
  return p === 0 || Number.isNaN(p) ? '—' : `#${p}`;
}

export const CHALLENGE_SUMMARY_LABELS = {
  distinct_users: 'Noyob ishtirokchilar',
  total_rows: 'Jami qatorlar (vazifalar)',
  completed_rows: 'Bajarilgan qatorlar',
};
