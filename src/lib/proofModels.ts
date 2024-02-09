import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createProof(id: string, amount: number, secret: string, C: string, userId: number) {
    const proof = await prisma.proof.create({
        data: {
            id,
            amount,
            secret,
            C,
            userId,
        },
    });
    return proof;
}

async function findProofById(id: string) {
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

async function updateProof(id: string, amount?: number, secret?: string, C?: string) {
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

async function deleteProof(id: string) {
    const proof = await prisma.proof.delete({
        where: {
            id,
        },
    });
    return proof;
}

export { createProof, findProofById, findProofsByUserId, updateProof, deleteProof };
