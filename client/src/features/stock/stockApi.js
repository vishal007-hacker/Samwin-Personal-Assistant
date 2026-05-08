import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

// --- API functions ---

export const fetchStocks = async (params = {}) => {
  const { data } = await api.get('/stock', { params });
  return data;
};

export const fetchStock = async (id) => {
  const { data } = await api.get(`/stock/${id}`);
  return data;
};

export const fetchBrands = async (params = {}) => {
  const { data } = await api.get('/stock/brands', { params });
  return data;
};

export const fetchStockReport = async (params = {}) => {
  const { data } = await api.get('/stock/report/summary', { params });
  return data;
};

export const fetchNextStockCode = async () => {
  const { data } = await api.get('/stock/next-code');
  return data;
};

export const createStockApi = async (stockData) => {
  const { data } = await api.post('/stock', stockData);
  return data;
};

export const updateStockApi = async ({ id, ...stockData }) => {
  const { data } = await api.put(`/stock/${id}`, stockData);
  return data;
};

export const sellStockApi = async ({ id, ...sellData }) => {
  const { data } = await api.put(`/stock/${id}/sell`, sellData);
  return data;
};

export const deleteStockApi = async (id) => {
  const { data } = await api.delete(`/stock/${id}`);
  return data;
};

// --- Hooks ---

export function useStocks(params = {}) {
  return useQuery({
    queryKey: ['stock', params],
    queryFn: () => fetchStocks(params),
    keepPreviousData: true,
  });
}

export function useStock(id) {
  return useQuery({
    queryKey: ['stock', id],
    queryFn: () => fetchStock(id),
    enabled: !!id,
  });
}

export function useBrands(category) {
  return useQuery({
    queryKey: ['stock', 'brands', category],
    queryFn: () => fetchBrands(category ? { category } : {}),
  });
}

export function useStockReport(params = {}) {
  return useQuery({
    queryKey: ['stock', 'report', params],
    queryFn: () => fetchStockReport(params),
    keepPreviousData: true,
  });
}

export function useNextStockCode(enabled = true) {
  return useQuery({
    queryKey: ['stock', 'next-code'],
    queryFn: fetchNextStockCode,
    enabled,
    staleTime: 0,
  });
}

export function useCreateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStockApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock'] }),
  });
}

export function useUpdateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateStockApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock'] }),
  });
}

export function useSellStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sellStockApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock'] }),
  });
}

export function useDeleteStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteStockApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock'] }),
  });
}
