import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { getBalance, getProofs, updateProofs, rewriteProofs } from '@/redux/reducers/CashuReducer';
import { setError, setSending, setSuccess } from "@/redux/reducers/ActivityReducer";
import { useToast } from './useToast';
import { getAmountFromInvoice } from "@/utils/bolt11";
import { CashuWallet, CashuMint } from '@cashu/cashu-ts';

export const useCashu = () => {
    const dispatch = useDispatch();
    const { addToast } = useToast();

    const proofs = useSelector((state: any) => state.cashu.proofs);

    const mint = new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!);
    const wallet = new CashuWallet(mint);

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
            return;
        }

        const invoiceAmount = getAmountFromInvoice(invoice);
        let amountToPay = invoiceAmount + estimatedFee;
        console.log('proofs', proofs)
        const balance = proofs.reduce((acc: number, proof: any) => acc + proof.amount, 0);
        console.log('balance', balance);
        if (balance < amountToPay) {
            addToast("You don't have enough funds to pay this invoice + fees", "error");
            return;
        }

        try {
            const sendResponse = await wallet.send(amountToPay, proofs);
            console.log('sendResponse', sendResponse);
            if (sendResponse && sendResponse.send) {
                const invoiceResponse = await wallet.payLnInvoice(invoice, sendResponse.send);
                console.log('invoiceResponse', invoiceResponse);
                if (!invoiceResponse || !invoiceResponse.isPaid) {
                    dispatch(setError("Payment failed"));
                } else {
                    const updatedProofs = sendResponse.returnChange || [];

                    if (invoiceResponse.change) {
                        invoiceResponse.change.forEach((change: any) => updatedProofs.push(change));
                    }

                    console.log('updatedProofs', updatedProofs);

                    dispatch(rewriteProofs(updatedProofs));
                    dispatch(getBalance());

                    const newBalance = proofs.map((proof: any) => proof.amount).reduce((a: number, b: number) => a + b, 0);
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

    const updateProofsAndBalance = async () => {
        const pubkey = window.localStorage.getItem('pubkey');
        if (!pubkey) {
            return;
        }

        try {
            const proofsResponse = await axios.get(`/api/proofs/${pubkey}`);
            const proofsFromDb = proofsResponse.data;
            const formattedProofs = proofsFromDb.map((proof: any) => ({
                C: proof.C,
                amount: proof.amount,
                id: proof.proofId,
                secret: proof.secret,
            }));

            const newProofs = formattedProofs.filter((proof: any) => !proofs.some((localProof: any) => localProof.secret === proof.secret));

            let updatedProofs;
            if (newProofs.length > 0) {
                updatedProofs = [...proofs, ...newProofs];
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
                updatedProofs = proofs;
            }
            dispatch(getProofs());
            dispatch(getBalance());
        } catch (error) {
            console.error('Failed to update proofs and balance:', error);
        }
    };

    return { handlePayInvoice, requestMintInvoice, updateProofsAndBalance }
};