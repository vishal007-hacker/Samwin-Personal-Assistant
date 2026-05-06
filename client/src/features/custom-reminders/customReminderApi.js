import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const KEY = 'custom-reminders';

export function useCustomReminders(active) {
  return useQuery({
    queryKey: [KEY, active],
    queryFn: async () => {
      const params = {};
      if (active !== undefined) params.active = active;
      const { data } = await api.get('/custom-reminders', { params });
      return data;
    },
  });
}

export function useDueReminders(enabled = true) {
  return useQuery({
    queryKey: [KEY, 'due'],
    queryFn: async () => {
      const { data } = await api.get('/custom-reminders/due');
      return data;
    },
    enabled,
    refetchInterval: 30000, // check every 30 seconds
  });
}

export function useCreateCustomReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/custom-reminders', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateCustomReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/custom-reminders/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useStopCustomReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.put(`/custom-reminders/${id}/stop`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteCustomReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/custom-reminders/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
