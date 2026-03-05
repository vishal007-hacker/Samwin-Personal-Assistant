import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

// ── API Functions ──────────────────────────────────────────────

export const fetchSchemes = async (params = {}) => {
  const { data } = await api.get('/schemes', { params });
  return data; // { success, data: [...], pagination }
};

export const fetchScheme = async (id) => {
  const { data } = await api.get(`/schemes/${id}`);
  return data; // { success, data: { ... } }
};

export const fetchSchemeTypes = async () => {
  const { data } = await api.get('/schemes/types');
  return data;
};

export const createScheme = async (schemeData) => {
  const { data } = await api.post('/schemes', schemeData);
  return data;
};

export const updateScheme = async (id, schemeData) => {
  const { data } = await api.put(`/schemes/${id}`, schemeData);
  return data;
};

export const deleteScheme = async (id) => {
  const { data } = await api.delete(`/schemes/${id}`);
  return data;
};

// ── React Query Hooks ──────────────────────────────────────────

export function useSchemes(params = {}) {
  return useQuery({
    queryKey: ['schemes', params],
    queryFn: () => fetchSchemes(params),
    keepPreviousData: true,
  });
}

export function useScheme(id) {
  return useQuery({
    queryKey: ['schemes', id],
    queryFn: () => fetchScheme(id),
    enabled: !!id,
  });
}

export function useSchemeTypes() {
  return useQuery({
    queryKey: ['schemes', 'types'],
    queryFn: fetchSchemeTypes,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
}

export function useCreateScheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createScheme(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    },
  });
}

export function useUpdateScheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateScheme(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
      queryClient.invalidateQueries({ queryKey: ['schemes', variables.id] });
    },
  });
}

export function useDeleteScheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteScheme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    },
  });
}
