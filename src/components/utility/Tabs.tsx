import React, { useState } from 'react';

interface TabsProps {
   titles: string[];
   onActiveTabChange?: (index: number) => void;
   className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ titles, onActiveTabChange, className = '' }) => {
   const [activeTab, setActiveTab] = useState(0);

   const handleTabClick = (index: number) => {
      setActiveTab(index);
      if (onActiveTabChange) {
         onActiveTabChange(index);
      }
   };

   return (
      <div className={`flex flex-col ${className}`}>
         <div className='flex w-full text-center'>
            {titles.map((title, index) =>
               index === activeTab ? (
                  <ActiveTab key={index}>{title}</ActiveTab>
               ) : (
                  <InactiveTab key={index} onClick={() => handleTabClick(index)}>
                     {title}
                  </InactiveTab>
               ),
            )}
         </div>
      </div>
   );
};

const ActiveTab = ({ children }: { children: React.ReactNode }) => {
   return (
      <div className='flex-1 px-4 py-2 text-sm font-medium border-b-4 border-[#0f3470] text-white'>
         {children}
      </div>
   );
};

export const InactiveTab = ({
   children,
   onClick,
}: {
   children: React.ReactNode;
   onClick: () => void;
}) => {
   return (
      <div
         className='flex-1 px-4 py-2 text-sm font-medium border-b-4 border-transparent text-white hover:border-[#0f3470]  transition-colors duration-200'
         onClick={onClick}
      >
         {children}
      </div>
   );
};
