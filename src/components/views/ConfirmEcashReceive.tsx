import { getDecodedToken, Token } from '@cashu/cashu-ts';
import { useMemo } from 'react';
import Amount from '../utility/amounts/Amount';
import { getMintFromToken, getUnitFromToken } from '@/utils/cashu';
import { formatUrl } from '@/utils/url';
import { useCashuContext } from '@/hooks/contexts/cashuContext';

interface ConfirmEcashReceiveProps {
   token: string | Token;
}

const ConfirmEcashReceive = ({ token }: ConfirmEcashReceiveProps) => {
   const { getMint } = useCashuContext();

   const { proofs, amountUnit, unit, mintUrl, mintAlreadyAdded } = useMemo(() => {
      const decodedToken = typeof token === 'string' ? getDecodedToken(token) : token;
      const proofs = decodedToken.token[0].proofs;
      const amountUnit = proofs.reduce((acc, curr) => acc + curr.amount, 0);
      const unit = getUnitFromToken(decodedToken);
      const mintUrl = getMintFromToken(decodedToken);
      const mintAlreadyAdded = getMint(mintUrl) ? true : false;

      return {
         proofs,
         amountUnit,
         unit,
         mintUrl,
         mintAlreadyAdded,
      };
   }, [token]);

   const getMintStatusIcon = () => {
      if (mintAlreadyAdded) {
         return <span className='text-green-500'>✅</span>;
      } else {
         return <span className='text-red-500'>❌</span>;
      }
   };

   return (
      <div className='flex flex-col items-center justify-center'>
         <Amount
            unit={unit}
            value={amountUnit}
            isDollarAmount={false}
            className='font-teko text-6xl font-bold text-black'
         />
         <p className='text-center text-sm text-gray-500'>
            <a
               href={`https://bitcoinmints.com/?tab=reviews&mintUrl=${encodeURIComponent(mintUrl)}`}
               target='_blank'
               className='underline'
            >
               {formatUrl(mintUrl)}
            </a>{' '}
            {getMintStatusIcon()}
         </p>
      </div>
   );
};

export default ConfirmEcashReceive;
