import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const KEY = 'employees';

export function useEmployees(search) {
  return useQuery({
    queryKey: [KEY, search],
    queryFn: async () => {
      const params = { active: 'true' };
      if (search) params.search = search;
      const { data } = await api.get('/employees', { params });
      return data;
    },
  });
}

export function useAllEmployees() {
  return useQuery({
    queryKey: [KEY, 'all'],
    queryFn: async () => {
      const { data } = await api.get('/employees');
      return data;
    },
  });
}

export function useEmployee(id) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSalaryReport(id, month, year) {
  return useQuery({
    queryKey: [KEY, id, 'salary', month, year],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${id}/salary-report`, { params: { month, year } });
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/employees', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/employees/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/employees/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
