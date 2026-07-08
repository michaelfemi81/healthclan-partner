export function useNativeSetupIntent() {
  return async (..._args: any[]): Promise<any> => {
    throw new Error('Card entry is unavailable on this device.');
  };
}

export function NativeStripeCardField(_props: { onCompleteChange: (complete: boolean) => void }) {
  return null;
}
