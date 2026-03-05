import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

// --- Raw API functions ---

export const fetchCredits = async (params = {}) => {
  const { data } = await api.get('/credits', { params });
  return data;
};

export const fetchCredit = async (id) => {
  const { data } = await api.get(`/credits/${id}`);
  return data;
};

export const fetchCreditsByCustomer = async (customerId) => {
  const { data } = await api.get(`/credits/customer/${customerId}`);
  return data;
};

export const createCreditApi = async (creditData) => {
  const { data } = await api.post('/credits', creditData);
  return data;
};

export const topupCreditApi = async ({ id, amount, dueDate, notes }) => {
  const { data } = await api.put(`/credits/${id}/topup`, { amount, dueDate, notes });
  return data;
};

export const payCreditApi = async ({ id, amount, notes }) => {
  const { data } = await api.put(`/credits/${id}/payment`, { amount, notes });
  return data;
};

export const closeCreditApi = async (id) => {
  const { data } = await api.put(`/credits/${id}/close`);
  return data;
};

export const deleteCreditApi = async (id) => {
  const { data } = await api.delete(`/credits/${id}`);
  return data;
};

// --- React Query Hooks ---

export function useCredits(params = {}) {
  return useQuery({
    queryKey: ['credits', params],
    queryFn: () => fetchCredits(params),
    keepPreviousData: true,
  });
}

export function useCredit(id) {
  return useQuery({
    queryKey: ['credits', id],
    queryFn: () => fetchCredit(id),
    enabled: !!id,
  });
}

export function useCreditsByCustomer(customerId) {
  return useQuery({
    queryKey: ['credits', 'customer', customerId],
    queryFn: () => fetchCreditsByCustomer(customerId),
    enabled: !!customerId,
  });
}

export function useCreateCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCreditApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useTopupCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: topupCreditApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function usePayCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payCreditApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useCloseCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: closeCreditApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useDeleteCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCreditApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credits'] }),
  });
}
