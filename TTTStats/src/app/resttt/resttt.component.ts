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
  @Input() cnames: any = [];

  // chart data key or keys
  @Input() data: string | string[] = "";
  // chart color key
  @Input() colors: any = "";
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
    this.result = await this.resttt.get(this.query, true);
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

  get_column_data(key: string | string[]): any {
    if (key instanceof Array) {
      return key.map( (value: any) => this.result.cols[value]);
    }
    else {
      return this.result.cols[key];
    }
  }

}
