import { useCashuContext } from '@/hooks/contexts/cashuContext';
import Amount from '@/components/utility/amounts/Amount';
import { NumpadControls } from '@/hooks/util/useNumpad';
import { shortenString } from '@/utils/formatting';
import { PaymentRequest } from '@cashu/cashu-ts';
import { Tabs } from '@/components/utility/Tabs';
import { PublicContact } from '@/types';

type ActiveTab = 'ecash' | 'lightning';

const tabs: Array<{ title: string; value: ActiveTab; index: number }> = [
   { title: 'ecash', value: 'ecash', index: 0 },
   { title: 'lightning', value: 'lightning', index: 1 },
];

interface AmountInputProps {
   numpad: NumpadControls;
   contact?: PublicContact;
   paymentRequest?: PaymentRequest;
   onActiveTabChange: (tab: number) => void;
   children: React.ReactNode;
   activeTab: ActiveTab;
}

const AmountInput = ({
   numpad,
   contact,
   paymentRequest,
   onActiveTabChange,
   activeTab,
   children,
}: AmountInputProps) => {
   const { activeUnit } = useCashuContext();
   const { numpadValue } = numpad;

   return (
      <>
         <Tabs
            titleColor='text-black'
            titles={tabs.map(x => x.title)}
            onChange={index => onActiveTabChange(index)}
            value={tabs.findIndex(x => x.value === activeTab)}
         />
         <div className='flex-grow flex flex-col items-center justify-center'>
            <Amount
               value={numpadValue}
               unit={activeUnit}
               className='font-teko text-6xl font-bold text-black'
               isDollarAmount={true}
            />
            {contact && (
               <div className='flex justify-center items-center text-gray-500'>
                  to {contact.username}
               </div>
            )}
            {paymentRequest && (
               <div className='flex justify-center items-center text-gray-500'>
                  to {shortenString(paymentRequest.toEncodedRequest(), 17)}
               </div>
            )}
         </div>
         {children}
      </>
   );
};

export default AmountInput;
