export const txHistoryTableTheme = {
   root: {
      base: 'md:max-w-fit w-full text-left text-sm text-gray-500 dark:text-gray-400',
      shadow: 'absolute left-0 top-0 -z-10 h-full  rounded-lg bg-white drop-shadow-md',
      wrapper: 'relative flex justify-center',
   },
};

export const leaderboardTableTheme = {
   root: {
      base: 'w-full text-left text-sm text-white bg-[#0f3470] ',
      shadow: 'absolute left-0 top-0 -z-10 h-full bg-white drop-shadow-md',
      wrapper: 'relative flex justify-center',
   },
   head: {
      base: 'group/head text-sm text-white',
      cell: {
         base: 'px-6 py-3 dark:bg-gray-700',
      },
   },
   body: {
      base: 'group/body',
      cell: {
         base: 'px-6 py-4 ',
      },
   },
};

export const contactsTableTheme = {
   root: {
      shadow: 'absolute left-0 top-0 -z-10 h-full w-full rounded-lg bg-white dark:bg-black',
   },
};
