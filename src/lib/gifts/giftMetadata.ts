import { excludedNames } from '@/env';
import { GiftAsset, Currency, GiftFee } from '@/types';

const AwayukiPubkey = '51a877ffd706e7a52a16000f7c579a1486a521e1ec09b0ecb817b7ce19d4394b';

const AwayykiSplit: GiftFee = {
   recipient: AwayukiPubkey,
   weight: 1,
};

const usdGifts: GiftAsset[] = [
   {
      id: 1,
      name: '100 Percent',
      amount: 10,
      unit: Currency.USD,
      description: '100% symbol',
      selectedSrc: '/eGifts/usd/selected/100percent_d_10.png',
      unselectedSrc: '/eGifts/usd/unselected/100percent_d_10.png',
      creatorPubkey: null,
   },
   {
      id: 2,
      name: 'Balloon',
      amount: 25,
      unit: Currency.USD,
      description: 'Festive balloon',
      selectedSrc: '/eGifts/usd/selected/balloon_d_25.png',
      unselectedSrc: '/eGifts/usd/unselected/balloon_d_25.png',
      creatorPubkey: null,
   },
   {
      id: 3,
      name: 'Beer',
      amount: 200,
      unit: Currency.USD,
      description: 'Beer mug',
      selectedSrc: '/eGifts/usd/selected/beer_d_200.png',
      unselectedSrc: '/eGifts/usd/unselected/beer_d_200.png',
      creatorPubkey: null,
   },
   {
      id: 4,
      name: 'Bolt',
      amount: 10,
      unit: Currency.USD,
      description: 'Lightning bolt',
      selectedSrc: '/eGifts/usd/selected/bolt_d_10.png',
      unselectedSrc: '/eGifts/usd/unselected/bolt_d_10.png',
      creatorPubkey: null,
   },
   {
      id: 5,
      name: 'Bullseye',
      amount: 500,
      unit: Currency.USD,
      description: 'Target bullseye',
      selectedSrc: '/eGifts/usd/selected/bullseye_d_500.png',
      unselectedSrc: '/eGifts/usd/unselected/bullseye_d_500.png',
      creatorPubkey: null,
   },
   {
      id: 6,
      name: 'Burger',
      amount: 200,
      unit: Currency.USD,
      description: 'Hamburger',
      selectedSrc: '/eGifts/usd/selected/burger_d_200.png',
      unselectedSrc: '/eGifts/usd/unselected/burger_d_200.png',
      creatorPubkey: null,
   },
   {
      id: 7,
      name: 'Carousel',
      amount: 1000,
      unit: Currency.USD,
      description: 'Carousel ride',
      selectedSrc: '/eGifts/usd/selected/carousel_d_1000.png',
      unselectedSrc: '/eGifts/usd/unselected/carousel_d_1000.png',
      creatorPubkey: null,
   },
   {
      id: 8,
      name: 'Champagne',
      amount: 500,
      unit: Currency.USD,
      description: 'Champagne bottle',
      selectedSrc: '/eGifts/usd/selected/champagne_d_500.png',
      unselectedSrc: '/eGifts/usd/unselected/champagne_d_500.png',
      creatorPubkey: null,
   },
   {
      id: 9,
      name: 'Cheese',
      amount: 100,
      unit: Currency.USD,
      description: 'Cheese wedge',
      selectedSrc: '/eGifts/usd/selected/cheese_d_100.png',
      unselectedSrc: '/eGifts/usd/unselected/cheese_d_100.png',
      creatorPubkey: null,
   },
   {
      id: 10,
      name: 'Chocolate',
      amount: 10,
      unit: Currency.USD,
      description: 'Chocolate bar',
      selectedSrc: '/eGifts/usd/selected/chocolate_d_10.png',
      unselectedSrc: '/eGifts/usd/unselected/chocolate_d_10.png',
      creatorPubkey: null,
   },
   {
      id: 11,
      name: 'Cocktail',
      amount: 500,
      unit: Currency.USD,
      description: 'Cocktail glass',
      selectedSrc: '/eGifts/usd/selected/cocktail_d_500.png',
      unselectedSrc: '/eGifts/usd/unselected/cocktail_d_500.png',
      creatorPubkey: null,
   },
   {
      id: 12,
      name: 'Coffee',
      amount: 200,
      unit: Currency.USD,
      description: 'Coffee cup',
      selectedSrc: '/eGifts/usd/selected/coffee_d_200.png',
      unselectedSrc: '/eGifts/usd/unselected/coffee_d_200.png',
      creatorPubkey: null,
   },
   {
      id: 13,
      name: 'Cookie Crab',
      amount: 23,
      unit: Currency.USD,
      description: 'Crab with cookie',
      selectedSrc: '/eGifts/usd/selected/cookiecrab_d_25.png',
      unselectedSrc: '/eGifts/usd/unselected/cookiecrab_d_25.png',
      creatorPubkey: null,
      fee: 2,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 14,
      name: 'Cookie',
      amount: 10,
      unit: Currency.USD,
      description: 'Cookie',
      selectedSrc: '/eGifts/usd/selected/cookie_d_10.png',
      unselectedSrc: '/eGifts/usd/unselected/cookie_d_10.png',
      creatorPubkey: null,
   },
   {
      id: 15,
      name: 'Dolphin',
      amount: 200,
      unit: Currency.USD,
      description: 'Playful dolphin',
      selectedSrc: '/eGifts/usd/selected/dolphin_d_200.png',
      unselectedSrc: '/eGifts/usd/unselected/dolphin_d_200.png',
      creatorPubkey: null,
   },
   {
      id: 16,
      name: 'Ferris Wheel',
      amount: 500,
      unit: Currency.USD,
      description: 'Ferris wheel ride',
      selectedSrc: '/eGifts/usd/selected/ferriswheel_d_500.png',
      unselectedSrc: '/eGifts/usd/unselected/ferriswheel_d_500.png',
      creatorPubkey: null,
   },
   {
      id: 17,
      name: 'Fisher Crab',
      amount: 180,
      unit: Currency.USD,
      description: 'Fishing crab',
      selectedSrc: '/eGifts/usd/selected/fishercrab_d_200.png',
      unselectedSrc: '/eGifts/usd/unselected/fishercrab_d_200.png',
      creatorPubkey: null,
      fee: 20,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 18,
      name: 'Gift',
      amount: 100,
      unit: Currency.USD,
      description: 'Gift box',
      selectedSrc: '/eGifts/usd/selected/gift_d_100.png',
      unselectedSrc: '/eGifts/usd/unselected/gift_d_100.png',
      creatorPubkey: null,
   },
   {
      id: 19,
      name: 'Heart',
      amount: 10,
      unit: Currency.USD,
      description: 'Love heart',
      selectedSrc: '/eGifts/usd/selected/heart_d_10.png',
      unselectedSrc: '/eGifts/usd/unselected/heart_d_10.png',
      creatorPubkey: null,
   },
   {
      id: 20,
      name: 'Hot Dog',
      amount: 100,
      unit: Currency.USD,
      description: 'Hot dog',
      selectedSrc: '/eGifts/usd/selected/hotdog_d_100.png',
      unselectedSrc: '/eGifts/usd/unselected/hotdog_d_100.png',
      creatorPubkey: null,
   },
   {
      id: 21,
      name: 'Ice Cream',
      amount: 25,
      unit: Currency.USD,
      description: 'Ice cream cone',
      selectedSrc: '/eGifts/usd/selected/icecream_d_25.png',
      unselectedSrc: '/eGifts/usd/unselected/icecream_d_25.png',
      creatorPubkey: null,
   },
   {
      id: 22,
      name: 'Kitty',
      amount: 200,
      unit: Currency.USD,
      description: 'Cute kitty',
      selectedSrc: '/eGifts/usd/selected/kitty_d_200.png',
      unselectedSrc: '/eGifts/usd/unselected/kitty_d_200.png',
      creatorPubkey: null,
   },
   {
      id: 23,
      name: 'Lifeguard Crab',
      amount: 450,
      unit: Currency.USD,
      description: 'Lifeguard crab',
      selectedSrc: '/eGifts/usd/selected/lifeguardcrab_d_500.png',
      unselectedSrc: '/eGifts/usd/unselected/lifeguardcrab_d_500.png',
      creatorPubkey: null,
      fee: 50,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 24,
      name: 'Lollipop',
      amount: 200,
      unit: Currency.USD,
      description: 'Sweet lollipop',
      selectedSrc: '/eGifts/usd/selected/lollipop_d_200.png',
      unselectedSrc: '/eGifts/usd/unselected/lollipop_d_200.png',
      creatorPubkey: null,
   },
   {
      id: 25,
      name: 'Mermaid',
      amount: 1000,
      unit: Currency.USD,
      description: 'Magical mermaid',
      selectedSrc: '/eGifts/usd/selected/mermaid_d_1000.png',
      unselectedSrc: '/eGifts/usd/unselected/mermaid_d_1000.png',
      creatorPubkey: null,
   },
   {
      id: 26,
      name: 'Party Popper',
      amount: 100,
      unit: Currency.USD,
      description: 'Celebration popper',
      selectedSrc: '/eGifts/usd/selected/partypopper_d_100.png',
      unselectedSrc: '/eGifts/usd/unselected/partypopper_d_100.png',
      creatorPubkey: null,
   },
   {
      id: 27,
      name: 'Pill',
      amount: 100,
      unit: Currency.USD,
      description: 'Medicine pill',
      selectedSrc: '/eGifts/usd/selected/pill_d_100.png',
      unselectedSrc: '/eGifts/usd/unselected/pill_d_100.png',
      creatorPubkey: null,
   },
   {
      id: 28,
      name: 'Pizza',
      amount: 25,
      unit: Currency.USD,
      description: 'Pizza slice',
      selectedSrc: '/eGifts/usd/selected/pizza_d_25.png',
      unselectedSrc: '/eGifts/usd/unselected/pizza_d_25.png',
      creatorPubkey: null,
   },
   {
      id: 29,
      name: 'Popcorn',
      amount: 100,
      unit: Currency.USD,
      description: 'Movie popcorn',
      selectedSrc: '/eGifts/usd/selected/popcorn_d_100.png',
      unselectedSrc: '/eGifts/usd/unselected/popcorn_d_100.png',
      creatorPubkey: null,
   },
   {
      id: 30,
      name: 'Reindeer',
      amount: 500,
      unit: Currency.USD,
      description: 'Holiday reindeer',
      selectedSrc: '/eGifts/usd/selected/reindeer_d_500.png',
      unselectedSrc: '/eGifts/usd/unselected/reindeer_d_500.png',
      creatorPubkey: null,
   },
   {
      id: 31,
      name: 'Rocket Ship',
      amount: 500,
      unit: Currency.USD,
      description: 'Space rocket',
      selectedSrc: '/eGifts/usd/selected/rocketship_d_500.png',
      unselectedSrc: '/eGifts/usd/unselected/rocketship_d_500.png',
      creatorPubkey: null,
   },
   {
      id: 32,
      name: 'Rose',
      amount: 10,
      unit: Currency.USD,
      description: 'Red rose',
      selectedSrc: '/eGifts/usd/selected/rose_d_10.png',
      unselectedSrc: '/eGifts/usd/unselected/rose_d_10.png',
      creatorPubkey: null,
   },
   {
      id: 33,
      name: 'Salute',
      amount: 100,
      unit: Currency.USD,
      description: 'Salute gesture',
      selectedSrc: '/eGifts/usd/selected/salute_d_100.png',
      unselectedSrc: '/eGifts/usd/unselected/salute_d_100.png',
      creatorPubkey: null,
   },
   {
      id: 34,
      name: 'Sand Crab',
      amount: 90,
      unit: Currency.USD,
      description: 'Beach crab',
      selectedSrc: '/eGifts/usd/selected/sandcrab_d_100.png',
      unselectedSrc: '/eGifts/usd/unselected/sandcrab_d_100.png',
      creatorPubkey: null,
      fee: 10,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 35,
      name: 'Santa Crab',
      amount: 180,
      unit: Currency.USD,
      description: 'Christmas crab',
      selectedSrc: '/eGifts/usd/selected/santacrab_d_200.png',
      unselectedSrc: '/eGifts/usd/unselected/santacrab_d_200.png',
      creatorPubkey: null,
      fee: 20,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 36,
      name: 'Santa',
      amount: 1000,
      unit: Currency.USD,
      description: 'Santa Claus',
      selectedSrc: '/eGifts/usd/selected/santa_d_1000.png',
      unselectedSrc: '/eGifts/usd/unselected/santa_d_1000.png',
      creatorPubkey: null,
   },
   {
      id: 37,
      name: 'Seagull Crab',
      amount: 900,
      unit: Currency.USD,
      description: 'Seagull crab',
      selectedSrc: '/eGifts/usd/selected/seagullcrab_d_1000.png',
      unselectedSrc: '/eGifts/usd/unselected/seagullcrab_d_1000.png',
      creatorPubkey: null,
      fee: 100,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 38,
      name: 'Shaka',
      amount: 25,
      unit: Currency.USD,
      description: 'Shaka hand gesture',
      selectedSrc: '/eGifts/usd/selected/shaka_d_25.png',
      unselectedSrc: '/eGifts/usd/unselected/shaka_d_25.png',
      creatorPubkey: null,
   },
   {
      id: 39,
      name: 'Snowman Crab',
      amount: 90,
      unit: Currency.USD,
      description: 'Winter snowman crab',
      selectedSrc: '/eGifts/usd/selected/snowmancrab_d_100.png',
      unselectedSrc: '/eGifts/usd/unselected/snowmancrab_d_100.png',
      creatorPubkey: null,
      fee: 10,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 40,
      name: 'Snowman',
      amount: 200,
      unit: Currency.USD,
      description: 'Festive snowman',
      selectedSrc: '/eGifts/usd/selected/snowman_d_200.png',
      unselectedSrc: '/eGifts/usd/unselected/snowman_d_200.png',
      creatorPubkey: null,
   },
   {
      id: 41,
      name: 'Sun',
      amount: 25,
      unit: Currency.USD,
      description: 'Bright sun',
      selectedSrc: '/eGifts/usd/selected/sun_d_25.png',
      unselectedSrc: '/eGifts/usd/unselected/sun_d_25.png',
      creatorPubkey: null,
   },
   {
      id: 42,
      name: 'Sundae Crab',
      amount: 9,
      unit: Currency.USD,
      description: 'Ice cream sundae crab',
      selectedSrc: '/eGifts/usd/selected/sundaecrab_d_10.png',
      unselectedSrc: '/eGifts/usd/unselected/sundaecrab_d_10.png',
      creatorPubkey: null,
      fee: 1,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 43,
      name: 'Sunglasses',
      amount: 25,
      unit: Currency.USD,
      description: 'Cool sunglasses',
      selectedSrc: '/eGifts/usd/selected/sunglasses_d_25.png',
      unselectedSrc: '/eGifts/usd/unselected/sunglasses_d_25.png',
      creatorPubkey: null,
   },
   {
      id: 44,
      name: 'Surfer Crab',
      amount: 23,
      unit: Currency.USD,
      description: 'Surfing crab',
      selectedSrc: '/eGifts/usd/selected/surfercrab_d_25.png',
      unselectedSrc: '/eGifts/usd/unselected/surfercrab_d_25.png',
      creatorPubkey: null,
      fee: 2,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 45,
      name: 'Teddy Bear',
      amount: 500,
      unit: Currency.USD,
      description: 'Cuddly teddy bear',
      selectedSrc: '/eGifts/usd/selected/teddybear_d_500.png',
      unselectedSrc: '/eGifts/usd/unselected/teddybear_d_500.png',
      creatorPubkey: null,
   },
   {
      id: 46,
      name: 'Thumbs Up',
      amount: 10,
      unit: Currency.USD,
      description: 'Thumbs up gesture',
      selectedSrc: '/eGifts/usd/selected/thumbsup_d_10.png',
      unselectedSrc: '/eGifts/usd/unselected/thumbsup_d_10.png',
      creatorPubkey: null,
   },
   {
      id: 47,
      name: 'Tree',
      amount: 25,
      unit: Currency.USD,
      description: 'Holiday tree',
      selectedSrc: '/eGifts/usd/selected/tree_d_25.png',
      unselectedSrc: '/eGifts/usd/unselected/tree_d_25.png',
      creatorPubkey: null,
   },
   {
      id: 48,
      name: 'Whale',
      amount: 1000,
      unit: Currency.USD,
      description: 'Majestic whale',
      selectedSrc: '/eGifts/usd/selected/whale_d_1000.png',
      unselectedSrc: '/eGifts/usd/unselected/whale_d_1000.png',
      creatorPubkey: null,
   },
   {
      id: 49,
      name: 'Winter Crab',
      amount: 9,
      unit: Currency.USD,
      description: 'Winter themed crab',
      selectedSrc: '/eGifts/usd/selected/wintercrab_d_10.png',
      unselectedSrc: '/eGifts/usd/unselected/wintercrab_d_10.png',
      creatorPubkey: null,
      fee: 1,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
];

const satGifts: GiftAsset[] = [
   {
      id: 50,
      name: 'Thumbs Up',
      amount: 100,
      unit: Currency.SAT,
      description: 'Thumbs up gift',
      selectedSrc: '/eGifts/btc/selected/thumbsup_b_100.png',
      unselectedSrc: '/eGifts/btc/unselected/thumbsup_b_100.png',
      creatorPubkey: null,
   },
   {
      id: 51,
      name: 'Sun',
      amount: 500,
      unit: Currency.SAT,
      description: 'Sun gift',
      selectedSrc: '/eGifts/btc/selected/sun_b_500.png',
      unselectedSrc: '/eGifts/btc/unselected/sun_b_500.png',
      creatorPubkey: null,
   },
   {
      id: 52,
      name: 'Pill',
      amount: 1000,
      unit: Currency.SAT,
      description: 'Pill gift',
      selectedSrc: '/eGifts/btc/selected/pill_b_1000.png',
      unselectedSrc: '/eGifts/btc/unselected/pill_b_1000.png',
      creatorPubkey: null,
   },
   {
      id: 53,
      name: 'Salute',
      amount: 1000,
      unit: Currency.SAT,
      description: 'Salute gift',
      selectedSrc: '/eGifts/btc/selected/salute_b_1000.png',
      unselectedSrc: '/eGifts/btc/unselected/salute_b_1000.png',
      creatorPubkey: null,
   },
   {
      id: 54,
      name: 'Party Popper',
      amount: 1000,
      unit: Currency.SAT,
      description: 'Party popper gift',
      selectedSrc: '/eGifts/btc/selected/partypopper_b_1000.png',
      unselectedSrc: '/eGifts/btc/unselected/partypopper_b_1000.png',
      creatorPubkey: null,
   },
   {
      id: 55,
      name: 'Chocolate',
      amount: 100,
      unit: Currency.SAT,
      description: 'Chocolate gift',
      selectedSrc: '/eGifts/btc/selected/chocolate_b_100.png',
      unselectedSrc: '/eGifts/btc/unselected/chocolate_b_100.png',
      creatorPubkey: null,
   },
   {
      id: 56,
      name: '100 Percent',
      amount: 100,
      unit: Currency.SAT,
      description: '100 percent gift',
      selectedSrc: '/eGifts/btc/selected/100percent_b_100.png',
      unselectedSrc: '/eGifts/btc/unselected/100percent_b_100.png',
      creatorPubkey: null,
   },
   {
      id: 57,
      name: 'Kitty',
      amount: 2000,
      unit: Currency.SAT,
      description: 'Kitty gift',
      selectedSrc: '/eGifts/btc/selected/kitty_b_2000.png',
      unselectedSrc: '/eGifts/btc/unselected/kitty_b_2000.png',
      creatorPubkey: null,
   },
   {
      id: 58,
      name: 'Dolphin',
      amount: 2000,
      unit: Currency.SAT,
      description: 'Dolphin gift',
      selectedSrc: '/eGifts/btc/selected/dolphin_b_2000.png',
      unselectedSrc: '/eGifts/btc/unselected/dolphin_b_2000.png',
      creatorPubkey: null,
   },
   {
      id: 59,
      name: 'Burger',
      amount: 2000,
      unit: Currency.SAT,
      description: 'Burger gift',
      selectedSrc: '/eGifts/btc/selected/burger_b_2000.png',
      unselectedSrc: '/eGifts/btc/unselected/burger_b_2000.png',
      creatorPubkey: null,
   },
   {
      id: 60,
      name: 'Champagne',
      amount: 5000,
      unit: Currency.SAT,
      description: 'Champagne gift',
      selectedSrc: '/eGifts/btc/selected/champagne_b_5000.png',
      unselectedSrc: '/eGifts/btc/unselected/champagne_b_5000.png',
      creatorPubkey: null,
   },
   {
      id: 61,
      name: 'Rocket Ship',
      amount: 5000,
      unit: Currency.SAT,
      description: 'Rocket ship gift',
      selectedSrc: '/eGifts/btc/selected/rocketship_b_5000.png',
      unselectedSrc: '/eGifts/btc/unselected/rocketship_b_5000.png',
      creatorPubkey: null,
   },
   {
      id: 62,
      name: 'Ferris Wheel',
      amount: 5000,
      unit: Currency.SAT,
      description: 'Ferris wheel gift',
      selectedSrc: '/eGifts/btc/selected/ferriswheel_b_5000.png',
      unselectedSrc: '/eGifts/btc/unselected/ferriswheel_b_5000.png',
      creatorPubkey: null,
   },
   {
      id: 63,
      name: 'Unicorn Bitcoin',
      amount: 21000,
      unit: Currency.SAT,
      description: 'Unicorn bitcoin gift',
      selectedSrc: '/eGifts/btc/selected/unicornbitcoin_b_21000.png',
      unselectedSrc: '/eGifts/btc/unselected/unicornbitcoin_b_21000.png',
      creatorPubkey: null,
   },
   {
      id: 64,
      name: 'Satoshi Bitcoin',
      amount: 21000,
      unit: Currency.SAT,
      description: 'Satoshi bitcoin gift',
      selectedSrc: '/eGifts/btc/selected/satoshibitcoin_b_21000.png',
      unselectedSrc: '/eGifts/btc/unselected/satoshibitcoin_b_21000.png',
      creatorPubkey: null,
   },
   {
      id: 65,
      name: 'Monopoly Bitcoin',
      amount: 21000,
      unit: Currency.SAT,
      description: 'Monopoly bitcoin gift',
      selectedSrc: '/eGifts/btc/selected/monopolybitcoin_b_21000.png',
      unselectedSrc: '/eGifts/btc/unselected/monopolybitcoin_b_21000.png',
      creatorPubkey: null,
   },
   {
      id: 66,
      name: 'Gift',
      amount: 1000,
      unit: Currency.SAT,
      description: 'Gift gift',
      selectedSrc: '/eGifts/btc/selected/gift_b_1000.png',
      unselectedSrc: '/eGifts/btc/unselected/gift_b_1000.png',
      creatorPubkey: null,
   },
   {
      id: 67,
      name: 'Rose',
      amount: 100,
      unit: Currency.SAT,
      description: 'Rose gift',
      selectedSrc: '/eGifts/btc/selected/rose_b_100.png',
      unselectedSrc: '/eGifts/btc/unselected/rose_b_100.png',
      creatorPubkey: null,
   },
   {
      id: 68,
      name: 'Bolt',
      amount: 100,
      unit: Currency.SAT,
      description: 'Bolt gift',
      selectedSrc: '/eGifts/btc/selected/bolt_b_100.png',
      unselectedSrc: '/eGifts/btc/unselected/bolt_b_100.png',
      creatorPubkey: null,
   },
   {
      id: 69,
      name: 'Sunglasses',
      amount: 500,
      unit: Currency.SAT,
      description: 'Sunglasses gift',
      selectedSrc: '/eGifts/btc/selected/sunglasses_b_500.png',
      unselectedSrc: '/eGifts/btc/unselected/sunglasses_b_500.png',
      creatorPubkey: null,
   },
   {
      id: 70,
      name: 'Heart',
      amount: 100,
      unit: Currency.SAT,
      description: 'Heart gift',
      selectedSrc: '/eGifts/btc/selected/heart_b_100.png',
      unselectedSrc: '/eGifts/btc/unselected/heart_b_100.png',
      creatorPubkey: null,
   },
   {
      id: 71,
      name: 'Shaka',
      amount: 500,
      unit: Currency.SAT,
      description: 'Shaka gift',
      selectedSrc: '/eGifts/btc/selected/shaka_b_500.png',
      unselectedSrc: '/eGifts/btc/unselected/shaka_b_500.png',
      creatorPubkey: null,
   },
   {
      id: 72,
      name: 'Balloon',
      amount: 500,
      unit: Currency.SAT,
      description: 'Balloon gift',
      selectedSrc: '/eGifts/btc/selected/balloon_b_500.png',
      unselectedSrc: '/eGifts/btc/unselected/balloon_b_500.png',
      creatorPubkey: null,
   },
   {
      id: 73,
      name: 'Ice Cream',
      amount: 500,
      unit: Currency.SAT,
      description: 'Ice cream gift',
      selectedSrc: '/eGifts/btc/selected/icecream_b_500.png',
      unselectedSrc: '/eGifts/btc/unselected/icecream_b_500.png',
      creatorPubkey: null,
   },
   {
      id: 74,
      name: 'Popcorn',
      amount: 1000,
      unit: Currency.SAT,
      description: 'Popcorn gift',
      selectedSrc: '/eGifts/btc/selected/popcorn_b_1000.png',
      unselectedSrc: '/eGifts/btc/unselected/popcorn_b_1000.png',
      creatorPubkey: null,
   },
   {
      id: 75,
      name: 'Hot Dog',
      amount: 1000,
      unit: Currency.SAT,
      description: 'Hot dog gift',
      selectedSrc: '/eGifts/btc/selected/hotdog_b_1000.png',
      unselectedSrc: '/eGifts/btc/unselected/hotdog_b_1000.png',
      creatorPubkey: null,
   },
   {
      id: 76,
      name: 'Pizza',
      amount: 500,
      unit: Currency.SAT,
      description: 'Pizza gift',
      selectedSrc: '/eGifts/btc/selected/pizza_b_500.png',
      unselectedSrc: '/eGifts/btc/unselected/pizza_b_500.png',
      creatorPubkey: null,
   },
   {
      id: 77,
      name: 'Coffee',
      amount: 2000,
      unit: Currency.SAT,
      description: 'Coffee gift',
      selectedSrc: '/eGifts/btc/selected/coffee_b_2000.png',
      unselectedSrc: '/eGifts/btc/unselected/coffee_b_2000.png',
      creatorPubkey: null,
   },
   {
      id: 78,
      name: 'Lollipop',
      amount: 2000,
      unit: Currency.SAT,
      description: 'Lollipop gift',
      selectedSrc: '/eGifts/btc/selected/lollipop_b_2000.png',
      unselectedSrc: '/eGifts/btc/unselected/lollipop_b_2000.png',
      creatorPubkey: null,
   },
   {
      id: 79,
      name: 'Beer',
      amount: 2000,
      unit: Currency.SAT,
      description: 'Beer gift',
      selectedSrc: '/eGifts/btc/selected/beer_b_2000.png',
      unselectedSrc: '/eGifts/btc/unselected/beer_b_2000.png',
      creatorPubkey: null,
   },
   {
      id: 80,
      name: 'Teddy Bear',
      amount: 5000,
      unit: Currency.SAT,
      description: 'Teddy bear gift',
      selectedSrc: '/eGifts/btc/selected/teddybear_b_5000.png',
      unselectedSrc: '/eGifts/btc/unselected/teddybear_b_5000.png',
      creatorPubkey: null,
   },
   {
      id: 81,
      name: 'Bullseye',
      amount: 5000,
      unit: Currency.SAT,
      description: 'Bullseye gift',
      selectedSrc: '/eGifts/btc/selected/bullseye_b_5000.png',
      unselectedSrc: '/eGifts/btc/unselected/bullseye_b_5000.png',
      creatorPubkey: null,
   },
   {
      id: 82,
      name: 'Cocktail',
      amount: 5000,
      unit: Currency.SAT,
      description: 'Cocktail gift',
      selectedSrc: '/eGifts/btc/selected/cocktail_b_5000.png',
      unselectedSrc: '/eGifts/btc/unselected/cocktail_b_5000.png',
      creatorPubkey: null,
   },
   {
      id: 83,
      name: 'Whale',
      amount: 10000,
      unit: Currency.SAT,
      description: 'Whale gift',
      selectedSrc: '/eGifts/btc/selected/whale_b_10000.png',
      unselectedSrc: '/eGifts/btc/unselected/whale_b_10000.png',
      creatorPubkey: null,
   },
   {
      id: 84,
      name: 'Mermaid',
      amount: 10000,
      unit: Currency.SAT,
      description: 'Mermaid gift',
      selectedSrc: '/eGifts/btc/selected/mermaid_b_10000.png',
      unselectedSrc: '/eGifts/btc/unselected/mermaid_b_10000.png',
      creatorPubkey: null,
   },
   {
      id: 85,
      name: 'Carousel',
      amount: 10000,
      unit: Currency.SAT,
      description: 'Carousel gift',
      selectedSrc: '/eGifts/btc/selected/carousel_b_10000.png',
      unselectedSrc: '/eGifts/btc/unselected/carousel_b_10000.png',
      creatorPubkey: null,
   },
   {
      id: 86,
      name: 'Cheese',
      amount: 1000,
      unit: Currency.SAT,
      description: 'Cheese gift',
      selectedSrc: '/eGifts/btc/selected/cheese_b_1000.png',
      unselectedSrc: '/eGifts/btc/unselected/cheese_b_1000.png',
      creatorPubkey: null,
   },
   {
      id: 87,
      name: 'Tree',
      amount: 500,
      unit: Currency.SAT,
      description: 'Tree gift',
      selectedSrc: '/eGifts/btc/selected/tree_b_500.png',
      unselectedSrc: '/eGifts/btc/unselected/tree_b_500.png',
      creatorPubkey: null,
   },
   {
      id: 88,
      name: 'Cookie',
      amount: 100,
      unit: Currency.SAT,
      description: 'Cookie gift',
      selectedSrc: '/eGifts/btc/selected/cookie_b_100.png',
      unselectedSrc: '/eGifts/btc/unselected/cookie_b_100.png',
      creatorPubkey: null,
   },
   {
      id: 89,
      name: 'Snowman',
      amount: 2000,
      unit: Currency.SAT,
      description: 'Snowman gift',
      selectedSrc: '/eGifts/btc/selected/snowman_b_2000.png',
      unselectedSrc: '/eGifts/btc/unselected/snowman_b_2000.png',
      creatorPubkey: null,
   },
   {
      id: 90,
      name: 'Santa',
      amount: 10000,
      unit: Currency.SAT,
      description: 'Santa gift',
      selectedSrc: '/eGifts/btc/selected/santa_b_10000.png',
      unselectedSrc: '/eGifts/btc/unselected/santa_b_10000.png',
      creatorPubkey: null,
   },
   {
      id: 91,
      name: 'Reindeer',
      amount: 5000,
      unit: Currency.SAT,
      description: 'Reindeer gift',
      selectedSrc: '/eGifts/btc/selected/reindeer_b_5000.png',
      unselectedSrc: '/eGifts/btc/unselected/reindeer_b_5000.png',
      creatorPubkey: null,
   },
   {
      id: 92,
      name: 'Surfer Crab',
      amount: 450,
      unit: Currency.SAT,
      description: 'Surfer crab gift',
      selectedSrc: '/eGifts/btc/selected/surfercrab_b_500.png',
      unselectedSrc: '/eGifts/btc/unselected/surfercrab_b_500.png',
      creatorPubkey: null,
      fee: 50,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 93,
      name: 'Winter Crab',
      amount: 90,
      unit: Currency.SAT,
      description: 'Winter crab gift',
      selectedSrc: '/eGifts/btc/selected/wintercrab_b_100.png',
      unselectedSrc: '/eGifts/btc/unselected/wintercrab_b_100.png',
      creatorPubkey: null,
      fee: 10,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 94,
      name: 'Sundae Crab',
      amount: 90,
      unit: Currency.SAT,
      description: 'Sundae crab gift',
      selectedSrc: '/eGifts/btc/selected/sundaecrab_b_100.png',
      unselectedSrc: '/eGifts/btc/unselected/sundaecrab_b_100.png',
      creatorPubkey: null,
      fee: 10,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 95,
      name: 'Snowman Crab',
      amount: 900,
      unit: Currency.SAT,
      description: 'Snowman crab gift',
      selectedSrc: '/eGifts/btc/selected/snowmancrab_b_1000.png',
      unselectedSrc: '/eGifts/btc/unselected/snowmancrab_b_1000.png',
      creatorPubkey: null,
      fee: 100,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 96,
      name: 'Sand Crab',
      amount: 900,
      unit: Currency.SAT,
      description: 'Sand crab gift',
      selectedSrc: '/eGifts/btc/selected/sandcrab_b_1000.png',
      unselectedSrc: '/eGifts/btc/unselected/sandcrab_b_1000.png',
      creatorPubkey: null,
      fee: 100,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 97,
      name: 'Seagull Crab',
      amount: 9000,
      unit: Currency.SAT,
      description: 'Seagull crab gift',
      selectedSrc: '/eGifts/btc/selected/seagullcrab_b_10000.png',
      unselectedSrc: '/eGifts/btc/unselected/seagullcrab_b_10000.png',
      creatorPubkey: null,
      fee: 1000,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 98,
      name: 'Cookie Crab',
      amount: 450,
      unit: Currency.SAT,
      description: 'Cookie crab gift',
      selectedSrc: '/eGifts/btc/selected/cookiecrab_b_500.png',
      unselectedSrc: '/eGifts/btc/unselected/cookiecrab_b_500.png',
      creatorPubkey: null,
      fee: 50,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 99,
      name: 'Fisher Crab',
      amount: 1800,
      unit: Currency.SAT,
      description: 'Fisher crab gift',
      selectedSrc: '/eGifts/btc/selected/fishercrab_b_2000.png',
      unselectedSrc: '/eGifts/btc/unselected/fishercrab_b_2000.png',
      creatorPubkey: null,
      fee: 200,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 100,
      name: 'Santa Crab',
      amount: 1800,
      unit: Currency.SAT,
      description: 'Santa crab gift',
      selectedSrc: '/eGifts/btc/selected/santacrab_b_2000.png',
      unselectedSrc: '/eGifts/btc/unselected/santacrab_b_2000.png',
      creatorPubkey: null,
      fee: 200,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
   {
      id: 101,
      name: 'Lifeguard Crab',
      amount: 4500,
      unit: Currency.SAT,
      description: 'Lifeguard crab gift',
      selectedSrc: '/eGifts/btc/selected/lifeguardcrab_b_5000.png',
      unselectedSrc: '/eGifts/btc/unselected/lifeguardcrab_b_5000.png',
      creatorPubkey: null,
      fee: 500,
      splits: [{ recipient: AwayukiPubkey, weight: 1 }],
   },
];

export const giftMetadata: GiftAsset[] = [...usdGifts, ...satGifts].filter(
   g => excludedNames.indexOf(g.name) === -1,
);
