import React, { useState } from 'react';

interface TabsProps {
   titles: string[];
   onActiveTabChange?: (index: number) => void;
   className?: string;
   borderColor?: '#0f3470' | 'white';
}

export const Tabs: React.FC<TabsProps> = ({
   titles,
   onActiveTabChange,
   className = '',
   borderColor = '#0f3470',
}) => {
   const [activeTab, setActiveTab] = useState(0);

   const handleTabClick = (index: number) => {
      if (index === activeTab) return;
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
                  <ActiveTab key={index} borderColor={borderColor}>
                     {title}
                  </ActiveTab>
               ) : (
                  <InactiveTab
                     key={index}
                     onClick={() => handleTabClick(index)}
                     borderColor={borderColor}
                  >
                     {title}
                  </InactiveTab>
               ),
            )}
         </div>
      </div>
   );
};

const ActiveTab = ({
   children,
   borderColor,
}: {
   children: React.ReactNode;
   borderColor: string;
}) => {
   return (
      <div
         className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 border-${borderColor} text-white hover:cursor-pointer`}
      >
         {children}
      </div>
   );
};

export const InactiveTab = ({
   children,
   onClick,
   borderColor,
}: {
   children: React.ReactNode;
   onClick: () => void;
   borderColor: string;
}) => {
   return (
      <div
         className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-white hover:border-${borderColor} hover:cursor-pointer`}
         onClick={onClick}
      >
         {children}
      </div>
   );
};
