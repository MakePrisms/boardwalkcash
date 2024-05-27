import { setDefaultTapAmount, setEcashTapsEnabled } from '@/redux/slices/SettingsSlice';
import { RootState } from '@/redux/store';
import { Badge } from 'flowbite-react';
import { useDispatch, useSelector } from 'react-redux';

const EcashTapsSettings = () => {
   const { ecashTapsEnabled, defaultTapAmount } = useSelector((state: RootState) => state.settings);

   const dispatch = useDispatch();

   const handleSetTapAmount = (amount: number) => {
      if (amount === defaultTapAmount) return;
      if (amount === 0) {
         dispatch(setEcashTapsEnabled(false));
      } else if (!ecashTapsEnabled) {
         dispatch(setEcashTapsEnabled(true));
      }

      dispatch(setDefaultTapAmount(amount));
   };

   const tapAmounts = [
      { name: 'off', value: 0 },
      { name: '1 ¢', value: 1 },
      { name: '5 ¢', value: 5 },
      { name: '25 ¢', value: 25 },
      { name: '$1', value: 100 },
   ];

   return (
      <div>
         <div className='text-lg mb-9'>Create one-tap sharable ecash</div>
         <div className='flex justify-around mb-4'>
            {tapAmounts.map((tap, idx) => (
               <button key={idx} onClick={() => handleSetTapAmount(tap.value)}>
                  <Badge color={`${defaultTapAmount === tap.value ? 'success' : 'dark'}`}>
                     {tap.name}
                  </Badge>
               </button>
            ))}
         </div>
      </div>
   );
};

export default EcashTapsSettings;
