import axios from 'axios';
import { useAuthStore } from '../store';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.DEV
      ? ''
      : 'https://api.vibrant.uz';
export const X_UUID =
  import.meta.env.VITE_X_UUID || '810da8fa-72d8-4a0c-81d8-3a740fe5d18e';

const AUTH_DEVICE_ID = 'web-admin';

/** Refresh so‘rovi apiClient interceptoridan chetlatiladi (sonsiz loop bo‘lmasin). */
const refreshAxios = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: { 'Content-Type': 'application/json', 'x-uuid': X_UUID },
});

let refreshInFlight = null;

function applyNewTokens(accessToken, refreshToken) {
  localStorage.setItem('access_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
  useAuthStore.setState((s) => ({
    token: accessToken,
    refreshToken: refreshToken ?? s.refreshToken,
  }));
}

async function fetchRefreshedTokens() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('Refresh token yo‘q');
  }
  const { data } = await refreshAxios.post(
    '/api/v1/auth/admin/refresh-token',
    { refresh_token: refreshToken, device_id: AUTH_DEVICE_ID },
    { headers: { Authorization: `Bearer ${refreshToken}` } }
  );
  const tokens = data?.data?.tokens;
  const access = tokens?.access_token;
  if (!access) {
    throw new Error('Refresh javobida access_token yo‘q');
  }
  applyNewTokens(access, tokens.refresh_token);
}

function shouldSkip401Refresh(config) {
  const url = config?.url || '';
  return (
    url.includes('/auth/admin/login') ||
    url.includes('/auth/admin/refresh-token') ||
    url.includes('/auth/admin/logout')
  );
}

/** Quotes (va boshqa joylar) rasm yuklash — API ga saqlanadigan qiymat: javobdagi `key` */
export const QUOTE_IMAGE_UPLOAD_PREFIX = 'auditions/images';

/** Psixologik / motivatsion audio fayllar (mp3, m4a, …) */
export const AUDITION_AUDIO_UPLOAD_PREFIX = 'auditions/audio';

/** Audition video (mp4, webm, …) */
export const AUDITION_VIDEO_UPLOAD_PREFIX = 'auditions/video';

export const ASSETS_PUBLIC_BASE =
  (import.meta.env.VITE_ASSETS_PUBLIC_BASE || 'https://assets.vibrant.uz/bonoos').replace(/\/$/, '');
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  config.headers['x-uuid'] = X_UUID;

  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || !original || original._retry || shouldSkip401Refresh(original)) {
      return Promise.reject(error);
    }

    if (!localStorage.getItem('refresh_token')) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshInFlight) {
        refreshInFlight = fetchRefreshedTokens().finally(() => {
          refreshInFlight = null;
        });
      }
      await refreshInFlight;
      return apiClient(original);
    } catch {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }
  }
);

export const authApi = {
  login: async ({ username, password }) => {
    const response = await apiClient.post('/api/v1/auth/admin/login', { username, password });
    return response.data?.data;
  },
  logout: async ({ refresh_token, device_id = 'web-admin' }) => {
    const response = await apiClient.post('/api/v1/auth/admin/logout', { refresh_token, device_id });
    return response.data?.data;
  },
};

export const adminProfileApi = {
  me: async () => {
    const response = await apiClient.get('/api/v1/admin/profile/me');
    return response.data?.data;
  },
  /** @param {Record<string, unknown>} payload — full_name, phone, username, password (ixtiyoriy) */
  update: async (payload) => {
    const response = await apiClient.put('/api/v1/admin/profile/update', payload);
    return response.data?.data;
  },
};

export const adminsApi = {
  create: async ({ full_name, phone, username, password }) => {
    const response = await apiClient.post('/api/v1/admin/admins', {
      full_name,
      phone,
      username,
      password,
    });
    return response.data?.data;
  },
};

export const categoriesApi = {
  list: async () => {
    const response = await apiClient.get('/api/v1/admin/categories/');
    return response.data?.data || [];
  },
  create: async (payload) => {
    const response = await apiClient.post('/api/v1/admin/categories/', payload);
    return response.data?.data;
  },
  update: async (id, payload) => {
    const response = await apiClient.put(`/api/v1/admin/categories/${id}`, payload);
    return response.data?.data;
  },
  remove: async (id) => {
    const response = await apiClient.delete(`/api/v1/admin/categories/${id}`);
    return response.data?.data;
  },
};

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * Challenge turlari va challenge’lar (admin).
 * Backend yo‘li boshqacha bo‘lsa, shu modulni moslang (masalan: /challenges/types).
 */
export const challengeTypesApi = {
  list: async () => {
    const response = await apiClient.get('/api/v1/admin/challenge-types/');
    return normalizeList(response.data?.data);
  },
  /** Body: faqat `{ name, days, status }` — boshqa maydonlar 400 / invalid JSON berishi mumkin */
  create: async (payload) => {
    const response = await apiClient.post('/api/v1/admin/challenge-types/', payload);
    return response.data?.data;
  },
  update: async (id, payload) => {
    const response = await apiClient.put(`/api/v1/admin/challenge-types/${id}`, payload);
    return response.data?.data;
  },
  remove: async (id) => {
    const response = await apiClient.delete(`/api/v1/admin/challenge-types/${id}`);
    return response.data?.data;
  },
};

export const challengesApi = {
  /** @param {Record<string, unknown>} [params] — masalan challenge_type_id */
  list: async (params) => {
    const response = await apiClient.get('/api/v1/admin/challenges/', { params });
    return normalizeList(response.data?.data);
  },
  /** Body: `{ challenge_type_id, status, finish_at }` (finish_at: ISO, masalan …Z) — name/description/sort yuborilmasin */
  create: async (payload) => {
    const response = await apiClient.post('/api/v1/admin/challenges/', payload);
    return response.data?.data;
  },
  update: async (id, payload) => {
    const response = await apiClient.put(`/api/v1/admin/challenges/${id}`, payload);
    return response.data?.data;
  },
  remove: async (id) => {
    const response = await apiClient.delete(`/api/v1/admin/challenges/${id}`);
    return response.data?.data;
  },
  listMeditations: async (challengeId) => {
    const response = await apiClient.get(`/api/v1/admin/challenges/${challengeId}/meditations`);
    return normalizeList(response.data?.data);
  },
  /** Body: `audition_id` yoki `meditation_id`; `day_index`, `sort`, `status` */
  addMeditation: async (challengeId, payload) => {
    const response = await apiClient.post(`/api/v1/admin/challenges/${challengeId}/meditations`, payload);
    return response.data?.data;
  },
  removeMeditation: async (challengeId, meditationId) => {
    const response = await apiClient.delete(
      `/api/v1/admin/challenges/${challengeId}/meditations/${meditationId}`
    );
    return response.data?.data;
  },
};

export const auditionsApi = {
  /**
   * Ro‘yxat: GET /api/v1/auditions?category_id=… + header x-uuid (apiClient interceptor).
   * Admin GET /api/v1/admin/auditions/ backend da 405 — ishlatilmaydi.
   */
  list: async (categoryId) => {
    if (categoryId == null || categoryId === '') {
      return [];
    }
    const response = await apiClient.get('/api/v1/auditions', {
      params: { category_id: categoryId },
    });
    return normalizeList(response.data?.data);
  },
  /** Body: category_id, text, type, duration; media: `audio` yoki `video` (kalit) */
  create: async (payload) => {
    const response = await apiClient.post('/api/v1/admin/auditions/', payload);
    return response.data?.data;
  },
  update: async (id, payload) => {
    const response = await apiClient.put(`/api/v1/admin/auditions/${id}`, payload);
    return response.data?.data;
  },
  remove: async (id) => {
    const response = await apiClient.delete(`/api/v1/admin/auditions/${id}`);
    return response.data?.data;
  },
};

export const plansApi = {
  list: async () => {
    const response = await apiClient.get('/api/v1/admin/plans/');
    const d = response.data?.data;
    return Array.isArray(d) ? d : [];
  },
  create: async (payload) => {
    const response = await apiClient.post('/api/v1/admin/plans/', payload);
    return response.data?.data;
  },
  update: async (id, payload) => {
    const response = await apiClient.put(`/api/v1/admin/plans/${id}`, payload);
    return response.data?.data;
  },
  remove: async (id) => {
    await apiClient.delete(`/api/v1/admin/plans/${id}`);
  },
};

export const analyticsApi = {
  summary: async () => {
    const response = await apiClient.get('/api/v1/admin/analytics/summary');
    return response.data?.data;
  },
};

export const adminUsersApi = {
  /**
   * @param {{ limit?: number, offset?: number, phone?: string }} [params]
   * @returns {Promise<{ items: unknown[], total: number }>}
   */
  list: async (params = {}) => {
    const response = await apiClient.get('/api/v1/admin/users', { params });
    const d = response.data?.data;
    if (Array.isArray(d)) {
      return { items: d, total: d.length };
    }
    return {
      items: Array.isArray(d?.items) ? d.items : [],
      total: Number(d?.total) || 0,
    };
  },
};

/**
 * Admin chat (REST). Bearer admin JWT + x-uuid — apiClient orqali.
 *
 * WebSocket (101 handshake): Postman sarlavha yuboradi; brauzer `WebSocket` API da buni qila olmaydi.
 * Shuning uchun query da `access_token` va `x_uuid` beriladi:
 * - `npm run dev`: Vite proxy ularni upstream ga `Authorization` / `x-uuid` qilib qo‘yadi (Postman bilan bir xil).
 * - Production: to‘g‘ridan-to‘g‘ri `wss://api...` da backend query ni o‘qishi yoki
 *   admin domenida `/api` proxy (nginx) sarlavha qo‘shishi kerak; yoki `VITE_WS_RELATIVE=1` + bir xil hostda API proxy.
 */
export const chatApi = {
  /**
   * @param {{ limit?: number, offset?: number, order?: 'updated_at'|'created_at' }} [params]
   * @returns {Promise<{ items: object[], total?: number }>}
   */
  listConversations: async (params = {}) => {
    const response = await apiClient.get('/api/v1/admin/chat/conversations', { params });
    const body = response.data;
    const d = body?.data;
    const items = Array.isArray(d) ? d : [];
    const totalRaw = body?.total;
    const total = Number(totalRaw);
    return {
      items,
      ...(Number.isFinite(total) ? { total } : {}),
    };
  },
  /**
   * @param {{ conversationId: number|string, limit?: number, beforeId?: number|string }} p
   * before_id: mavjud xabarlarning eng kichik id sidan oldingilar
   */
  listMessages: async ({ conversationId, limit = 50, beforeId = 0 }) => {
    const response = await apiClient.get('/api/v1/admin/chat/messages', {
      params: {
        conversation_id: conversationId,
        limit,
        before_id: beforeId,
      },
    });
    const d = response.data?.data;
    return Array.isArray(d) ? d : [];
  },
  /** @param {{ conversationId: number|string, content: string }} p */
  sendMessage: async ({ conversationId, content }) => {
    const response = await apiClient.post('/api/v1/admin/chat/messages', {
      conversation_id: conversationId,
      content,
    });
    return response.data?.data;
  },
};

/** @param {number|string} conversationId */
export function getAdminChatWebSocketUrl(conversationId) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : '';

  let wsOrigin;
  const explicit = import.meta.env.VITE_WS_BASE_URL;
  const wsRelative =
    import.meta.env.VITE_WS_RELATIVE === 'true' || import.meta.env.VITE_WS_RELATIVE === '1';

  if (explicit) {
    wsOrigin = explicit.replace(/\/$/, '');
  } else if (wsRelative && typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsOrigin = `${proto}//${window.location.host}`;
  } else {
    const api = import.meta.env.VITE_API_BASE_URL;
    if (api !== undefined && api !== '') {
      wsOrigin = api.replace(/^http/, 'ws').replace(/\/$/, '');
    } else if (import.meta.env.DEV && typeof window !== 'undefined') {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsOrigin = `${proto}//${window.location.host}`;
    } else {
      wsOrigin = 'wss://api.vibrant.uz';
    }
  }

  const qs = new URLSearchParams();
  qs.set('conversation_id', String(conversationId));
  qs.set('x_uuid', X_UUID);
  if (token) qs.set('access_token', token);

  return `${wsOrigin}/api/v1/admin/chat/ws?${qs.toString()}`;
}

export const challengeActionsApi = {
  /**
   * @param {{ challenge_id?: number|string, user_id?: number|string, is_completed?: boolean|number, day_from?: number, day_to?: number, limit?: number, offset?: number }} [params]
   */
  list: async (params = {}) => {
    const response = await apiClient.get('/api/v1/admin/challenge-actions', { params });
    const d = response.data?.data;
    if (Array.isArray(d)) {
      return { items: d, total: d.length };
    }
    return {
      items: Array.isArray(d?.items) ? d.items : [],
      total: Number(d?.total) || 0,
    };
  },
  summary: async (challengeId) => {
    const response = await apiClient.get(
      `/api/v1/admin/challenges/${challengeId}/challenge-actions/summary`
    );
    return response.data?.data;
  },
};

export const userSubscriptionsApi = {
  list: async (params = {}) => {
    const response = await apiClient.get('/api/v1/admin/user-subscriptions', { params });
    const d = response.data?.data;
    if (Array.isArray(d)) {
      return { items: d, total: d.length };
    }
    return {
      items: Array.isArray(d?.items) ? d.items : [],
      total: Number(d?.total) || 0,
    };
  },
  patch: async (id, payload) => {
    const response = await apiClient.patch(`/api/v1/admin/user-subscriptions/${id}`, payload);
    return response.data?.data;
  },
};

export const adminPaymentsApi = {
  list: async (params = {}) => {
    const response = await apiClient.get('/api/v1/admin/payments', { params });
    const d = response.data?.data;
    if (Array.isArray(d)) {
      return { items: d, total: d.length };
    }
    return {
      items: Array.isArray(d?.items) ? d.items : [],
      total: Number(d?.total) || 0,
    };
  },
  patch: async (id, payload) => {
    const response = await apiClient.patch(`/api/v1/admin/payments/${id}`, payload);
    return response.data?.data;
  },
};

export const topicsApi = {
  list: async () => {
    const response = await apiClient.get('/api/v1/admin/topics/');
    return response.data?.data || [];
  },
  create: async (payload) => {
    const response = await apiClient.post('/api/v1/admin/topics/', payload);
    return response.data?.data;
  },
  update: async (id, payload) => {
    const response = await apiClient.put(`/api/v1/admin/topics/${id}`, payload);
    return response.data?.data;
  },
  remove: async (id) => {
    const response = await apiClient.delete(`/api/v1/admin/topics/${id}`);
    return response.data?.data;
  },
};

/** Uzoq audio (masalan ~20 daq. yuqori sifat) — sekin tarmoqda ham tugashi uchun */
const UPLOAD_TIMEOUT_MS = 900_000;

/** Admin MinIO: bucketlar, browse (delimiter), papka yaratish, o‘chirish */
export const storageApi = {
  /** @returns {Promise<{ buckets: string[] }>} */
  listBuckets: async () => {
    const response = await apiClient.get('/api/v1/admin/storage/buckets');
    const data = response.data?.data;
    const buckets = data?.buckets;
    return { buckets: Array.isArray(buckets) ? buckets : [] };
  },
  /**
   * Papkalar (`prefixes`) va fayllar — S3 delimiter `/`.
   * @param {{ bucket?: string, prefix?: string, continuation_token?: string, limit?: number }} params
   */
  browse: async ({ bucket, prefix, continuation_token, limit = 50 } = {}) => {
    const response = await apiClient.get('/api/v1/admin/storage/browse', {
      params: {
        ...(bucket ? { bucket } : {}),
        ...(prefix != null && prefix !== '' ? { prefix } : {}),
        ...(continuation_token ? { continuation_token } : {}),
        limit: Math.min(Math.max(Number(limit) || 50, 1), 1000),
      },
    });
    const data = response.data?.data;
    return {
      prefixes: Array.isArray(data?.prefixes) ? data.prefixes : [],
      objects: Array.isArray(data?.objects) ? data.objects : [],
      continuation_token: data?.continuation_token ?? null,
      is_truncated: Boolean(data?.is_truncated),
      bucket: data?.bucket ?? bucket ?? '',
      prefix: data?.prefix ?? prefix ?? '',
    };
  },
  /** @param {{ bucket?: string, path: string }} body — path boshida `/` bo‘lmasin */
  createFolder: async ({ bucket, path }) => {
    const response = await apiClient.post('/api/v1/admin/storage/folders', {
      bucket: bucket ?? '',
      path,
    });
    return response.data?.data;
  },
  /**
   * @param {{ bucket?: string, prefix?: string, cursor?: string, limit?: number }} params
   * @deprecated Browse API ishlating
   */
  listObjects: async ({ bucket, prefix, cursor, limit = 50 } = {}) => {
    const response = await apiClient.get('/api/v1/admin/storage/objects', {
      params: {
        ...(bucket ? { bucket } : {}),
        ...(prefix != null && prefix !== '' ? { prefix } : {}),
        ...(cursor ? { cursor } : {}),
        limit: Math.min(Math.max(Number(limit) || 50, 1), 1000),
      },
    });
    const data = response.data?.data;
    return {
      objects: Array.isArray(data?.objects) ? data.objects : [],
      next_cursor: data?.next_cursor ?? null,
      bucket: data?.bucket ?? bucket ?? '',
      prefix: data?.prefix ?? prefix ?? '',
    };
  },
  /** @param {{ key: string, bucket?: string }} body — papka: `key` oxirida `/` */
  deleteObject: async ({ key, bucket }) => {
    await apiClient.post('/api/v1/admin/storage/objects/delete', {
      key,
      ...(bucket ? { bucket } : {}),
    });
  },
};

export const uploadApi = {
  /**
   * @returns {Promise<{ url?: string, key?: string, bucket?: string }>}
   */
  uploadFile: async (file, prefix = QUOTE_IMAGE_UPLOAD_PREFIX) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/v1/admin/upload', formData, {
      params: { prefix },
      timeout: UPLOAD_TIMEOUT_MS,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      transformRequest: [
        (data, headers) => {
          if (data instanceof FormData) {
            delete headers['Content-Type'];
          }
          return data;
        },
      ],
    });
    return response.data?.data;
  },
};

export const quotesApi = {
  list: async () => {
    const response = await apiClient.get('/api/v1/admin/quotes/');
    const d = response.data?.data;
    return Array.isArray(d) ? d : [];
  },
  create: async (payload) => {
    const response = await apiClient.post('/api/v1/admin/quotes/', payload);
    return response.data?.data;
  },
  update: async (id, payload) => {
    const response = await apiClient.put(`/api/v1/admin/quotes/${id}`, payload);
    return response.data?.data;
  },
  remove: async (id) => {
    const response = await apiClient.delete(`/api/v1/admin/quotes/${id}`);
    return response.data?.data;
  },
};

export const notificationsApi = {
  /** POST /api/v1/admin/notifications/users — body: { user_id, type, title, content } */
  sendToUser: async (payload) => {
    const response = await apiClient.post('/api/v1/admin/notifications/users', payload);
    return response.data?.data;
  },
  /** POST /api/v1/admin/notifications/common — body: { type, title, content, expires_at? } */
  createCommon: async (payload) => {
    const response = await apiClient.post('/api/v1/admin/notifications/common', payload);
    return response.data?.data;
  },
  /** PUT /api/v1/admin/notifications/common/:id */
  updateCommon: async (id, payload) => {
    const response = await apiClient.put(`/api/v1/admin/notifications/common/${id}`, payload);
    return response.data?.data;
  },
  /** DELETE /api/v1/admin/notifications/common/:id — 204 */
  removeCommon: async (id) => {
    await apiClient.delete(`/api/v1/admin/notifications/common/${id}`);
  },
  /** GET /api/v1/admin/notifications/common — list (may not exist; handled gracefully) */
  listCommon: async () => {
    const response = await apiClient.get('/api/v1/admin/notifications/common');
    const d = response.data?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    return [];
  },
};

export const questionsApi = {
  listByTopic: async (topicId) => {
    const response = await apiClient.get(`/api/v1/admin/topics/${topicId}/questions`);
    return response.data?.data || [];
  },
  create: async (topicId, payload) => {
    const response = await apiClient.post(`/api/v1/admin/topics/${topicId}/questions`, payload);
    return response.data?.data;
  },
  update: async (topicId, questionId, payload) => {
    const response = await apiClient.put(`/api/v1/admin/topics/${topicId}/questions/${questionId}`, payload);
    return response.data?.data;
  },
  remove: async (topicId, questionId) => {
    const response = await apiClient.delete(`/api/v1/admin/topics/${topicId}/questions/${questionId}`);
    return response.data?.data;
  },
};
