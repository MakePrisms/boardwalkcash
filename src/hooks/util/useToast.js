import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from 'flowbite-react';
import { formatUnit } from '@/utils/formatting';
import { HiCheckCircle, HiExclamationCircle, HiXCircle, HiInformationCircle } from 'react-icons/hi';
import { isCashuApiError } from '@/types';
const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
   const [toastList, setToastList] = useState([]);

   const addToast = useCallback((message, type = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToastList(prev => [{ id, message, type }]);
      setTimeout(() => removeToast(id), 4000); // Auto-dismiss after 8 seconds
   }, []);

   const toastSwapSuccess = (to, activeWallet, amountSwapped) => {
      let successMsg = '';
      if (to.keys.id === activeWallet?.keys.id) {
         successMsg = `Received ${formatUnit(amountSwapped, activeWallet.keys.unit)} to your main ${activeWallet.keys.unit === 'usd' ? 'USD' : 'BTC'} account`;
      } else {
         let formattedUrl = to.mint.mintUrl.replace('https://', '').replace('http://', '');
         formattedUrl = `${formattedUrl.slice(0, 15)}...${formattedUrl.slice(-5)}`;
         successMsg = `Received ${formatUnit(amountSwapped, to.keys.unit)} to ${formattedUrl}`;
      }
      addToast(successMsg, 'success');
   };

   const toastSwapError = error => {
      let errMsg = '';
      if (isCashuApiError(error)) {
         errMsg = error.detail || error.error || '';
      } else if (error instanceof Error) {
         errMsg = error.message;
      }
      if (errMsg === '') {
         errMsg = 'An unknown error occurred while sending from one mint to the other.';
      }
      addToast(errMsg, 'error');
   };

   const toastUnknownError = (error, fallbackMessage = 'An unknown error occurred.') => {
      let errMsg = '';
      if (error instanceof Error) {
         errMsg = error.message;
      }
      if (errMsg === '') {
         errMsg = fallbackMessage;
      }
      addToast(errMsg, 'error');
   };

   const removeToast = useCallback(id => {
      setToastList(prev => prev.filter(toast => toast.id !== id));
   }, []);

   const contextValue = { addToast, toastSwapSuccess, toastSwapError, toastUnknownError };

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
