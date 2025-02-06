import { getDecodedToken } from '@cashu/cashu-ts';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { QRScanner } from '~/components/qr-scanner';
import { useToast } from '~/hooks/use-toast';

export default function Scan() {
  const { toast } = useToast();

  return (
    <>
      <PageHeader className="z-10">
        <PageBackButton
          to="/receive"
          transition="slideDown"
          applyTo="oldView"
        />
        <PageHeaderTitle>Scan</PageHeaderTitle>
      </PageHeader>
      <PageContent className="relative flex items-center justify-center">
        <QRScanner
          onDecode={(token) => {
            console.log('token', token);
            try {
              getDecodedToken(token);
              toast({
                title: 'Token decoded, navigation not implemented yet',
                description: `Token: ${token}`,
              });
            } catch {
              toast({
                title: 'Invalid token',
                variant: 'destructive',
              });
            }
          }}
        />
      </PageContent>
    </>
  );
}
