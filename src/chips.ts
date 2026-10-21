/** Every physical chip is tracked; denominations remain unchanged unless exchanged explicitly. */
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

/** Physical inventory of chips on the table. */
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

/** Can amount be paid from these exact chips without making any change? */
export function canPayChips(chips:ChipInventory,amount:number):boolean {
  if(!Number.isSafeInteger(amount)||amount<0||amount>chipInventoryTotal(chips))return false;
  let remaining=amount;
  for(const value of CHIP_DENOMINATIONS)remaining-=Math.min(chips[value],Math.floor(remaining/value))*value;
  return remaining===0;
}

/** Physically split ONE chip into the next lower denomination. No value is lost. */
export function exchangeOneChip(chips:ChipInventory,value:ChipValue):boolean {
  const i=CHIP_DENOMINATIONS.indexOf(value);
  if(i<0||i===CHIP_DENOMINATIONS.length-1||chips[value]<1)return false;
  const lower=CHIP_DENOMINATIONS[i+1];
  chips[value]-=1;
  chips[lower]+=value/lower;
  return true;
}

/** Requested change is explicit. Bots and the dealer can also invoke it. */
export function makeChangeForAmount(chips:ChipInventory,amount:number):boolean {
  if(amount<0||amount>chipInventoryTotal(chips))return false;
  let attempts=0;
  while(!canPayChips(chips,amount)&&attempts++<60){
    let due=amount;
    for(const value of CHIP_DENOMINATIONS)due-=Math.min(chips[value],Math.floor(due/value))*value;
    // Break the smallest chip that is still larger than the missing remainder.
    let index=-1;
    for(let i=CHIP_DENOMINATIONS.length-2;i>=0;i--){
      const value=CHIP_DENOMINATIONS[i];
      if(value>due&&chips[value]>0){index=i;break;}
    }
    if(index===-1||!exchangeOneChip(chips,CHIP_DENOMINATIONS[index]))return false;
  }
  if(!canPayChips(chips,amount)){
    // Fallback for dense mixed stacks: progressively break large chips only
    // when needed. A chip of 1 always makes an exact integer payment possible.
    for(let i=0;i<CHIP_DENOMINATIONS.length-1&&!canPayChips(chips,amount);i++){
      const value=CHIP_DENOMINATIONS[i];
      while(chips[value]>0&&!canPayChips(chips,amount))exchangeOneChip(chips,value);
    }
  }
  return canPayChips(chips,amount);
}

/** Transfer the ACTUAL chosen denominations. Never swap 10 x 5 for a 50. */
export function moveChips(from:ChipInventory,to:ChipInventory,amount:number):void {
  if(!canPayChips(from,amount))throw new RangeError('Для ставки необходим размен фишек');
  let due=amount;
  for(const value of CHIP_DENOMINATIONS){
    const count=Math.min(from[value],Math.floor(due/value));
    from[value]-=count;to[value]+=count;due-=value*count;
  }
  if(due!==0)throw new RangeError('Chip transfer incomplete');
}

/** Show precisely which denominations an exact wager will place. */
export function paymentChipGroups(chips:ChipInventory,amount:number):ChipGroup[]|null {
  if(!canPayChips(chips,amount))return null;
  let remainder=amount;
  const picked:ChipGroup[]=[];
  for(const value of CHIP_DENOMINATIONS){
    const count=Math.min(chips[value],Math.floor(remainder/value));
    if(count)picked.push({value,count});
    remainder-=value*count;
  }
  return picked;
}
