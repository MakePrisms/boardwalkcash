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
   return errMsg;
};

export class TokenAlreadySpentError extends Error {
   constructor(message?: string) {
      super(message);
      this.name = 'TokenAlreadySpentError';
   }
}
