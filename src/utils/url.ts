export const normalizeUrl = (url: string): string => {
   url = url.trim();
   url = url.replace(/\/+$/, '');

   if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.toLocaleLowerCase();
   } else {
      return ('https://' + url).toLocaleLowerCase();
   }
};

export const formatUrl = (url: string, maxLength: number = 20): string => {
   let formatted = url.replace('https://', '').replace('http://', '');
   if (formatted.length <= maxLength) return formatted;
   const last = formatted.slice(-4);
   return formatted.slice(0, maxLength - 4) + '...' + last;
};
