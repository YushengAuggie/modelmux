import { withFreshMessageIds } from '@/store/requestStore';
import type { AppSlice } from '@/store/types';

/** Creates the history slice. */
export const createHistorySlice: AppSlice<Pick<import('@/types').AppState, 'history'> & import('@/store/types').HistoryActions> = (
  set,
) => ({
  history: [],
  prependHistory: (item) =>
    set((state) => {
      const sanitized = { ...item, request: { ...item.request, apiKey: '' } };
      return { history: [sanitized, ...state.history].slice(0, 100) };
    }),
  replayHistory: (id) =>
    set((state) => {
      const item = state.history.find((entry) => entry.id === id);
      return item
        ? { request: { ...item.request, messages: withFreshMessageIds(item.request.messages) }, response: item.response }
        : state;
    }),
  deleteHistory: (id) => set((state) => ({ history: state.history.filter((item) => item.id !== id) })),
  clearHistory: () => set({ history: [] }),
});
