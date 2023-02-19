
export function getColumn(tbl: any[], col: string): any[] {
  return tbl.map(row => row[col]);
}

export function innerJoin(tbl_a: any[], tbl_b: any[], col: string): any[] {
  const small = tbl_a.length < tbl_b.length ? tbl_a : tbl_b;
  const big = tbl_a.length < tbl_b.length ? tbl_a : tbl_b;

  const map = new Map<string, any>();
  for (const row of small)
    map.set(row[col], row);

  const res = [];
  for (const row of big)
    res.push({...row, ...map.get(row[col])})

  return res;
}

function getObjKeys(obj: any, keys: string[]): any {
  const res: any = {};
  for (const key of keys)
    res[key] = obj[key];
  return res;
}

function objEqForKeys(a: any, b: any, keys: string[]): boolean {
  for (const key of keys)
    if (a[key] !== b[key])
      return false;
  return true;
}

function sortByColsInplace(tbl: any[], cols: string[]) {
  tbl.sort((a, b) => {
    for (let col of cols) {
      if (a[col] < b[col])
        return -1
      if (a[col] > b[col])
        return 1
    }
    return 0
  })
}

type AggregatorType = {name: string, func: (tbl: any[]) => any}

export function groupBy(tbl: any[], cols: string[], ...aggregators: AggregatorType[]): any[] {
  sortByColsInplace(tbl, cols)

  const res = []
  let idx = 0, oldidx = 0
  while (idx < tbl.length) {
    while(idx+1 < tbl.length && objEqForKeys(tbl[idx], tbl[idx+1], cols))
      idx++

    const row = getObjKeys(tbl[idx], cols)
    const agg_slice = tbl.slice(oldidx, idx+1)
    for (const aggregator of aggregators) {
      row[aggregator.name] = aggregator.func(agg_slice)
    }
    res.push(row)
    idx++
    oldidx = idx
  }
  return res
}