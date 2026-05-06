import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

// ── API Functions ───────────────────────────────────────────────────────────

export const fetchSalesCategories = async () => {
  const { data } = await api.get('/sales/categories');
  return data;
};

export const createSalesCategoryApi = async (categoryData) => {
  const { data } = await api.post('/sales/categories', categoryData);
  return data;
};

export const updateSalesCategoryApi = async ({ id, ...categoryData }) => {
  const { data } = await api.put(`/sales/categories/${id}`, categoryData);
  return data;
};

export const deleteSalesCategoryApi = async (id) => {
  const { data } = await api.delete(`/sales/categories/${id}`);
  return data;
};

export const fetchSales = async (params = {}) => {
  const { data } = await api.get('/sales', { params });
  return data;
};

export const fetchSalesSummary = async (params = {}) => {
  const { data } = await api.get('/sales/summary', { params });
  return data;
};

export const fetchSalesReport = async (params = {}) => {
  const { data } = await api.get('/sales/report', { params });
  return data;
};

export const createSaleApi = async (saleData) => {
  const { data } = await api.post('/sales', saleData);
  return data;
};

export const updateSaleApi = async ({ id, ...saleData }) => {
  const { data } = await api.put(`/sales/${id}`, saleData);
  return data;
};

export const deleteSaleApi = async (id) => {
  const { data } = await api.delete(`/sales/${id}`);
  return data;
};

// ── React Query Hooks ───────────────────────────────────────────────────────

export function useSalesCategories() {
  return useQuery({
    queryKey: ['sales', 'categories'],
    queryFn: fetchSalesCategories,
  });
}

export function useCreateSalesCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSalesCategoryApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales', 'categories'] }),
  });
}

export function useUpdateSalesCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSalesCategoryApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales', 'categories'] }),
  });
}

export function useDeleteSalesCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSalesCategoryApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales', 'categories'] }),
  });
}

export function useSales(params = {}) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => fetchSales(params),
    keepPreviousData: true,
  });
}

export function useSalesSummary(params = {}) {
  return useQuery({
    queryKey: ['sales', 'summary', params],
    queryFn: () => fetchSalesSummary(params),
  });
}

export function useSalesReport(params = {}) {
  return useQuery({
    queryKey: ['sales', 'report', params],
    queryFn: () => fetchSalesReport(params),
    enabled: !!params.from && !!params.to,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSaleApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

export function useUpdateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSaleApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSaleApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}
