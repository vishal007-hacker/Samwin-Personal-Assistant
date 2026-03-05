import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

// ─── API Functions ──────────────────────────────────────────────────────────

export const fetchPayments = async (params = {}) => {
  const { data } = await api.get('/payments', { params });
  return data;
};

export const fetchPolicyPayments = async (policyId) => {
  const { data } = await api.get(`/payments/policy/${policyId}`);
  return data;
};

export const createPayment = async (paymentData) => {
  const { data } = await api.post('/payments', paymentData);
  return data;
};

export const updatePayment = async ({ id, ...paymentData }) => {
  const { data } = await api.put(`/payments/${id}`, paymentData);
  return data;
};

export const deletePayment = async (id) => {
  const { data } = await api.delete(`/payments/${id}`);
  return data;
};

// ─── React Query Hooks ──────────────────────────────────────────────────────

export function usePayments(params = {}) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => fetchPayments(params),
    keepPreviousData: true,
  });
}

export function usePolicyPayments(policyId) {
  return useQuery({
    queryKey: ['payments', 'policy', policyId],
    queryFn: () => fetchPolicyPayments(policyId),
    enabled: !!policyId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}
