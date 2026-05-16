import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/axios';

export const uploadBroadcastFiles = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const { data } = await api.post('/broadcast/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteBroadcastFile = async (filename) => {
  const { data } = await api.delete(`/broadcast/upload/${filename}`);
  return data;
};

export function useUploadBroadcastFiles() {
  return useMutation({ mutationFn: uploadBroadcastFiles });
}

export function useDeleteBroadcastFile() {
  return useMutation({ mutationFn: deleteBroadcastFile });
}

// ── WhatsApp Bot integration ──

export function useBroadcastBotStatus() {
  return useQuery({
    queryKey: ['broadcast-bot-status'],
    queryFn: async () => (await api.get('/broadcast/bot-status')).data,
    refetchInterval: 5000,
  });
}

export function useBroadcastBotQR(enabled = true) {
  return useQuery({
    queryKey: ['broadcast-bot-qr'],
    queryFn: async () => (await api.get('/broadcast/bot-qr')).data,
    enabled,
    refetchInterval: enabled ? 3000 : false,
  });
}

export function useSendViaBot() {
  return useMutation({
    mutationFn: async ({ recipients, message }) =>
      (await api.post('/broadcast/send', { recipients, message })).data,
  });
}

export function useRestartBot() {
  return useMutation({
    mutationFn: async ({ clearSession = false } = {}) =>
      (await api.post('/broadcast/bot-restart', { clearSession })).data,
  });
}

export function usePreviewSummary() {
  return useMutation({
    mutationFn: async ({ audience, ownerPhones }) =>
      (await api.post('/broadcast/summary/preview', { audience, ownerPhones })).data,
  });
}

export function useSendSummary() {
  return useMutation({
    mutationFn: async ({ audience, ownerPhones }) =>
      (await api.post('/broadcast/summary/send', { audience, ownerPhones })).data,
  });
}
