import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setBalance } from '@/redux/reducers/CashuReducer';
import { RootState } from '@/redux/store'; 

export const useCashu = () => {
    const dispatch = useDispatch();

    const getProofs = () => {
        return JSON.parse(window.localStorage.getItem('proofs') || '[]');
    };

    useEffect(() => {
        const getBalance = () => {
            const proofs = getProofs();
            const newBalance = proofs.map((proof: any) => proof.amount).reduce((a: any, b: any) => a + b, 0);

            dispatch(setBalance(newBalance));
        };

        // Initial load or re-load balance
        getBalance();

        // Define a function to handle storage changes
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'proofs') {
                getBalance();
            }
        };

        // Add event listener for storage changes
        window.addEventListener('storage', handleStorageChange);

        // Cleanup listener on component unmount
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [dispatch]);

};
