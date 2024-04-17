import { Wallet } from '@/types';
import { Sidebar } from 'flowbite-react';

interface MintSidebarItemProps {
   keyset: Wallet;
}

export const MintSidebarItem = ({ keyset }: MintSidebarItemProps) => {
   return (
      <Sidebar.Item>
         {`${keyset.url.slice(0, 10)}...${keyset.url.slice(-10)}`}
         &nbsp;
         {keyset.keys.unit}
      </Sidebar.Item>
   );
};

export default MintSidebarItem;
