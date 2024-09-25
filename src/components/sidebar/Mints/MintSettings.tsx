import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import MintSidebarItem from './MintSidebarItem';
import AddMintButton from './AddMintButton';
import { useState } from 'react';
import GoMintless from './GoMintless';
import { Tabs } from '@/components/utility/Tabs';

const MintSettings = () => {
   const keysets = useSelector((state: RootState) => state.wallet.keysets);
   const [activeView, setActiveView] = useState<'addMint' | 'goMintless' | null>(null);
   const [activeTab, setActiveTab] = useState(0);

   const toggleView = (view: 'addMint' | 'goMintless') => {
      setActiveView(currentView => (currentView === view ? null : view));
   };

   const bitcoinKeysets = Object.keys(keysets).filter(id => keysets[id].keys.unit === 'sat');
   const usdKeysets = Object.keys(keysets).filter(id => keysets[id].keys.unit === 'usd');

   return (
      <>
         <Tabs titles={['Bitcoin', 'USD']} onActiveTabChange={setActiveTab} className='mb-4' />
         {activeTab === 0 &&
            bitcoinKeysets.map((id, idx) => <MintSidebarItem keyset={keysets[id]} key={idx} />)}
         {activeTab === 1 &&
            usdKeysets.map((id, idx) => <MintSidebarItem keyset={keysets[id]} key={idx} />)}
         <div className='mt-12 space-y-4 border-t pt-6 mb-6 first:mt-0 first:border-t-0 first:pt-0 border-gray-300'>
            <div className='flex justify-between mb-6 '>
               <button
                  className={`btn ${activeView === 'addMint' ? 'underline' : activeView !== null ? 'opacity-50' : ''}`}
                  onClick={() => toggleView('addMint')}
               >
                  Add a Mint
               </button>
               <button
                  className={`btn ${activeView === 'goMintless' ? 'underline' : activeView !== null ? 'opacity-50' : ''}`}
                  onClick={() => toggleView('goMintless')}
               >
                  Go Mintless
               </button>
            </div>
            {activeView === 'addMint' && <AddMintButton keysets={keysets} />}
            {activeView === 'goMintless' && <GoMintless />}
         </div>
      </>
   );
};

export default MintSettings;
