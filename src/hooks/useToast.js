import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from 'flowbite-react';
import { HiCheckCircle, HiExclamationCircle, HiXCircle, HiInformationCircle } from 'react-icons/hi';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
   const [toastList, setToastList] = useState([]);

   const addToast = useCallback((message, type = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToastList(prev => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 8000); // Auto-dismiss after 8 seconds
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
         <div className='fixed bottom-5 right-5 space-y-4 z-10'>
            {toastList.map(toast => {
               const { icon, bgColor, textColor } = getToastStyle(toast.type);
               return (
                  <Toast key={toast.id}>
                     <div
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bgColor} text-cyan-500 dark:${bgColor} dark:${textColor}`}
                     >
                        {icon}
                     </div>
                     <div className={`ml-3 text-sm font-normal ${textColor}`}>{toast.message}</div>
                  </Toast>
               );
            })}
         </div>
      </ToastContext.Provider>
   );
};

export const useToast = () => useContext(ToastContext);
