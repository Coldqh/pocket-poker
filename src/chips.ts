/** Casino-like denominations used to represent the virtual balance. Each value
 * is exact: chips are recomposed after every betting action to make change. */
export const CHIP_DENOMINATIONS = [500, 100, 25, 5, 1] as const;
export type ChipValue = (typeof CHIP_DENOMINATIONS)[number];
export type ChipGroup = { value: ChipValue; count: number };

export function breakdownChips(amount: number): ChipGroup[] {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError('Chip balance must be a non-negative integer');
  let remaining = amount;
  return CHIP_DENOMINATIONS.map(value => {
    const count = Math.floor(remaining / value);
    remaining %= value;
    return { value, count };
  }).filter(group => group.count > 0);
}

export function chipsTotal(groups: readonly ChipGroup[]): number {
  return groups.reduce((total, group) => total + group.value * group.count, 0);
}

/** The unsettled part of the pot lives on the felt, in front of each player. */
export function collectedPot(pot: number, streetBets: readonly number[]): number {
  const unsettled = streetBets.reduce((total, bet) => total + bet, 0);
  const collected = pot - unsettled;
  if (!Number.isSafeInteger(collected) || collected < 0) throw new RangeError('Invalid pot and active bets');
  return collected;
}
