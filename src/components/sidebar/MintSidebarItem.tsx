import { Wallet } from '@/types';
import { Proof } from '@cashu/cashu-ts';
import { Badge, Sidebar } from 'flowbite-react';
import { useEffect, useState } from 'react';

interface MintSidebarItemProps {
   keyset: Wallet;
}

export const MintSidebarItem = ({ keyset }: MintSidebarItemProps) => {
   const [mintBalance, setMintBalance] = useState('0');

   const mintHostDomain = keyset.url.replace('https://', '');

   useEffect(() => {
      const allProofs = JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[];

      const thisProofs = allProofs.filter((proof: any) => proof.keysetId === keyset.id);

      const thisBalanceCents = thisProofs.reduce(
         (acc: number, proof: any) => acc + proof.amount,
         0,
      );

      const thisBalance = (thisBalanceCents / 100).toFixed(2);

      setMintBalance(thisBalance);
   }, [keyset]);

   return (
      <Sidebar.Item className='w-full'>
         <div className='flex justify-between min-w-full'>
            <div>{`${mintHostDomain.slice(0, 10)}...${mintHostDomain.slice(-10)}`}</div>
            &nbsp;
            <div>
               {keyset.active ? (
                  <Badge color='success'>Default</Badge>
               ) : (
                  <div className='text-transparent'>Inacdve</div>
                  // <Badge color='failure'>Inactive</Badge>
               )}
            </div>
            <div>
               <Badge>${mintBalance}</Badge>
            </div>
         </div>
      </Sidebar.Item>
   );
};

export default MintSidebarItem;
