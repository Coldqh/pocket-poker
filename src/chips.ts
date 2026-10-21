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

/** Denomination inventory, representing actual chips on the felt. The bank can
 * make change freely, as at a staffed casino table; no money is created. */
export type ChipInventory = Record<ChipValue, number>;
export function emptyInventory():ChipInventory {return {500:0,100:0,25:0,5:0,1:0};}
export const DEFAULT_STARTING_CHIPS:ChipInventory = {500:1,100:3,25:6,5:8,1:10};
export function chipInventoryTotal(chips:ChipInventory):number {
  return CHIP_DENOMINATIONS.reduce((total,value)=>total+value*(chips[value]||0),0);
}
export function inventoryGroups(chips:ChipInventory):ChipGroup[] {
  return CHIP_DENOMINATIONS.filter(value=>(chips[value]||0)>0).map(value=>({value,count:chips[value]}));
}
export function inventoryFromAmount(amount:number):ChipInventory {
  const chips=emptyInventory();
  for(const group of breakdownChips(amount))chips[group.value]=group.count;
  return chips;
}
export function copyInventory(chips:ChipInventory):ChipInventory {
  const result=emptyInventory();
  for(const value of CHIP_DENOMINATIONS)result[value]=chips[value]||0;
  return result;
}
export function validStartingChips(chips:ChipInventory):boolean {
  return CHIP_DENOMINATIONS.every(value=>Number.isInteger(chips[value])&&chips[value]>=0&&chips[value]<=200)
    && chipInventoryTotal(chips)>=200&&chipInventoryTotal(chips)<=20000;
}
export function moveChips(from:ChipInventory,to:ChipInventory,amount:number):void {
  if(!Number.isSafeInteger(amount)||amount<0||amount>chipInventoryTotal(from))throw new RangeError('Insufficient chips');
  let due=amount;
  // Take existing denominations first. The bank makes change for any larger
  // chip when the player cannot pay the remaining amount exactly.
  for(let rounds=0;due>0&&rounds<100;rounds++){
    for(const value of CHIP_DENOMINATIONS){
      const count=Math.min(from[value],Math.floor(due/value));
      from[value]-=count;to[value]+=count;due-=value*count;
    }
    if(!due)break;
    const idx=CHIP_DENOMINATIONS.findLastIndex(value=>value>due&&from[value]>0);
    if(idx<0||idx===CHIP_DENOMINATIONS.length-1)throw new RangeError('Cannot make change');
    const large=CHIP_DENOMINATIONS[idx],small=CHIP_DENOMINATIONS[idx+1];
    from[large]--;from[small]+=large/small;
  }
  if(due)throw new RangeError('Unable to settle chips');
}
