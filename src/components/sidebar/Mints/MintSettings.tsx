import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import MintSidebarItem from './MintSidebarItem';
import AddMintButton from './AddMintButton';
import { useState } from 'react';
import GoMintless from './GoMintless';

const MintSettings = () => {
   const keysets = useSelector((state: RootState) => state.wallet.keysets);
   const [activeView, setActiveView] = useState<'addMint' | 'goMintless' | null>(null);

   const toggleView = (view: 'addMint' | 'goMintless') => {
      setActiveView(currentView => (currentView === view ? null : view));
   };

   return (
      <>
         <div className='text-lg mb-2'></div>
         {Object.keys(keysets).map((id, idx) => (
            <MintSidebarItem keyset={keysets[id]} key={idx} />
         ))}
         <div className='mt-4 space-y-4 border-t pt-6 mb-6 first:mt-0 first:border-t-0 first:pt-0 border-gray-300'>
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
