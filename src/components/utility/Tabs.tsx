import React, { useState } from 'react';

interface TabsProps {
   titles: string[];
   onActiveTabChange?: (index: number) => void;
   className?: string;
   borderColor?: '#0f3470' | 'white';
   titleColor?: string;
}

export const Tabs: React.FC<TabsProps> = ({
   titles,
   onActiveTabChange,
   className = '',
   borderColor = '#0f3470',
   titleColor = 'white',
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
                  <ActiveTab key={index} borderColor={borderColor} className={titleColor}>
                     {title}
                  </ActiveTab>
               ) : (
                  <InactiveTab
                     key={index}
                     onClick={() => handleTabClick(index)}
                     borderColor={borderColor}
                     className={titleColor}
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
   className,
}: {
   children: React.ReactNode;
   borderColor: string;
   className: string;
}) => {
   return (
      <div
         className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 border-${borderColor} hover:cursor-pointer ${className}`}
      >
         {children}
      </div>
   );
};

export const InactiveTab = ({
   children,
   onClick,
   borderColor,
   className,
}: {
   children: React.ReactNode;
   onClick: () => void;
   borderColor: string;
   className: string;
}) => {
   return (
      <div
         className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-${borderColor} hover:cursor-pointer ${className}`}
         onClick={onClick}
      >
         {children}
      </div>
   );
};
