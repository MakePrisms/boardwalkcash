import { FlowbiteDrawerTheme } from 'flowbite-react';

type DeepPartial<T> = T extends object
   ? {
        [P in keyof T]?: DeepPartial<T[P]>;
     }
   : T;

export const customDrawerTheme: DeepPartial<FlowbiteDrawerTheme> = {
   root: {
      base: 'fixed z-40 overflow-y-auto p-4 transition-transform dark:bg-gray-800 md:min-w-fit min-w-full bg-[#0f1f41ff] text-white flex flex-col',
   },
   header: {
      inner: {
         titleText:
            'mb-4 text-xl inline-flex items-center  font-semibold text-gray-200 dark:text-gray-400 mt-11',
         closeButton:
            'absolute end-6 top-8 flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white',
         closeIcon: 'h-4 w-4',
      },
   },
};
