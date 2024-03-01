import { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setBalance } from '@/redux/reducers/CashuReducer';
import { setError, setSending, setSuccess, setReceiving, resetStatus } from "@/redux/reducers/ActivityReducer";
import { useToast } from './useToast';
import { getAmountFromInvoice } from "@/utils/bolt11";
import { CashuWallet, CashuMint, SendResponse } from '@cashu/cashu-ts';
import { createClient } from '@vercel/kv';

export const useCashu = () => {
    const [receivingStatus, setReceivingStatus] = useState<string | null>(null);
    
    const dispatch = useDispatch();
    const { addToast } = useToast();

    const mint = new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!);
    const wallet = new CashuWallet(mint);

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

    const requestMintInvoice = async (amount: string) => {
        const { pr, hash } = await wallet.requestMint(parseInt(amount));

        if (!pr || !hash) {
            addToast("An error occurred while trying to receive.", "error");
            return;
        }

        return { pr, hash };
    }

    const handlePayInvoice = async (invoice: string, estimatedFee: number) => {
        dispatch(setSending('Sending...'))
        if (!invoice || isNaN(estimatedFee)) {
            addToast("Please enter an invoice and estimate the fee before submitting.", "warning");
            dispatch(resetStatus())
            return;
        }

        const invoiceAmount = getAmountFromInvoice(invoice);
        const proofs = JSON.parse(window.localStorage.getItem('proofs') || '[]');
        let amountToPay = invoiceAmount + estimatedFee;

        const balance = proofs.reduce((acc: number, proof: any) => acc + proof.amount, 0);
        if (balance < amountToPay) {
            dispatch(setError("Insufficient balance to pay " + amountToPay + " sats"))
            return;
        }

        try {
            let sendResponse: SendResponse;
            try {
                sendResponse = await wallet.send(amountToPay, proofs);
            } catch (e) {
                console.error("error swapping proofs", e);
                dispatch(setError("Payment failed"));
                return
            }
            if (sendResponse && sendResponse.send) {
                const invoiceResponse = await wallet.payLnInvoice(invoice, sendResponse.send);
                if (!invoiceResponse || !invoiceResponse.isPaid) {
                    dispatch(setError("Payment failed"));
                } else {
                    const updatedProofs = sendResponse.returnChange || [];

                    if (invoiceResponse.change) {
                        invoiceResponse.change.forEach((change: any) => updatedProofs.push(change));
                    }

                    window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));

                    const newBalance = updatedProofs.map((proof: any) => proof.amount).reduce((a: number, b: number) => a + b, 0);
                    const feePaid = balance - newBalance - invoiceAmount;
                    const feeMessage = feePaid > 0 ? ` + ${feePaid} sats fee` : '';

                    dispatch(setSuccess(`Sent ${invoiceAmount} sat${invoiceAmount === 1 ? "" : "s"}${feeMessage}`));
                }
            }
        } catch (error) {
            console.error(error);
            addToast("An error occurred while trying to send.", "error");
        }
    }

    const checkIsReceiving = async (pubkey: string) => {
        const response = await axios.get(`/api/kv/${pubkey}`);

        if (response && response.data && response.data.value) { 
            const status = response.data.value;
            receivingStatus !== status && setReceivingStatus(status);           
            switch (status) {
                case 'receiving':
                    dispatch(setReceiving("Receiving..."));
                    break;
                case 'success':
                    await axios.post(`/api/kv/${pubkey}`, { value: 'none' });
                    break;
                case 'failed':
                    await axios.post(`/api/kv/${pubkey}`, { value: 'none' });
                    break;
                case 'none':
                    if (receivingStatus === 'receiving') {
                        dispatch(resetStatus());
                    }
                    break;
                default:
                    break;
            }
        }
    }

    const updateProofsAndBalance = async () => {
        const pubkey = window.localStorage.getItem('pubkey');
        if (!pubkey) {
            return;
        }

        // first check if we are already receiving
        await checkIsReceiving(pubkey);

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

                const totalReceived = newProofs.map((proof: any) => proof.amount).reduce((a: number, b: number) => a + b, 0);

                dispatch(setSuccess(`Received ${totalReceived} sat${totalReceived === 1 ? "" : "s"}!`))

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

    return { handlePayInvoice, requestMintInvoice }
};