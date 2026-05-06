import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const KEY = 'vehicle-insurance';

export function useVehicleInsurances(params = {}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get('/vehicle-insurance', { params });
      return data;
    },
    keepPreviousData: true,
  });
}

export function useVehicleInsurance(id) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await api.get(`/vehicle-insurance/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useInsuranceTypes() {
  return useQuery({
    queryKey: [KEY, 'types'],
    queryFn: async () => {
      const { data } = await api.get('/vehicle-insurance/types');
      return data;
    },
  });
}

export function useDueReminders() {
  return useQuery({
    queryKey: [KEY, 'due-reminders'],
    queryFn: async () => {
      const { data } = await api.get('/vehicle-insurance/due-reminders');
      return data;
    },
  });
}

export function useCreateVehicleInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.post('/vehicle-insurance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateVehicleInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, formData }) => {
      const { data } = await api.put(`/vehicle-insurance/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteVehicleInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/vehicle-insurance/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useCreateInsuranceType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name) => {
      const { data } = await api.post('/vehicle-insurance/types', { name });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'types'] }),
  });
}
