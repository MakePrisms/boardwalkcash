import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import MintSidebarItem from './MintSidebarItem';
import AddMintButton from './AddMintButton';
import { useMemo, useState } from 'react';
import GoMintless from './GoMintless';
import { Tabs } from '@/components/utility/Tabs';
import { Button } from 'flowbite-react';
import NWCSidebarItem from './NWCSidebarItem';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { Currency } from '@/types';

const tabs = [
   { title: 'Bitcoin', value: Currency.SAT, index: 0 },
   { title: 'USD', value: Currency.USD, index: 1 },
]

const getTabByCurrency = (currency: Currency) => {
   return tabs.find(x => x.value === currency) ?? tabs[0]
}

const MintSettings = () => {
   const keysets = useSelector((state: RootState) => state.wallet.keysets);
   const user = useSelector((state: RootState) => state.user);
   const [activeView, setActiveView] = useState<'addMint' | 'goMintless' | null>(null);
   const { activeUnit } = useCashuContext()
   const [activeTab, setActiveTab] = useState(() => getTabByCurrency(activeUnit));

   const toggleView = (view: 'addMint' | 'goMintless') => {
      setActiveView(currentView => (currentView === view ? null : view));
   };

   const bitcoinKeysets = Object.keys(keysets).filter(id => keysets[id].keys.unit === 'sat');
   const usdKeysets = Object.keys(keysets).filter(id => keysets[id].keys.unit === 'usd');

   const walletConnected = useMemo(() => !!user.nwcUri, [user.nwcUri]);

   return (
      <>
         <Tabs
            titles={tabs.map(x => x.title)}
            value={activeTab.index}
            onChange={index => setActiveTab(tabs[index])}
            className='mb-4'
            borderColor='white'
         />
         {activeTab.value === Currency.SAT && (
            <>
               {bitcoinKeysets.map((id, idx) => (
                  <MintSidebarItem keyset={keysets[id]} key={idx} />
               ))}
               {walletConnected && <NWCSidebarItem />}
            </>
         )}
         {activeTab.value === Currency.USD &&
            usdKeysets.map((id, idx) => <MintSidebarItem keyset={keysets[id]} key={idx} />)}
         <div className='mt-12 space-y-4 border-t pt-6 mb-6 first:mt-0 first:border-t-0 first:pt-0 border-gray-300'>
            <div className='flex justify-between mb-6 '>
               <Button
                  className={`btn-primary w-[120px] ${activeView === 'addMint' ? 'underline' : activeView !== null ? 'opacity-50' : ''}`}
                  onClick={() => toggleView('addMint')}
               >
                  Add Mint
               </Button>
               {activeTab.value === Currency.SAT && !walletConnected && (
                  <Button
                     className={`btn-primary w-[120px] ${activeView === 'goMintless' ? 'underline' : activeView !== null ? 'opacity-50' : ''}`}
                     onClick={() => toggleView('goMintless')}
                  >
                     Add Wallet
                  </Button>
               )}
            </div>
            {activeView === 'addMint' && <AddMintButton keysets={keysets} currency={activeTab.value} />}
            {activeView === 'goMintless' && <GoMintless onSuccess={() => setActiveView(null)} />}
         </div>
      </>
   );
};

export default MintSettings;
