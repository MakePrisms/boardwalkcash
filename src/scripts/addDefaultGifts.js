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

const halloweenGifts = [
   {
      name: 'Bat',
      amount: 500,
      description: 'A spooky bat',
      imageUrlSelected: '/eGifts/selected/bat_5.png',
      imageUrlUnselected: '/eGifts/unselected/bat_5.png',
   },
   {
      name: 'Cat',
      amount: 200,
      description: 'A mysterious black cat',
      imageUrlSelected: '/eGifts/selected/cat_2.png',
      imageUrlUnselected: '/eGifts/unselected/cat_2.png',
   },
   {
      name: 'Ghost',
      amount: 10,
      description: 'A haunting ghost',
      imageUrlSelected: '/eGifts/selected/ghost_10.png',
      imageUrlUnselected: '/eGifts/unselected/ghost_10.png',
   },
   {
      name: 'Pumpkin',
      amount: 25,
      description: 'A jack-o-lantern',
      imageUrlSelected: '/eGifts/selected/pumpkin_25.png',
      imageUrlUnselected: '/eGifts/unselected/pumpkin_25.png',
   },
   {
      name: 'Skull',
      amount: 100,
      description: 'A creepy skull',
      imageUrlSelected: '/eGifts/selected/skull_1.png',
      imageUrlUnselected: '/eGifts/unselected/skull_1.png',
   },
   {
      name: 'Wizard',
      amount: 1000,
      description: 'A magical wizard',
      imageUrlSelected: '/eGifts/selected/wizard_10.png',
      imageUrlUnselected: '/eGifts/unselected/wizard_10.png',
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
      imageUrlUnselected: '/eGifts/unselected/mermaid2_1000.png',
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

const satGiftsRound1 = [
   {
      name: 'Orange Heart',
      amount: 100,
      unit: 'sat',
      description: 'An orange heart',
      imageUrlSelected: '/eGifts/selected/orangeheart_100.png',
      imageUrlUnselected: '/eGifts/unselected/orangeheart_100.png',
   },
   {
      name: 'Salute',
      amount: 1000,
      unit: 'sat',
      description: 'A salute gesture',
      imageUrlSelected: '/eGifts/selected/salute_1,000.png',
      imageUrlUnselected: '/eGifts/unselected/salute_1,000.png',
   },
   {
      name: 'Thumbs Up',
      amount: 500,
      unit: 'sat',
      description: 'A thumbs up gesture',
      imageUrlSelected: '/eGifts/selected/thumbsup_500.png',
      imageUrlUnselected: '/eGifts/unselected/thumbsup_500.png',
   },
];

const satGiftsRound2 = [
   {
      name: '100 Percent',
      amount: 100,
      unit: 'sat',
      description: '100% symbol',
      imageUrlSelected: '/eGifts/selected/100percent_100.png',
      imageUrlUnselected: '/eGifts/unselected/100percent_100.png',
   },
   {
      name: 'Burger',
      amount: 5000,
      unit: 'sat',
      description: 'A delicious burger',
      imageUrlSelected: '/eGifts/selected/burger_5000.png',
      imageUrlUnselected: '/eGifts/unselected/burger_5000.png',
   },
   {
      name: 'Candy',
      amount: 100,
      unit: 'sat',
      description: 'A sweet candy',
      imageUrlSelected: '/eGifts/selected/candy_100.png',
      imageUrlUnselected: '/eGifts/unselected/candy_100.png',
   },
   {
      name: 'Champagne',
      amount: 10000,
      unit: 'sat',
      description: 'A bottle of champagne',
      imageUrlSelected: '/eGifts/selected/champagne_10000.png',
      imageUrlUnselected: '/eGifts/unselected/champagne_10000.png',
   },
   {
      name: 'Cheese',
      amount: 500,
      unit: 'sat',
      description: 'A piece of cheese',
      imageUrlSelected: '/eGifts/selected/cheese_500.png',
      imageUrlUnselected: '/eGifts/unselected/cheese_500.png',
   },
   {
      name: 'Chocolate',
      amount: 100,
      unit: 'sat',
      description: 'A chocolate bar',
      imageUrlSelected: '/eGifts/selected/chocolate_100.png',
      imageUrlUnselected: '/eGifts/unselected/chocolate_100.png',
   },
   {
      name: 'Dolphin',
      amount: 5000,
      unit: 'sat',
      description: 'A playful dolphin',
      imageUrlSelected: '/eGifts/selected/dolphin_5000.png',
      imageUrlUnselected: '/eGifts/unselected/dolphin_5000.png',
   },
   {
      name: 'Ferris Wheel',
      amount: 10000,
      unit: 'sat',
      description: 'A colorful ferris wheel',
      imageUrlSelected: '/eGifts/selected/ferriswheel_10000.png',
      imageUrlUnselected: '/eGifts/unselected/ferriswheel_10000.png',
   },
   {
      name: 'Full Moon',
      amount: 500,
      unit: 'sat',
      description: 'A bright full moon',
      imageUrlSelected: '/eGifts/selected/fullmoon_500.png',
      imageUrlUnselected: '/eGifts/unselected/fullmoon_500.png',
   },
   {
      name: 'Headless Bitcoin',
      amount: 21000,
      unit: 'sat',
      description: 'A headless Bitcoin symbol',
      imageUrlSelected: '/eGifts/selected/headlessbitcoin_21000.png',
      imageUrlUnselected: '/eGifts/unselected/headlessbitcoin_21000.png',
   },
   {
      name: 'Kitty',
      amount: 5000,
      unit: 'sat',
      description: 'A cute kitty',
      imageUrlSelected: '/eGifts/selected/kitty_5000.png',
      imageUrlUnselected: '/eGifts/unselected/kitty_5000.png',
   },
   {
      name: 'Monopoly Bitcoin',
      amount: 21000,
      unit: 'sat',
      description: 'A Bitcoin-themed Monopoly symbol',
      imageUrlSelected: '/eGifts/selected/monopolybitcoin_21000.png',
      imageUrlUnselected: '/eGifts/unselected/monopolybitcoin_21000.png',
   },
   {
      name: 'Party Popper',
      amount: 1000,
      unit: 'sat',
      description: 'A festive party popper',
      imageUrlSelected: '/eGifts/selected/partypopper_1000.png',
      imageUrlUnselected: '/eGifts/unselected/partypopper2_1000.png',
   },
   {
      name: 'Pill',
      amount: 1000,
      unit: 'sat',
      description: 'A medicinal pill',
      imageUrlSelected: '/eGifts/selected/pill_1000.png',
      imageUrlUnselected: '/eGifts/unselected/pill_1000.png',
   },
   {
      name: 'Rocket Ship',
      amount: 10000,
      unit: 'sat',
      description: 'A soaring rocket ship',
      imageUrlSelected: '/eGifts/selected/rocketship_10000.png',
      imageUrlUnselected: '/eGifts/unselected/rocketship_10000.png',
   },
   {
      name: 'Satoshi Bitcoin',
      amount: 21000,
      unit: 'sat',
      description: 'A Satoshi-themed Bitcoin symbol',
      imageUrlSelected: '/eGifts/selected/satoshibitcoin_21000.png',
      imageUrlUnselected: '/eGifts/unselected/satoshibitcoin_21000.png',
   },
   {
      name: 'Sun',
      amount: 500,
      unit: 'sat',
      description: 'A bright shining sun',
      imageUrlSelected: '/eGifts/selected/sun_500.png',
      imageUrlUnselected: '/eGifts/unselected/sun_500.png',
   },
   {
      name: 'Tombstone',
      amount: 1000,
      unit: 'sat',
      description: 'A spooky tombstone',
      imageUrlSelected: '/eGifts/selected/tombstone_1000.png',
      imageUrlUnselected: '/eGifts/unselected/tombstone_1000.png',
   },
   {
      name: 'Unicorn Bitcoin',
      amount: 21000,
      unit: 'sat',
      description: 'A magical unicorn-themed Bitcoin',
      imageUrlSelected: '/eGifts/selected/unicornbitcoin_21000.png',
      imageUrlUnselected: '/eGifts/unselected/unicornbitcoin_21000.png',
   },
   {
      name: 'Vampire',
      amount: 5000,
      unit: 'sat',
      description: 'A spooky vampire',
      imageUrlSelected: '/eGifts/selected/vampire_5000.png',
      imageUrlUnselected: '/eGifts/unselected/vampire_5000.png',
   },
   {
      name: 'Witch',
      amount: 10000,
      unit: 'sat',
      description: 'A magical witch',
      imageUrlSelected: '/eGifts/selected/witch_10000.png',
      imageUrlUnselected: '/eGifts/unselected/witch_10000.png',
   },
];

const freeStar = [
   {
      name: 'Star',
      amount: 100,
      description: null,
      imageUrlSelected: '/eGifts/selected/star_100.png',
      imageUrlUnselected: '/eGifts/unselected/star_100.png',
   },
];

async function addGifts(gifts) {
   try {
      for (const gift of gifts) {
         await prisma.gift.create({
            data: {
               name: gift.name,
               amount: gift.amount,
               description: gift.description,
               imageUrlSelected: gift.imageUrlSelected,
               imageUrlUnselected: gift.imageUrlUnselected,
               unit: gift.unit || 'usd', // Using the default values
               fee: gift.fee,
            },
         });
         console.log(`Added gift: ${gift.name}`);
      }
   } catch (error) {
      console.error('Error adding default gifts:', error);
   } finally {
      await prisma.$disconnect();
   }
}

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

async function addHalloweenGifts() {
   try {
      for (const gift of halloweenGifts) {
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

addGifts(satGiftsRound2);
