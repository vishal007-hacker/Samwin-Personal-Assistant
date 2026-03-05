import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

// ── API Functions ──────────────────────────────────────────────

export const fetchCustomers = async (params = {}) => {
  const { data } = await api.get('/customers', { params });
  return data; // { success, data: [...], pagination }
};

export const fetchCustomer = async (id) => {
  const { data } = await api.get(`/customers/${id}`);
  return data; // { success, data: { ... } }
};

export const searchCustomers = async (q) => {
  const { data } = await api.get('/customers/search', { params: { q } });
  return data;
};

export const createCustomer = async (customerData) => {
  const { data } = await api.post('/customers', customerData);
  return data;
};

export const updateCustomer = async (id, customerData) => {
  const { data } = await api.put(`/customers/${id}`, customerData);
  return data;
};

export const deleteCustomer = async (id) => {
  const { data } = await api.delete(`/customers/${id}`);
  return data;
};

// ── React Query Hooks ──────────────────────────────────────────

export function useCustomers(params = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => fetchCustomers(params),
    keepPreviousData: true,
  });
}

export function useCustomer(id) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => fetchCustomer(id),
    enabled: !!id,
  });
}

export function useSearchCustomers(q) {
  return useQuery({
    queryKey: ['customers', 'search', q],
    queryFn: () => searchCustomers(q),
    enabled: q?.length >= 2,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateCustomer(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
