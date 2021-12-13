import { Component, Input, OnChanges } from '@angular/core';
import { RestttService } from '../resttt.service';
import { UtilsService } from '../utils.service';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'resttt',
  templateUrl: './resttt.component.html',
  styleUrls: ['./resttt.component.css']
})
export class RestttComponent implements OnChanges {
  loaded: boolean = false;
  result: any;
  _datakeys: string[] = [];
  _chartData: ChartConfiguration["data"] | undefined;

  // REST Query
  @Input() query!: string;
  // Display mode text table or chart
  @Input() display!: string;
  // data key or keys to be displayed
  @Input("datakeys") set datakeysetter(keys: string | string[]) {
    if (keys instanceof Array) {
      this._datakeys = keys;
    }else{
      this._datakeys = [keys];
    }
  };

  // table column display names
  @Input() cnames: any = [];

  // chart color key
  @Input() cmap: string = "chartjs";
  // chart label key
  @Input() labelkey: string = "";
  // chart type, see https://www.npmjs.com/package/ng2-charts
  @Input() ctype: any = "";
  // chart options
  @Input() coptions: ChartConfiguration["options"] | undefined;

  constructor(private resttt: RestttService, private utils: UtilsService) { }

  ngOnChanges() {
    this.load();
  }

  async load() {
    this.loaded = false;
    this.result = await this.resttt.get(this.query, true);
    if (this.display == "chart")
      this.makeChartDataset();
    this.loaded = true;
  }

  stringify(obj: any): string {
    return JSON.stringify(obj);
  }

  keys(obj: any): string[] {
    return Object.keys(obj);
  }

  get_column_data(key: string | string[]): any {
    try{
      if (key instanceof Array) {
        return key.map( (value: any) => this.result.cols[value]);
      }
      else {
        return this.result.cols[key];
      }
    }catch(e){
      // To catch type errors resulting from a key not existing
      console.log(`Error ${e} in get_column_data for key ${key}. Result is ${JSON.stringify(this.result)}, loaded is ${this.loaded}`);
    }
  }

  makeChartDataset() {
    this._chartData = {
      datasets: [],
      labels: this.result.cols[this.labelkey]
    };

    for (let key of this._datakeys) {
      let data: any[] = this.result.cols[key];
      let colors = this.utils.getColormap(this.cmap, data.length);

      this._chartData.datasets.push({
        data: data,
        backgroundColor: colors,
        hoverBackgroundColor: colors,
        borderColor: "#ffffff",
      });
    }
  }

}
