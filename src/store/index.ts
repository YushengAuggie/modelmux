import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createHistorySlice } from '@/store/historyStore';
import { createModelsSlice } from '@/store/modelsStore';
import { createRequestSlice } from '@/store/requestStore';
import { createResponseSlice } from '@/store/responseStore';
import type { AppStore } from '@/store/types';
import { createUiSlice } from '@/store/uiStore';

/** Root zustand store used by the application shell. */
export const useAppStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createUiSlice(...args),
      ...createRequestSlice(...args),
      ...createResponseSlice(...args),
      ...createModelsSlice(...args),
      ...createHistorySlice(...args),
    }),
    {
      name: 'api-pilot-store-v1',
      partialize: (state) => ({
        theme: state.theme,
        showRawRequest: state.showRawRequest,
        showRawResponse: state.showRawResponse,
        request: state.request,
        history: state.history,
        lastModelFetch: state.lastModelFetch,
        models: state.models,
      }),
    },
  ),
);

export type { AppStore } from '@/store/types';
