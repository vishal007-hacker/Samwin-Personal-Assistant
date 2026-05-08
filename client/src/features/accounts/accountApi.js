import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const KEY = 'accounts';

export function useAccounts() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data } = await api.get('/accounts');
      return data;
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/accounts', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/accounts/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/accounts/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

// ── Snapshots ──

const SNAP_KEY = 'account-snapshots';

export function useAccountSnapshots(params = {}) {
  return useQuery({
    queryKey: [SNAP_KEY, params],
    queryFn: async () => {
      const { data } = await api.get('/accounts/snapshots', { params });
      return data;
    },
  });
}

export function useSaveSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload = {}) => {
      const { data } = await api.post('/accounts/snapshots', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SNAP_KEY] }),
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/accounts/snapshots/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SNAP_KEY] }),
  });
}
