if (!process.env.NEXT_PUBLIC_GIFT_NAMES_TO_EXCLUDE) {
   throw new Error('NEXT_PUBLIC_GIFT_NAMES_TO_EXCLUDE env var not set');
}

export const excludedNames = JSON.parse(process.env.NEXT_PUBLIC_GIFT_NAMES_TO_EXCLUDE) as string[];
