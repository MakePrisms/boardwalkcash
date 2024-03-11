import { PrismaClient } from '@prisma/client';
import { ProofData } from '@/types';

const prisma = new PrismaClient();

async function createProof(proofData: ProofData) {
   const proof = await prisma.proof.create({
      data: {
         proofId: proofData.proofId,
         amount: proofData.amount,
         secret: proofData.secret,
         C: proofData.C,
         userId: proofData.userId,
      },
   });
   return proof;
}

async function createManyProofs(proofs: ProofData[]) {
   const result = await prisma.proof.createMany({
      data: proofs,
   });
   return result;
}

async function findProofById(id: number) {
   const proof = await prisma.proof.findUnique({
      where: {
         id,
      },
   });
   return proof;
}

async function findProofsByUserId(userId: number) {
   const proofs = await prisma.proof.findMany({
      where: {
         userId,
      },
   });
   return proofs;
}

async function updateProof(id: number, amount?: number, secret?: string, C?: string) {
   const proof = await prisma.proof.update({
      where: {
         id,
      },
      data: {
         ...(amount !== undefined && { amount }),
         ...(secret !== undefined && { secret }),
         ...(C !== undefined && { C }),
      },
   });
   return proof;
}

async function deleteProof(id: number) {
   const proof = await prisma.proof.delete({
      where: {
         id,
      },
   });
   return proof;
}

export {
   createProof,
   createManyProofs,
   findProofById,
   findProofsByUserId,
   updateProof,
   deleteProof,
};
