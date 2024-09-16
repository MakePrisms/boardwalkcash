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
      name: 'Lollipop',
      amount: 200,
      description: 'Sweet candy',
      imageUrlSelected: '/eGifts/selected/candy_200.png',
      imageUrlUnselected: '/eGifts/unselected/candy_200.png',
   },
   {
      name: 'Teddy Bear',
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

const giftsV2 = [
   {
      name: 'Rose',
      amount: 10,
      description: 'A lovely rose',
      imageUrlSelected: '/eGifts/selected/rose_10.png',
      imageUrlUnselected: '/eGifts/unselected/rose_10.png',
   },
   {
      name: 'Balloon',
      amount: 25,
      description: 'A cool balloon',
      imageUrlSelected: '/eGifts/selected/balloon_25.png',
      imageUrlUnselected: '/eGifts/unselected/balloon_25.png',
   },
   {
      name: 'Popcorn',
      amount: 100,
      description: 'A tasty popcorn',
      imageUrlSelected: '/eGifts/selected/popcorn_100.png',
      imageUrlUnselected: '/eGifts/unselected/popcorn_100.png',
   },
   {
      name: 'Cocktail',
      amount: 200,
      description: 'A fancy cocktail',
      imageUrlSelected: '/eGifts/selected/cocktail_200.png',
      imageUrlUnselected: '/eGifts/unselected/cocktail_200.png',
      fee: 100,
   },
   {
      name: 'Carousel',
      amount: 500,
      description: 'A collection of gifts',
      imageUrlSelected: '/eGifts/selected/carousel_500.png',
      imageUrlUnselected: '/eGifts/unselected/carousel_500.png',
      fee: 200,
   },
   {
      name: 'Mermaid',
      amount: 1000,
      description: 'A mermaid',
      imageUrlSelected: '/eGifts/selected/mermaid_1000.png',
      imageUrlUnselected: '/eGifts/unselected/mermaid_1000.png',
      fee: 300,
   },
];

const giftsV3 = [
   {
      name: 'Rose',
      amount: 10,
      description: 'A beautiful rose',
      imageUrlSelected: '/eGifts/selected/rose_10.png',
      imageUrlUnselected: '/eGifts/unselected/rose_10.png',
   },
   {
      name: 'Balloon',
      amount: 25,
      description: 'A colorful balloon',
      imageUrlSelected: '/eGifts/selected/balloon_25.png',
      imageUrlUnselected: '/eGifts/unselected/balloon_25.png',
   },
   {
      name: 'Popcorn',
      amount: 100,
      description: 'Delicious popcorn',
      imageUrlSelected: '/eGifts/selected/popcorn_100.png',
      imageUrlUnselected: '/eGifts/unselected/popcorn_100.png',
   },
   {
      name: 'Mermaid',
      amount: 1000,
      description: 'A magical mermaid',
      imageUrlSelected: '/eGifts/selected/mermaid_1000.png',
      imageUrlUnselected: '/eGifts/unselected/mermaid_1000.png',
   },
   {
      name: 'Beer',
      amount: 200,
      description: 'A refreshing beer',
      imageUrlSelected: '/eGifts/selected/beer_200.png',
      imageUrlUnselected: '/eGifts/unselected/beer_200.png',
   },
   {
      name: 'Bolt',
      amount: 10,
      description: 'A lightning bolt',
      imageUrlSelected: '/eGifts/selected/bolt_10.png',
      imageUrlUnselected: '/eGifts/unselected/bolt_10.png',
   },
   {
      name: 'Bullseye',
      amount: 500,
      description: 'Hit the bullseye',
      imageUrlSelected: '/eGifts/selected/bullseye_500.png',
      imageUrlUnselected: '/eGifts/unselected/bullseye_500.png',
   },
   {
      name: 'Carousel',
      amount: 1000,
      description: 'A magical carousel',
      imageUrlSelected: '/eGifts/selected/carousel_1000.png',
      imageUrlUnselected: '/eGifts/unselected/carousel_1000.png',
   },
   {
      name: 'Cocktail',
      amount: 500,
      description: 'A fancy cocktail',
      imageUrlSelected: '/eGifts/selected/cocktail_500.png',
      imageUrlUnselected: '/eGifts/unselected/cocktail_500.png',
   },
   {
      name: 'Coffee',
      amount: 200,
      description: 'A hot cup of coffee',
      imageUrlSelected: '/eGifts/selected/coffee_200.png',
      imageUrlUnselected: '/eGifts/unselected/coffee_200.png',
   },
   {
      name: 'Pizza',
      amount: 100,
      description: 'A delicious pizza slice',
      imageUrlSelected: '/eGifts/selected/pizza_100.png',
      imageUrlUnselected: '/eGifts/unselected/pizza_100.png',
   },
   {
      name: 'Shaka',
      amount: 25,
      description: 'A friendly shaka sign',
      imageUrlSelected: '/eGifts/selected/shaka_25.png',
      imageUrlUnselected: '/eGifts/unselected/shaka_25.png',
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

async function addV2DefaultGifts() {
   try {
      for (const gift of giftsV2) {
         await prisma.gift.create({
            data: {
               name: gift.name,
               amount: gift.amount,
               description: gift.description,
               imageUrlSelected: gift.imageUrlSelected,
               imageUrlUnselected: gift.imageUrlUnselected,
               unit: 'usd', // Using the default value
               fee: gift.fee,
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

async function addV3DefaultGifts() {
   try {
      for (const gift of giftsV3) {
         await prisma.gift.create({
            data: {
               name: gift.name,
               amount: gift.amount,
               description: gift.description,
               imageUrlSelected: gift.imageUrlSelected,
               imageUrlUnselected: gift.imageUrlUnselected,
               unit: 'usd', // Using the default value
               fee: gift.fee,
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

// addDefaultGifts();
// addV2DefaultGifts();
addV3DefaultGifts();
// addV2DefaultGifts();
