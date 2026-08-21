/** Format a rupee amount with Indian digit grouping, e.g. 4260000 -> "INR 42,60,000". */
export const formatINR = (n: number) => `INR ${n.toLocaleString("en-IN")}`;
