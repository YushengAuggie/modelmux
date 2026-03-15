import type { AppSlice } from '@/store/types';

/** Creates the UI slice. */
export const createUiSlice: AppSlice<Pick<
  import('@/types').AppState,
  'theme' | 'showRawRequest' | 'showRawResponse' | 'modelSearch'
> &
  import('@/store/types').UiActions> = (set) => ({
  theme: 'dark',
  showRawRequest: false,
  showRawResponse: false,
  modelSearch: '',
  setTheme: (theme) => set({ theme }),
  setShowRawRequest: (showRawRequest) => set({ showRawRequest }),
  setShowRawResponse: (showRawResponse) => set({ showRawResponse }),
  setModelSearch: (modelSearch) => set({ modelSearch }),
});
