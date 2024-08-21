const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const gifts = [
   {
      name: 'Heart',
      amount: 10,
      description: 'A lovely heart',
      imageUrlSelected: '/eGifts/selected/heart_10.png',
      imageUrlUnselected: '/eGifts/unselected/heart_10.png',
   },
   {
      name: 'Ice Cream',
      amount: 25,
      description: 'A cool ice cream',
      imageUrlSelected: '/eGifts/selected/icecream_25.png',
      imageUrlUnselected: '/eGifts/unselected/icecream_25.png',
   },
   {
      name: 'Hot Dog',
      amount: 100,
      description: 'A tasty hot dog',
      imageUrlSelected: '/eGifts/selected/hotdog_100.png',
      imageUrlUnselected: '/eGifts/unselected/hotdog_100.png',
   },
   {
      name: 'Candy',
      amount: 200,
      description: 'Sweet candy',
      imageUrlSelected: '/eGifts/selected/candy_200.png',
      imageUrlUnselected: '/eGifts/unselected/candy_200.png',
   },
   {
      name: 'Bear',
      amount: 500,
      description: 'A cuddly bear',
      imageUrlSelected: '/eGifts/selected/bear_500.png',
      imageUrlUnselected: '/eGifts/unselected/bear_500.png',
   },
   {
      name: 'Whale',
      amount: 1000,
      description: 'A majestic whale',
      imageUrlSelected: '/eGifts/selected/whale_1000.png',
      imageUrlUnselected: '/eGifts/unselected/whale_1000.png',
   },
];

async function addDefaultGifts() {
   try {
      for (const gift of gifts) {
         await prisma.gift.create({
            data: {
               name: gift.name,
               amount: gift.amount,
               description: gift.description,
               imageUrlSelected: gift.imageUrlSelected,
               imageUrlUnselected: gift.imageUrlUnselected,
               unit: 'usd', // Using the default value
            },
         });
         console.log(`Added gift: ${gift.name}`);
      }
      console.log('All default gifts have been added successfully.');
   } catch (error) {
      console.error('Error adding default gifts:', error);
   } finally {
      await prisma.$disconnect();
   }
}

addDefaultGifts();