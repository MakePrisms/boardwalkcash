/**
 * Returns the decimal separator for the current locale.
 * @param locale Locale to use to format the number. If not provided the locale of the machine will be used.
 * @returns The decimal separator for the current locale.
 */
export function getLocaleDecimalSeparator(locale?: string) {
  const formattedNumber = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 1,
  }).format(1.1);

  // Remove all digits so that we're left with the decimal separator
  return formattedNumber.replace(/\d/g, '')[0] as '.' | ',';
}
