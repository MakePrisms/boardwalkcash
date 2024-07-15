export const normalizeUrl = (url: string): string => {
   url = url.trim();
   url = url.replace(/\/+$/, '');

   if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
   } else {
      return 'https://' + url;
   }
};

export const formatUrl = (url: string, maxLength: number = 20): string => {
   if (url.length <= maxLength) return url;
   let formatted = url.replace('https://', '').replace('http://', '');
   // slice last 4 characters of url
   const last = formatted.slice(-4);
   return formatted.slice(0, maxLength - 4) + '...' + last;
};
