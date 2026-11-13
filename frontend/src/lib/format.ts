/** Indian digit grouping — 7,00,000 rather than 700,000. */
export const formatINR = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);

/** Same, prefixed with the rupee sign. Used everywhere a price is displayed. */
export const rupees = (amount: number): string => `₹${formatINR(amount)}`;
