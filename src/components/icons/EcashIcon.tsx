import { BanknotesIcon as HeroBanknotesIconSolid } from '@heroicons/react/20/solid';
import { BanknotesIcon as HeroBanknotesIconOutline } from '@heroicons/react/24/outline';

const EcashIcon = ({ className, type }: { className?: string; type?: 'solid' | 'outline' }) => {
   if (type === 'solid') {
      return <HeroBanknotesIconSolid className={className} />;
   }
   return <HeroBanknotesIconOutline className={className} />;
};

export default EcashIcon;
