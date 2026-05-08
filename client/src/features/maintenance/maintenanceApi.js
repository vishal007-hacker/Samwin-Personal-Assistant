import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const PRODUCT_KEY = 'maintenance-products';
const RECORD_KEY = 'maintenance-records';

// ── Products ──

export function useMaintenanceProducts(params = {}) {
  return useQuery({
    queryKey: [PRODUCT_KEY, params],
    queryFn: async () => {
      const { data } = await api.get('/maintenance/products', { params });
      return data;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/maintenance/products', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCT_KEY] });
      qc.invalidateQueries({ queryKey: [RECORD_KEY] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/maintenance/products/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRODUCT_KEY] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/maintenance/products/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCT_KEY] });
      qc.invalidateQueries({ queryKey: [RECORD_KEY] });
    },
  });
}

// ── Records ──

export function useMaintenanceRecords(params = {}) {
  return useQuery({
    queryKey: [RECORD_KEY, params],
    queryFn: async () => {
      const { data } = await api.get('/maintenance/records', { params });
      return data;
    },
  });
}

export function useCreateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/maintenance/records', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECORD_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCT_KEY] });
    },
  });
}

export function useUpdateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/maintenance/records/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RECORD_KEY] }),
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/maintenance/records/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RECORD_KEY] }),
  });
}
