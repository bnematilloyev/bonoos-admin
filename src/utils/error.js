export function extractApiError(err, fallback = 'Xatolik yuz berdi') {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  if (Array.isArray(data?.errors) && data.errors.length) return data.errors.join(', ');
  return err?.message || fallback;
}
