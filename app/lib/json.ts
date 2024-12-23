/**
 * Safely parse a JSON string.
 * @returns The parsed JSON object or null if parsing fails
 */
export const safeJsonParse = (jsonString: string): unknown | null => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
};
