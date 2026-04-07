import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  authApi,
  adminProfileApi,
  adminsApi,
  adminPaymentsApi,
  adminUsersApi,
  analyticsApi,
  auditionsApi,
  categoriesApi,
  challengeActionsApi,
  challengeTypesApi,
  challengesApi,
  notificationsApi,
  plansApi,
  questionsApi,
  quotesApi,
  storageApi,
  topicsApi,
  uploadApi,
  userSubscriptionsApi,
  QUOTE_IMAGE_UPLOAD_PREFIX,
} from '../services/api';
import { useAuthStore } from '../store';

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      const access = data?.tokens?.access_token;
      const refresh = data?.tokens?.refresh_token;
      if (!access) throw new Error('Access token topilmadi');

      localStorage.setItem('access_token', access);
      if (refresh) localStorage.setItem('refresh_token', refresh);

      const profile = await adminProfileApi.me();
      setAuth(profile, access, refresh);
    },
  });
};

export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);
  const refreshToken = useAuthStore((state) => state.refreshToken);

  return useMutation({
    mutationFn: () => authApi.logout({ refresh_token: refreshToken }),
    onSettled: () => logout(),
  });
};

export const useAdminProfile = () =>
  useQuery({
    queryKey: ['admin-profile'],
    queryFn: adminProfileApi.me,
  });

export const useUpdateAdminProfile = () => {
  const qc = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: adminProfileApi.update,
    onSuccess: async () => {
      const profile = await adminProfileApi.me();
      qc.setQueryData(['admin-profile'], profile);
      const { token, refreshToken } = useAuthStore.getState();
      if (token) {
        setAuth(profile, token, refreshToken);
      }
    },
  });
};

export const useCreateAdmin = () =>
  useMutation({
    mutationFn: adminsApi.create,
  });

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => categoriesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useAuditions = (categoryId) =>
  useQuery({
    queryKey: ['auditions', categoryId],
    queryFn: () => auditionsApi.list(categoryId),
    enabled: categoryId != null && categoryId !== '',
  });

export const useCreateAudition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: auditionsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auditions'] }),
  });
};

export const useUpdateAudition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => auditionsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auditions'] }),
  });
};

export const useDeleteAudition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: auditionsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auditions'] }),
  });
};

export const usePlans = () =>
  useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });

export const useCreatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: plansApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });
};

export const useUpdatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => plansApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });
};

export const useDeletePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: plansApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });
};

export const useAnalyticsSummary = () =>
  useQuery({
    queryKey: ['analytics-summary'],
    queryFn: analyticsApi.summary,
  });

export const useAdminUsers = (params, enabled = true) =>
  useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => adminUsersApi.list(params || {}),
    enabled,
  });

export const useChallengeActionsList = (params, enabled = true) =>
  useQuery({
    queryKey: ['challenge-actions', params],
    queryFn: () => challengeActionsApi.list(params),
    enabled,
  });

export const useChallengeActionsSummary = (challengeId) =>
  useQuery({
    queryKey: ['challenge-actions-summary', challengeId],
    queryFn: () => challengeActionsApi.summary(challengeId),
    enabled: Boolean(challengeId),
  });

export const useUserSubscriptions = (params) =>
  useQuery({
    queryKey: ['user-subscriptions', params],
    queryFn: () => userSubscriptionsApi.list(params),
  });

export const usePatchUserSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => userSubscriptionsApi.patch(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-subscriptions'] }),
  });
};

export const useAdminPayments = (params) =>
  useQuery({
    queryKey: ['admin-payments', params],
    queryFn: () => adminPaymentsApi.list(params),
  });

export const usePatchAdminPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => adminPaymentsApi.patch(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payments'] }),
  });
};

export const useQuotes = () =>
  useQuery({
    queryKey: ['quotes'],
    queryFn: quotesApi.list,
  });

export const useCreateQuote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: quotesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
};

export const useUpdateQuote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => quotesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
};

export const useDeleteQuote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: quotesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
};

export const useUploadFile = () =>
  useMutation({
    mutationFn: ({ file, prefix = QUOTE_IMAGE_UPLOAD_PREFIX }) => uploadApi.uploadFile(file, prefix),
  });

export const useStorageBuckets = (enabled = false) =>
  useQuery({
    queryKey: ['storage-buckets'],
    queryFn: () => storageApi.listBuckets(),
    enabled,
    staleTime: 60_000,
  });

/**
 * @param {string | null | undefined} bucket
 * @param {string} prefix
 * @param {boolean} enabled
 */
export const useStorageObjectsInfinite = (bucket, prefix, enabled) =>
  useInfiniteQuery({
    queryKey: ['storage-objects', bucket ?? '', prefix],
    queryFn: ({ pageParam }) =>
      storageApi.listObjects({
        bucket: bucket || undefined,
        prefix: prefix || undefined,
        cursor: pageParam,
        limit: 50,
      }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.next_cursor ? last.next_cursor : undefined),
    enabled: Boolean(enabled && bucket),
  });

/**
 * Storage browse (papka + fayl), `continuation_token` bilan sahifalash.
 * @param {string | null | undefined} bucket
 * @param {string} prefix — API ga yuboriladi (bo‘sh yoki yo‘l)
 * @param {boolean} enabled
 */
export const useStorageBrowseInfinite = (bucket, prefix, enabled) =>
  useInfiniteQuery({
    queryKey: ['storage-browse', bucket ?? '', prefix],
    queryFn: ({ pageParam }) =>
      storageApi.browse({
        bucket: bucket || undefined,
        prefix: prefix || undefined,
        continuation_token: pageParam,
        limit: 50,
      }),
    initialPageParam: undefined,
    getNextPageParam: (last) =>
      last.is_truncated && last.continuation_token ? last.continuation_token : undefined,
    enabled: Boolean(enabled && bucket),
  });

export const useCreateStorageFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bucket, path }) => storageApi.createFolder({ bucket, path }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storage-browse'] });
    },
  });
};

export const useDeleteStorageObject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, bucket }) => storageApi.deleteObject({ key, bucket }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storage-objects'] });
      qc.invalidateQueries({ queryKey: ['storage-browse'] });
    },
  });
};

export const useTopics = () =>
  useQuery({
    queryKey: ['topics'],
    queryFn: topicsApi.list,
  });

export const useCreateTopic = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: topicsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
  });
};

export const useUpdateTopic = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => topicsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
  });
};

export const useDeleteTopic = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: topicsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
  });
};

export const useTopicQuestions = (topicId) =>
  useQuery({
    queryKey: ['topic-questions', topicId],
    queryFn: () => questionsApi.listByTopic(topicId),
    enabled: Boolean(topicId),
  });

export const useCreateQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, payload }) => questionsApi.create(topicId, payload),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['topic-questions', variables.topicId] }),
  });
};

export const useUpdateQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, questionId, payload }) => questionsApi.update(topicId, questionId, payload),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['topic-questions', variables.topicId] }),
  });
};

export const useDeleteQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, questionId }) => questionsApi.remove(topicId, questionId),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['topic-questions', variables.topicId] }),
  });
};

export const useChallengeTypes = () =>
  useQuery({
    queryKey: ['challenge-types'],
    queryFn: challengeTypesApi.list,
  });

export const useCreateChallengeType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: challengeTypesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenge-types'] }),
  });
};

export const useUpdateChallengeType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => challengeTypesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenge-types'] }),
  });
};

export const useDeleteChallengeType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: challengeTypesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenge-types'] }),
  });
};

export const useChallenges = (filterTypeId) =>
  useQuery({
    queryKey: ['challenges', filterTypeId ?? 'all'],
    queryFn: () =>
      challengesApi.list(
        filterTypeId != null && filterTypeId !== ''
          ? { challenge_type_id: filterTypeId }
          : {}
      ),
  });

export const useCreateChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: challengesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenges'] }),
  });
};

export const useUpdateChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => challengesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenges'] }),
  });
};

export const useDeleteChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: challengesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenges'] }),
  });
};

export const useChallengeMeditations = (challengeId) =>
  useQuery({
    queryKey: ['challenge-meditations', challengeId],
    queryFn: () => challengesApi.listMeditations(challengeId),
    enabled: Boolean(challengeId),
    retry: false,
  });

export const useAddChallengeMeditation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ challengeId, payload }) => challengesApi.addMeditation(challengeId, payload),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ['challenge-meditations', v.challengeId] }),
  });
};

export const useRemoveChallengeMeditation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ challengeId, meditationId }) =>
      challengesApi.removeMeditation(challengeId, meditationId),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ['challenge-meditations', v.challengeId] }),
  });
};

export const useCommonNotifications = (enabled = true) =>
  useQuery({
    queryKey: ['notifications-common'],
    queryFn: notificationsApi.listCommon,
    enabled,
    retry: false,
  });

export const useSendNotificationToUser = () =>
  useMutation({ mutationFn: notificationsApi.sendToUser });

export const useCreateCommonNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.createCommon,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-common'] }),
  });
};

export const useUpdateCommonNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => notificationsApi.updateCommon(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-common'] }),
  });
};

export const useDeleteCommonNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.removeCommon,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-common'] }),
  });
};
