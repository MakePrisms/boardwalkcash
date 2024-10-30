import React, { useState } from 'react';

interface TooltipProps {
   children: React.ReactNode;
   content: string | React.ReactNode;
   className?: string;
   position?: 'top' | 'bottom' | 'left' | 'right';
   trigger?: 'hover' | 'click';
   onClick?: () => void;
}

const Tooltip = ({
   children,
   content,
   className = '',
   position = 'bottom',
   trigger = 'hover',
   onClick,
}: TooltipProps) => {
   const [isVisible, setIsVisible] = useState(false);

   const handleToggle = () => setIsVisible(!isVisible);

   const getPositionStyles = () => {
      switch (position) {
         case 'top':
            return { bottom: 'calc(100% + 5px)', left: '50%', transform: 'translateX(-50%)' };
         case 'bottom':
            return { top: 'calc(100% + 5px)', left: '50%', transform: 'translateX(-50%)' };
         case 'left':
            return { top: '50%', right: 'calc(100% + 5px)', transform: 'translateY(-50%)' };
         case 'right':
            return { top: '50%', left: 'calc(100% + 5px)', transform: 'translateY(-50%)' };
      }
   };

   const getArrowStyles = () => {
      switch (position) {
         case 'top':
            return { bottom: '-8px', left: '50%', transform: 'translateX(-50%) rotate(180deg)' };
         case 'bottom':
            return { top: '-8px', left: '50%', transform: 'translateX(-50%)' };
         case 'left':
            return { top: '50%', right: '-8px', transform: 'translateY(-50%) rotate(90deg)' };
         case 'right':
            return { top: '50%', left: '-8px', transform: 'translateY(-50%) rotate(-90deg)' };
      }
   };

   return (
      <div className='relative' onClick={onClick}>
         <div
            className={`inline-block w-full`}
            onMouseEnter={trigger === 'hover' ? () => setIsVisible(true) : undefined}
            onMouseLeave={trigger === 'hover' ? () => setIsVisible(false) : undefined}
            onClick={trigger === 'click' ? handleToggle : undefined}
         >
            {children}
         </div>
         {isVisible && (
            <div
               className={`absolute z-10 px-3 py-2 text-xs text-center text-white rounded shadow-lg transition-opacity duration-300 bg-boardwalk-blue w-28
  ${className}`}
               style={getPositionStyles()}
            >
               {content}
               <div
                  className='absolute w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-boardwalk-blue'
                  style={getArrowStyles()}
               />
            </div>
         )}
      </div>
   );
};

export default Tooltip;
