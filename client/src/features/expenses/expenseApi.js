import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

export const fetchExpenses = async (params = {}) => {
  const { data } = await api.get('/expenses', { params });
  return data;
};

export const fetchExpenseSummary = async (params = {}) => {
  const { data } = await api.get('/expenses/summary', { params });
  return data;
};

export const fetchExpenseCategories = async () => {
  const { data } = await api.get('/expenses/categories');
  return data;
};

export const createExpenseCategoryApi = async (name) => {
  const { data } = await api.post('/expenses/categories', { name });
  return data;
};

export const createExpenseApi = async (expenseData) => {
  const { data } = await api.post('/expenses', expenseData);
  return data;
};

export const updateExpenseApi = async ({ id, ...expenseData }) => {
  const { data } = await api.put(`/expenses/${id}`, expenseData);
  return data;
};

export const deleteExpenseApi = async (id) => {
  const { data } = await api.delete(`/expenses/${id}`);
  return data;
};

// --- React Query Hooks ---

export function useExpenses(params = {}) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => fetchExpenses(params),
    keepPreviousData: true,
  });
}

export function useExpenseSummary(params = {}) {
  return useQuery({
    queryKey: ['expenses', 'summary', params],
    queryFn: () => fetchExpenseSummary(params),
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expenses', 'categories'],
    queryFn: fetchExpenseCategories,
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createExpenseCategoryApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', 'categories'] }),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createExpenseApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateExpenseApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteExpenseApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
