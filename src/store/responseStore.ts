import type { AppSlice } from '@/store/types';

/** Creates the response slice. */
export const createResponseSlice: AppSlice<
  Pick<import('@/types').AppState, 'response' | 'isSending'> & import('@/store/types').ResponseActions
> = (set) => ({
  response: undefined,
  isSending: false,
  setResponse: (response) => set({ response }),
  setIsSending: (isSending) => set({ isSending }),
});
