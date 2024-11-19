import React from 'react';

interface ScanIconProps {
   className?: string;
}

const ScanIcon: React.FC<ScanIconProps> = ({ className }) => {
   return (
      <svg
         xmlns='http://www.w3.org/2000/svg'
         viewBox='0 0 24 24'
         fill='none'
         stroke='currentColor'
         strokeWidth='2'
         strokeLinecap='round'
         strokeLinejoin='round'
         className={className}
      >
         <path d='M3 7V5a2 2 0 0 1 2-2h2' />
         <path d='M17 3h2a2 2 0 0 1 2 2v2' />
         <path d='M21 17v2a2 2 0 0 1-2 2h-2' />
         <path d='M7 21H5a2 2 0 0 1-2-2v-2' />
      </svg>
   );
};

export default ScanIcon;
