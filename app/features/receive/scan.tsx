import { getEncodedToken } from '@cashu/cashu-ts';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { QRScanner } from '~/components/qr-scanner';
import { useToast } from '~/hooks/use-toast';
import { extractCashuToken } from '~/lib/cashu';
import { useNavigateWithViewTransition } from '~/lib/transitions';

export default function Scan() {
  const { toast } = useToast();
  const navigate = useNavigateWithViewTransition();

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
          onDecode={(scannedContent) => {
            const token = extractCashuToken(scannedContent);
            if (!token) {
              toast({
                title: 'Invalid input',
                description: 'Please scan a valid cashu token',
                variant: 'destructive',
              });
              return;
            }

            navigate(`/receive/cashu/token#${getEncodedToken(token)}`, {
              transition: 'slideLeft',
              applyTo: 'newView',
            });
          }}
        />
      </PageContent>
    </>
  );
}
