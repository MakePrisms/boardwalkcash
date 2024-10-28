import { FlowbiteDrawerTheme } from 'flowbite-react';

type DeepPartial<T> = T extends object
   ? {
        [P in keyof T]?: DeepPartial<T[P]>;
     }
   : T;

export const customDrawerTheme: DeepPartial<FlowbiteDrawerTheme> = {
   root: {
      base: 'fixed z-40 overflow-y-auto p-4 transition-transform dark:bg-gray-800 text-white flex flex-col',
   },
   header: {
      inner: {
         titleText:
            'mb-4 text-xl inline-flex items-center text-base font-semibold text-gray-200 dark:text-gray-400',
         closeButton:
            'absolute  end-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-transparent text-sm text-white',
      },
   },
};
