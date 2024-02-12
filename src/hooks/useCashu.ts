import { useEffect } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setBalance } from '@/redux/reducers/CashuReducer';

export const useCashu = () => {
    const dispatch = useDispatch();

    const getProofs = () => JSON.parse(window.localStorage.getItem('proofs') || '[]');

    // Function to delete a proof by ID
    const deleteProofById = async (proofId: any) => {
        try {
            await axios.delete(`/api/proofs/${proofId}`)
            .then((response) => {
                if (response.status === 204) {
                    console.log(`Proof with ID ${proofId} deleted successfully.`);
                }
            })
            .catch((error) => {
                console.log(error);
            });
        } catch (error) {
            console.error(`Failed to delete proof with ID ${proofId}:`, error);
        }
    };

    const updateProofsAndBalance = async () => {
        const pubkey = window.localStorage.getItem('pubkey');
        if (!pubkey) return;

        try {
            const proofsResponse = await axios.get(`/api/proofs/${pubkey}`);
            const proofsFromDb = proofsResponse.data;
            const formattedProofs = proofsFromDb.map((proof: any) => ({
                C: proof.C,
                amount: proof.amount,
                id: proof.proofId,
                secret: proof.secret,
            }));

            const localProofs = getProofs();
            const newProofs = formattedProofs.filter((proof: any) => !localProofs.some((localProof: any) => localProof.secret === proof.secret));

            let updatedProofs;
            if (newProofs.length > 0) {
                updatedProofs = [...localProofs, ...newProofs];
                window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));

                // Delete new proofs from the database
                // get the index as well
                for (const proof of newProofs) {
                    const proofId = proofsFromDb.find((p: any) => p.secret === proof.secret).id;
                    console.log('Deleting proof with ID:', proofId);
                    await deleteProofById(proofId);
                }
            } else {
                updatedProofs = localProofs;
            }

            const newBalance = updatedProofs?.map((proof: any) => proof.amount).reduce((a: number, b: number) => a + b, 0) || 0;
            dispatch(setBalance(newBalance));
        } catch (error) {
            console.error('Failed to update proofs and balance:', error);
        }
    };

    useEffect(() => {
        updateProofsAndBalance();

        const intervalId = setInterval(() => {
            updateProofsAndBalance();
        }, 3000); // Poll every 3 seconds

        const handleStorageChange = (event: any) => {
            if (event.key === 'proofs') {
                updateProofsAndBalance();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [dispatch]);

    return null;
};