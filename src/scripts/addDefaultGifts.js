const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const gifts = [
   {
      name: 'Heart',
      amount: 10,
      imageUrlSelected: '/eGifts/selected/heart_10.png',
      imageUrlUnselected: '/eGifts/unselected/heart_10.png',
   },
   {
      name: 'Ice Cream',
      amount: 25,
      imageUrlSelected: '/eGifts/selected/icecream_25.png',
      imageUrlUnselected: '/eGifts/unselected/icecream_25.png',
   },
   {
      name: 'Hot Dog',
      amount: 100,
      imageUrlSelected: '/eGifts/selected/hotdog_100.png',
      imageUrlUnselected: '/eGifts/unselected/hotdog_100.png',
   },
   {
      name: 'Lollipop',
      amount: 200,
      imageUrlSelected: '/eGifts/selected/candy_200.png',
      imageUrlUnselected: '/eGifts/unselected/candy_200.png',
   },
   {
      name: 'Teddy Bear',
      amount: 500,
      imageUrlSelected: '/eGifts/selected/bear_500.png',
      imageUrlUnselected: '/eGifts/unselected/bear_500.png',
   },
   {
      name: 'Whale',
      amount: 1000,
      imageUrlSelected: '/eGifts/selected/whale_1000.png',
      imageUrlUnselected: '/eGifts/unselected/whale_1000.png',
   },
];

const giftsV2 = [
   {
      name: 'Rose',
      amount: 10,
      imageUrlSelected: '/eGifts/selected/rose_10.png',
      imageUrlUnselected: '/eGifts/unselected/rose_10.png',
   },
   {
      name: 'Balloon',
      amount: 25,
      imageUrlSelected: '/eGifts/selected/balloon_25.png',
      imageUrlUnselected: '/eGifts/unselected/balloon_25.png',
   },
   {
      name: 'Popcorn',
      amount: 100,
      imageUrlSelected: '/eGifts/selected/popcorn_100.png',
      imageUrlUnselected: '/eGifts/unselected/popcorn_100.png',
   },
   {
      name: 'Cocktail',
      amount: 200,
      imageUrlSelected: '/eGifts/selected/cocktail_200.png',
      imageUrlUnselected: '/eGifts/unselected/cocktail_200.png',
      feeAmount: 100,
   },
   {
      name: 'Carousel',
      amount: 500,
      imageUrlSelected: '/eGifts/selected/carousel_500.png',
      imageUrlUnselected: '/eGifts/unselected/carousel_500.png',
      feeAmount: 200,
   },
   {
      name: 'Mermaid',
      amount: 1000,
      imageUrlSelected: '/eGifts/selected/mermaid_1000.png',
      imageUrlUnselected: '/eGifts/unselected/mermaid_1000.png',
      feeAmount: 300,
   },
];

async function addDefaultGifts() {
   try {
      for (const gift of gifts) {
         await prisma.gift.create({
            data: {
               name: gift.name,
               amount: gift.amount,
               imageUrlSelected: gift.imageUrlSelected,
               imageUrlUnselected: gift.imageUrlUnselected,
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

async function addV2DefaultGifts() {
   try {
      for (const gift of giftsV2) {
         await prisma.gift.create({
            data: {
               name: gift.name,
               amount: gift.amount,
               imageUrlSelected: gift.imageUrlSelected,
               imageUrlUnselected: gift.imageUrlUnselected,
               feeAmount: gift.feeAmount,
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
addV2DefaultGifts();
