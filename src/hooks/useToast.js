// toastContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from 'flowbite-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toastList, setToastList] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToastList((prev) => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000); // Auto-dismiss after 3 seconds
    }, []);

    const removeToast = useCallback((id) => {
        setToastList((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const contextValue = { addToast };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <div className="fixed bottom-5 right-5 space-y-2">
                {toastList.map((toast) => (
                    <Toast key={toast.id} color={toast.type === 'error' ? 'failure' : toast.type}>
                        <div className="text-sm">{toast.message}</div>
                    </Toast>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
