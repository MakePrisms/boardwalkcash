import { useState, FC, ReactNode } from 'react';
import { HiChevronDown } from 'react-icons/hi';

interface SimpleDrawerCollapseProps {
   label: string;
   children: ReactNode;
}

const DrawerCollapse: FC<SimpleDrawerCollapseProps> = ({ label, children }) => {
   const [isOpen, setIsOpen] = useState(false);

   return (
      <div>
         <button
            type='button'
            onClick={() => setIsOpen(!isOpen)}
            className='flex items-center rounded-lg justify-between w-full p-2 text-left text-white  hover:bg-[#0f3470] mb-6'
         >
            <span className='text-xl'>{label}</span>
            <HiChevronDown
               className={`transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
            />
         </button>
         {isOpen && <div className='m-2'>{children}</div>}
      </div>
   );
};

export default DrawerCollapse;
