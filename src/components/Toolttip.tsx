import React, { useState } from 'react';

interface TooltipProps {
   children: React.ReactNode;
   content: string | React.ReactNode;
   className?: string;
}

const Tooltip = ({ children, content, className = '' }: TooltipProps) => {
   const [isVisible, setIsVisible] = useState(false);

   return (
      <div className='relative inline-block w-full'>
         <div onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
            {children}
         </div>
         {isVisible && (
            <div
               className={`absolute z-10 px-3 py-2 text-sm text-white rounded shadow-lg transition-opacity duration-300 bg-boardwalk-blue ${className}`}
               style={{
                  top: 'calc(100% + 5px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
               }}
            >
               {content}
               <div
                  className='absolute w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-boardwalk-blue'
                  style={{
                     top: '-8px',
                     left: '50%',
                     transform: 'translateX(-50%)',
                  }}
               />
            </div>
         )}
      </div>
   );
};

export default Tooltip;
