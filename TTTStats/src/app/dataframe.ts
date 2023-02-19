
export class Dataframe { 
    rows: any[];
    header: string[];
    _cols: {[key: string]: any[]};
  
    constructor(rows: any[]) {
      this.rows = rows;
      this.header = Object.keys(rows[0]);
      this._cols = {};
    }

    col(col: string): any[] {
      if (this._cols[col] === undefined) {
        this._cols[col] = this.rows.map(row => row[col]);
      }
      return this._cols[col]
    }

    get length(): number {
      return this.rows.length;
    }

    innerJoin(onCol: string, other: Dataframe): Dataframe {
      const small = this.length < other.length ? this : other;
      const big = this.length < other.length ? this : other;

      const map = new Map<string, any>();
      for (const row of small.rows)
        map.set(row[onCol], row);

      const res = [];
      for (const row of big.rows)
        res.push([...row, ...map.get(row[onCol])])

      return new Dataframe(res)
    }
  }