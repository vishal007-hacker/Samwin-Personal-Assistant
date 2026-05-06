import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const KEY = 'billing';

export const fetchBillings = async (params = {}) => {
  const { data } = await api.get('/billing', { params });
  return data;
};

export const fetchBilling = async (id) => {
  const { data } = await api.get(`/billing/${id}`);
  return data;
};

export const fetchNextNumber = async (type) => {
  const { data } = await api.get(`/billing/next-number/${type}`);
  return data;
};

export const createBillingApi = async (billingData) => {
  const { data } = await api.post('/billing', billingData);
  return data;
};

export const updateBillingApi = async ({ id, ...billingData }) => {
  const { data } = await api.put(`/billing/${id}`, billingData);
  return data;
};

export const deleteBillingApi = async (id) => {
  const { data } = await api.delete(`/billing/${id}`);
  return data;
};

// --- Hooks ---

export function useBillings(params = {}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => fetchBillings(params),
    keepPreviousData: true,
  });
}

export function useBilling(id) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => fetchBilling(id),
    enabled: !!id,
  });
}

export function useNextNumber(type) {
  return useQuery({
    queryKey: [KEY, 'next-number', type],
    queryFn: () => fetchNextNumber(type),
    enabled: !!type,
  });
}

export function useCreateBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBillingApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateBillingApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBillingApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
