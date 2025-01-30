import type {
  QueryData,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { QRCodeWithLoadingState } from '~/components/qr-code';
import { Button } from '~/components/ui/button';
import { boardwalkDb } from '~/features/boardwalk-db/database';
import { useUserStore } from '~/features/user/user-provider';

const accountsQuery = boardwalkDb.from('accounts').select();
type Accounts = QueryData<typeof accountsQuery>;
type Account = Accounts[number];

export default function Demo() {
  const user = useUserStore((x) => x.user);
  const [accounts, setAccounts] = useState<Accounts>([]);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getAccounts = async () => {
      if (!user.id) return;

      const { data, error } = await accountsQuery;

      if (error) {
        setError(error.message);
      } else {
        setAccounts(data);
      }
    };

    getAccounts();
  }, [user.id]);

  useEffect(() => {
    const channel = boardwalkDb
      .channel('accounts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'accounts',
        },
        (payload: RealtimePostgresChangesPayload<Account>) => {
          if (payload.eventType === 'DELETE') {
            setAccounts((prev) =>
              prev.filter((account) => account.id !== payload.old.id),
            );
          } else if (payload.eventType === 'INSERT') {
            setAccounts((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setAccounts((prev) =>
              prev.map((account) =>
                account.id === payload.new.id ? payload.new : account,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1>This is Demo page</h1>
      {error ? (
        <div className="mt-4">{error}</div>
      ) : (
        <div className="mt-4">
          {accounts.map((account) => (
            <div key={account.id}>
              <pre>{JSON.stringify(account, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <h2 className="font-semibold text-lg">QR Code Demo.</h2>
        <QRCodeWithLoadingState value={qrCodeValue} size={200} />
        <Button
          variant="outline"
          className="w-fit"
          onClick={() =>
            setQrCodeValue(qrCodeValue ? undefined : 'https://boardwalk.xyz')
          }
        >
          Toggle Loading State
        </Button>
      </div>
    </div>
  );
}
