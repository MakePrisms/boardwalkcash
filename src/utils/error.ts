export const getMsgFromUnknownError = (
   error: unknown,
   fallbackMessage = 'An unknown error occurred.',
) => {
   let errMsg = '';
   if (error instanceof Error) {
      errMsg = error.message;
   }
   if (errMsg === '') {
      errMsg = fallbackMessage;
   }
};
