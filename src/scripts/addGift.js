const { PrismaClient } = require('@prisma/client');
const prompts = require('prompts');

const prisma = new PrismaClient();

async function addGift() {
   const questions = [
      {
         type: 'text',
         name: 'name',
         message: 'Enter gift name:',
      },
      {
         type: 'number',
         name: 'amount',
         message: 'Enter gift amount:',
      },
      {
         type: 'text',
         name: 'imageUrlSelected',
         message: 'Enter image URL for selected:',
      },
      {
         type: 'text',
         name: 'imageUrlUnselected',
         message: 'Enter image URL for unselected:',
      },
      {
         type: 'text',
         name: 'creatorUsername',
         message: 'Enter creators username (optional):',
      },
   ];

   const response = await prompts(questions);

   console.log('response', response);

   let creatorPubkey = null;
   if (response.creatorUsername) {
      const creator = await prisma.user.findUnique({
         where: {
            username: response.creatorUsername,
         },
      });

      if (!creator) {
         console.error('No creator found with username:', response.creatorUsername);
         return;
      }

      creatorPubkey = creator.pubkey;
   }

   try {
      const newGift = await prisma.gift.create({
         data: {
            name: response.name,
            amount: response.amount,
            imageUrlSelected: response.imageUrlSelected,
            imageUrlUnselected: response.imageUrlUnselected,
            unit: 'usd',
            description: null,
            creatorPubkey: creatorPubkey || null,
         },
      });

      console.log('New gift added:', newGift);
   } catch (error) {
      console.error('Error adding gift:', error);
   } finally {
      await prisma.$disconnect();
   }
}

addGift();
