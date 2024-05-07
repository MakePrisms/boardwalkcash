export const normalizeUrl = (url: string): string => {
   url = url.trim();
   url = url.replace(/\/+$/, '');

   if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
   } else {
      return 'https://' + url;
   }
};
