import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createUser(pubkey: string) {
    const user = await prisma.user.create({
        data: {
            pubkey,
        },
    });
    return user;
}

async function findUserById(id: number) {
    const user = await prisma.user.findUnique({
        where: {
            id,
        },
    });
    return user;
}

async function findUserByPubkey(pubkey: string) {
    const user = await prisma.user.findUnique({
        where: {
            pubkey,
        },
    });
    return user;
}

async function updateUser(id: number, pubkey: string, username?: string) {
    const user = await prisma.user.update({
        where: {
            id,
        },
        data: {
            pubkey,
            username,
        },
    });
    return user;
}

async function deleteUser(id: number) {
    const user = await prisma.user.delete({
        where: {
            id,
        },
    });
    return user;
}

export { createUser, findUserById, findUserByPubkey, updateUser, deleteUser };
