/**
 * Converts a time string into milliseconds.
 *
 * @param value - The time string to convert. It should be a string containing a number followed by a single character representing the time unit.
 *                Valid time units are:
 *                - 's' for seconds
 *                - 'm' for minutes
 *                - 'h' for hours
 *                - 'd' for days
 *                - 'w' for weeks
 *
 * @returns The equivalent time in milliseconds.
 *
 * @throws Will throw an error if the input string is not in a valid format.
 *
 * @example
 * ```typescript
 * ms("5s"); // returns 5000
 * ms("2m"); // returns 120000
 * ms("1h"); // returns 3600000
 * ms("1d"); // returns 86400000
 * ms("1w"); // returns 604800000
 * ```
 */
export function ms(value: string): number {
  const TIME_UNITS = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  const type = value.slice(-1);
  const numericValue = parseInt(value.slice(0, -1), 10);

  if (isNaN(numericValue) || !(type in TIME_UNITS)) {
    throw new Error("Invalid time format");
  }

  // @ts-expect-error - TIME_UNITS[type] is not defined in the type
  return numericValue * TIME_UNITS[type];
}
