
export class Dataframe { 
    rows: any[];
    header: string[];
    cols: {[key: string]: () => any[]};
  
    constructor(rows: any[]) {
      this.rows = rows;
      this.header = Object.keys(rows[0]);
      this.cols = {};
  
      for (let key of this.header) {
        this.cols[key] = () => this.rows.map(row => row[key]);
      }
    }

    get length(): number {
      return this.rows.length;
    }
  }