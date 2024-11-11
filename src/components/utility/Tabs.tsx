interface TabsProps {
   titles: string[];
   value: number;
   onChange: (index: number) => void;
   className?: string;
   borderColor?: '#0f3470' | 'white';
   titleColor?: string;
}

export const Tabs = ({
   titles,
   value,
   onChange,
   className = '',
   borderColor = '#0f3470',
   titleColor = 'white',
}: TabsProps) => {
   const handleTabClick = (index: number) => {
      if (index !== value) {
         onChange(index);
      }
   };

   return (
      <div className={`flex flex-col ${className}`}>
         <div className='flex w-full text-center'>
            {titles.map((title, index) =>
               index === value ? (
                  <ActiveTab key={index} borderColor={borderColor} titleColor={titleColor}>
                     {title}
                  </ActiveTab>
               ) : (
                  <InactiveTab
                     key={index}
                     onClick={() => handleTabClick(index)}
                     borderColor={borderColor}
                     titleColor={titleColor}
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
   titleColor,
}: {
   children: React.ReactNode;
   borderColor: string;
   titleColor: string;
}) => {
   return (
      <div
         className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 border-${borderColor} hover:cursor-pointer ${titleColor}`}
      >
         {children}
      </div>
   );
};

export const InactiveTab = ({
   children,
   onClick,
   borderColor,
   titleColor,
}: {
   children: React.ReactNode;
   onClick: () => void;
   borderColor: string;
   titleColor: string;
}) => {
   return (
      <div
         className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-${borderColor} hover:cursor-pointer ${titleColor}`}
         onClick={onClick}
      >
         {children}
      </div>
   );
};
