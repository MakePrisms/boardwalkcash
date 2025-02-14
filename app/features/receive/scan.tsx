import { getDecodedToken } from '@cashu/cashu-ts';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { QRScanner } from '~/components/qr-scanner';
import { useToast } from '~/hooks/use-toast';
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
          onDecode={(token) => {
            console.log('token', token);
            try {
              getDecodedToken(token);
              navigate(`/receive/cashu-token#${token}`, {
                applyTo: 'oldView',
                transition: 'slideDown',
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
