import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const STATUS_KEY = 'ai-status';
const QR_KEY = 'ai-qr';
const WHITELIST_KEY = 'ai-whitelist';
const CONVERSATIONS_KEY = 'ai-conversations';

// ── Status ──

export function useAIStatus() {
  return useQuery({
    queryKey: [STATUS_KEY],
    queryFn: async () => (await api.get('/ai/status')).data,
    refetchInterval: 5000, // poll every 5s while page is open
  });
}

export function useAIQR(enabled = true) {
  return useQuery({
    queryKey: [QR_KEY],
    queryFn: async () => (await api.get('/ai/qr')).data,
    enabled,
    refetchInterval: enabled ? 3000 : false,
  });
}

// ── Whitelist ──

export function useAllowedNumbers() {
  return useQuery({
    queryKey: [WHITELIST_KEY],
    queryFn: async () => (await api.get('/ai/allowed-numbers')).data,
  });
}

export function useCreateAllowedNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/ai/allowed-numbers', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [WHITELIST_KEY] }),
  });
}

export function useUpdateAllowedNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.put(`/ai/allowed-numbers/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [WHITELIST_KEY] }),
  });
}

export function useDeleteAllowedNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/ai/allowed-numbers/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [WHITELIST_KEY] }),
  });
}

// ── Conversations ──

export function useConversations(params = {}) {
  return useQuery({
    queryKey: [CONVERSATIONS_KEY, params],
    queryFn: async () => (await api.get('/ai/conversations', { params })).data,
    refetchInterval: 10000,
  });
}

// ── Test ──

export function useTestPrompt() {
  return useMutation({
    mutationFn: async (message) => (await api.post('/ai/test', { message })).data,
  });
}

export function useTestNotification() {
  return useMutation({
    mutationFn: async (type = 'daily-summary') =>
      (await api.post('/ai/test-notification', null, { params: { type } })).data,
  });
}
