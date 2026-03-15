import { fetchOpenRouterModels } from '@/models';
import type { AppSlice } from '@/store/types';

/** Creates the models slice. */
export const createModelsSlice: AppSlice<
  Pick<import('@/types').AppState, 'models' | 'modelsLoading' | 'modelsError' | 'lastModelFetch'> &
    import('@/store/types').ModelsActions
> = (set) => ({
  models: [],
  modelsLoading: false,
  modelsError: undefined,
  lastModelFetch: undefined,
  fetchModels: async (force = false) => {
    set({ modelsLoading: true, modelsError: undefined });
    try {
      const result = await fetchOpenRouterModels(force);
      set({
        models: result.models,
        modelsLoading: false,
        modelsError: undefined,
        lastModelFetch: result.timestamp,
      });
    } catch (error) {
      set({
        modelsLoading: false,
        modelsError: error instanceof Error ? error.message : 'Failed to load models',
      });
    }
  },
});
