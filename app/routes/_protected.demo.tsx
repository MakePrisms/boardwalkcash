import { MoneyDisplay } from '~/components/money-display';
import {
  ClosePageButton,
  Page,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import type { CashuSendSwap } from '~/features/send/cashu-send-swap';
import {
  useReverseCashuSendSwap,
  useUnresolvedCashuSendSwaps,
} from '~/features/send/cashu-send-swap-hooks';
import { getDefaultUnit } from '~/features/shared/currencies';

export default function Demo() {
  const { pending } = useUnresolvedCashuSendSwaps();
  const { mutate: reverseCashuSendSwap } = useReverseCashuSendSwap();

  const handleReverseCashuSendSwap = (swap: CashuSendSwap) => {
    reverseCashuSendSwap(
      { swap },
      {
        onSuccess: () => {
          console.log('Swap reversed');
        },
        onError: (error) => {
          console.error('Failed to reverse swap', error);
        },
      },
    );
  };

  return (
    <Page>
      <PageHeader>
        <ClosePageButton transition="slideRight" applyTo="oldView" to="/" />
        <PageHeaderTitle>Pending Sends</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        {pending.length > 0 ? (
          <div className="mt-4 space-y-4">
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
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReverseCashuSendSwap(swap)}
                    >
                      Cancel
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-gray-500">No pending sends</p>
        )}
      </PageContent>
    </Page>
  );
}
