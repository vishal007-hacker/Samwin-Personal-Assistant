import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const KEY = 'device-service';

export function useDeviceServices(params = {}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get('/device-service', { params });
      return data;
    },
    keepPreviousData: true,
  });
}

export function useCreateDeviceService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/device-service', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateDeviceService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/device-service/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteDeviceService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/device-service/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

// ── Device Types ──

const TYPE_KEY = 'device-types';

export function useDeviceTypes() {
  return useQuery({
    queryKey: [TYPE_KEY],
    queryFn: async () => {
      const { data } = await api.get('/device-service/types');
      return data;
    },
  });
}

export function useCreateDeviceType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name) => {
      const { data } = await api.post('/device-service/types', { name });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TYPE_KEY] }),
  });
}
