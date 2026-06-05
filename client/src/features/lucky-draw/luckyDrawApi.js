import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const KEY = 'lucky-draw';

export function useParticipants(params = {}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: async () => (await api.get('/lucky-draw', { params })).data,
  });
}

export function useCreateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/lucky-draw', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.put(`/lucky-draw/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/lucky-draw/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDrawWinner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (excludePreviousWinners = true) =>
      (await api.post('/lucky-draw/draw', { excludePreviousWinners })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useResetWins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/lucky-draw/reset-wins')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
