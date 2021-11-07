import { Component, Input, OnChanges } from '@angular/core';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'resttt',
  templateUrl: './resttt.component.html',
  styleUrls: ['./resttt.component.css']
})
export class RestttComponent implements OnChanges {
  loaded: boolean = false;
  result: any = "";

  // REST Query
  @Input() query!: string;
  // Display mode
  @Input() display!: string;

  // table column keys
  @Input() columns: string[] = [];

  // chart data keys
  @Input() data: string = "";
  @Input() datas: string[] = [];
  // chart label key
  @Input() label: string = "";
  // chart type, see https://www.npmjs.com/package/ng2-charts
  @Input() type: any = "";
  // chart legend toggle
  @Input() legend: boolean = true;
  // chart options
  @Input() options: any = "";

  constructor(private resttt: RestttService) { }

  ngOnChanges() {
    this.load();
  }

  async load() {
    this.loaded = false;
    this.result = await this.resttt.get(this.query);
    console.log(this.result);
    this.loaded = true;
    // If no columns where provided, show all
    if (this.columns.length == 0 && this.result.length != 0) {
      this.columns = this.keys(this.result[0]);
    }
  }

  stringify(obj: any): string {
    return JSON.stringify(obj);
  }

  keys(obj: any): string[] {
    return Object.keys(obj);
  }

  get_columns(keys: string[]): any {
    /*
    [{c1: 0, c2: 1}, {c1: 3, c2: 2}]
    to
    {c1: [0, 3], c2: [1,2]}
    */
    let res: any = [];
    for (let key of keys) {
      res.push(this.result.map(function(row: any) {
        return row[key]
      }));
    }
    return res;
  }

  get_column(key: string): any {
    return this.get_columns([key])[0];
  }

}
