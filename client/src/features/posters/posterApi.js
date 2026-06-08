import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const KEY = 'posters';
const VERSE_KEY = 'bible-verse';

// Uses the existing /api/bible-verse/today endpoint that the dashboard banner
// also calls. It returns { tamil, english, reference, date } — perfect for
// the poster designer's language toggle.
export function useVerseOfDay() {
  return useQuery({
    queryKey: [VERSE_KEY, 'today'],
    queryFn: async () => (await api.get('/bible-verse/today')).data,
    staleTime: 1000 * 60 * 60,
  });
}

export function useFetchVerse(ref) {
  return useQuery({
    queryKey: [VERSE_KEY, ref],
    queryFn: async () => (await api.get('/posters/verse', { params: { ref } })).data,
    enabled: !!ref,
  });
}

export function usePosters() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () => (await api.get('/posters')).data,
  });
}

export function useCreatePoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/posters', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdatePoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.put(`/posters/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeletePoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/posters/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
