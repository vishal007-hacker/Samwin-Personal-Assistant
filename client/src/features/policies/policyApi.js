import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

// ─── API Functions ──────────────────────────────────────────────────────────

export const fetchPolicies = async (params = {}) => {
  const { data } = await api.get('/policies', { params });
  return data;
};

export const fetchPolicy = async (id) => {
  const { data } = await api.get(`/policies/${id}`);
  return data;
};

export const createPolicy = async (policyData) => {
  const { data } = await api.post('/policies', policyData);
  return data;
};

export const updatePolicy = async ({ id, ...policyData }) => {
  const { data } = await api.put(`/policies/${id}`, policyData);
  return data;
};

export const deletePolicy = async (id) => {
  const { data } = await api.delete(`/policies/${id}`);
  return data;
};

// ─── React Query Hooks ──────────────────────────────────────────────────────

export function usePolicies(params = {}) {
  return useQuery({
    queryKey: ['policies', params],
    queryFn: () => fetchPolicies(params),
    keepPreviousData: true,
  });
}

export function usePolicy(id) {
  return useQuery({
    queryKey: ['policies', id],
    queryFn: () => fetchPolicy(id),
    enabled: !!id,
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePolicy,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policies', variables.id] });
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}
