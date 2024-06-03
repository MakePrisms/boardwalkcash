import { useState, FC, ReactNode } from 'react';
import { HiChevronDown } from 'react-icons/hi';

interface SimpleDrawerCollapseProps {
   label: string | ReactNode;
   icon?: JSX.Element;
   children: ReactNode;
}

const DrawerCollapse: FC<SimpleDrawerCollapseProps> = ({ label, icon, children }) => {
   const [isOpen, setIsOpen] = useState(false);

   const handleToggle = (e: any) => {
      e.target.blur();
      setIsOpen(!isOpen);
   };

   return (
      <div>
         <button
            type='button'
            onClick={e => handleToggle(e)}
            className='flex items-center justify-between w-full p-2 text-left text-white mb-6'
         >
            <div className='flex justify-start items-baseline space-x-3'>
               {icon}
               <span className='text-xl'>{label}</span>
            </div>
            <HiChevronDown
               className={`transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
            />
         </button>
         {isOpen && <div className='m-2'>{children}</div>}
      </div>
   );
};

export default DrawerCollapse;
