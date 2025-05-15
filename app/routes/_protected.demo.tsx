import { MoneyDisplay } from '~/components/money-display';
import { Button } from '~/components/ui/button';
import type { CashuSendSwap } from '~/features/send/cashu-send-swap';
import {
  useCancelCashuSendSwap,
  useUnresolvedCashuSendSwaps,
} from '~/features/send/cashu-send-swap-hooks';
import { getDefaultUnit } from '~/features/shared/currencies';

export default function Demo() {
  const { pending } = useUnresolvedCashuSendSwaps();
  const { mutate: cancelCashuSendSwap } = useCancelCashuSendSwap();

  const handleCancelCashuSendSwap = (swap: CashuSendSwap) => {
    cancelCashuSendSwap(
      { swap },
      {
        onSuccess: () => {
          console.log('Swap cancelled');
        },
        onError: (error) => {
          console.error('Failed to cancel swap', error);
        },
      },
    );
  };
  return (
    <div>
      <h1>This is Demo page</h1>
      {pending.length > 0 ? (
        <div className="mt-4 space-y-4">
          <h2 className="font-semibold text-xl">Pending Swaps</h2>
          <ul className="space-y-3">
            {pending.map((swap) => (
              <li key={swap.id} className="rounded-lg border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <MoneyDisplay
                      money={swap.amountToSend}
                      variant="secondary"
                      unit={getDefaultUnit(swap.currency)}
                    />
                    <p className="text-gray-500 text-sm">
                      ID: {swap.id.substring(0, 8)}...
                    </p>
                    <p className="text-gray-500 text-sm">
                      Created: {new Date(swap.createdAt).toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Mint: {swap.mintUrl}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelCashuSendSwap(swap)}
                  >
                    Cancel
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-gray-500">No pending swaps</p>
      )}
    </div>
  );
}
