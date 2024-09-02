import { FlowbiteTabsTheme } from 'flowbite-react';

type DeepPartial<T> = T extends object
   ? {
        [P in keyof T]?: DeepPartial<T[P]>;
     }
   : T;
export const leaderboardTabTheme: DeepPartial<FlowbiteTabsTheme> = {
   base: 'flex flex-col',
   tablist: {
      base: 'flex text-center',
      tabitem: {
         base: 'flex-1 items-center justify-center p-4 text-sm font-medium first:ml-0 focus:outline-none focus:ring-4 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:text-gray-400 disabled:dark:text-gray-500',

         icon: 'mr-2 h-5 w-5',
      },
   },
   tabitemcontainer: {
      base: '',
   },
   tabpanel: '',
};
