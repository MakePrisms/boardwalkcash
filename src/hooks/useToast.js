import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from 'flowbite-react';
import { HiCheckCircle, HiExclamationCircle, HiXCircle, HiInformationCircle } from 'react-icons/hi';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
   const [toastList, setToastList] = useState([]);

   const addToast = useCallback((message, type = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToastList(prev => [{ id, message, type }]);
      setTimeout(() => removeToast(id), 4000); // Auto-dismiss after 8 seconds
   }, []);

   const removeToast = useCallback(id => {
      setToastList(prev => prev.filter(toast => toast.id !== id));
   }, []);

   const contextValue = { addToast };

   const getToastStyle = type => {
      switch (type) {
         case 'success':
            return {
               icon: <HiCheckCircle className='h-5 w-5 text-green-500' />,
               bgColor: 'bg-green-100',
               textColor: 'text-green-800',
            };
         case 'warning':
            return {
               icon: <HiExclamationCircle className='h-5 w-5 text-yellow-500' />,
               bgColor: 'bg-yellow-100',
               textColor: 'text-yellow-800',
            };
         case 'error':
            return {
               icon: <HiXCircle className='h-5 w-5 text-red-500' />,
               bgColor: 'bg-red-100',
               textColor: 'text-red-800',
            };
         case 'info':
            return {
               icon: <HiInformationCircle className='h-5 w-5 text-blue-500' />,
               bgColor: 'bg-blue-100',
               textColor: 'text-blue-800',
            };
         default:
            return {
               icon: null, // no defaut icon for now
               bgColor: 'bg-gray-100',
               textColor: 'text-gray-800',
            };
      }
   };

   return (
      <ToastContext.Provider value={contextValue}>
         {children}
         <div className='toast-container space-y-2'>
            {toastList.map(toast => {
               const { icon, bgColor, textColor } = getToastStyle(toast.type);
               return (
                  <Toast key={toast.id} className='toast-slide-in'>
                     <div
                        className={`inline-flex shrink-0 items-center justify-center rounded-lg ${bgColor} text-cyan-500 dark:${bgColor} dark:${textColor}`}
                     >
                        {icon}
                     </div>
                     <div className={`ml-3 text-sm font-normal ${textColor}`}>{toast.message}</div>
                     <Toast.Toggle onClick={() => removeToast(toast.id)} />
                  </Toast>
               );
            })}
         </div>
      </ToastContext.Provider>
   );
};

export const useToast = () => useContext(ToastContext);
