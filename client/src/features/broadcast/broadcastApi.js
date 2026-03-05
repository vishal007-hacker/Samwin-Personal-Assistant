import { useMutation } from '@tanstack/react-query';
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
