import { Component, Input, OnChanges } from '@angular/core';
import { RestttService } from '../resttt.service';
import { getColormap } from '../utils';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'resttt-chart',
  templateUrl: './resttt-chart.component.html',
  styleUrls: ['./resttt-chart.component.css']
})
export class RestttChartComponent implements OnChanges {
  loaded: boolean = false;
  result: any;
  _datakeys: string[] = [];
  _chartData: ChartConfiguration["data"] | undefined;

  // REST Query
  @Input() query!: string;
  // data key or keys to be displayed
  @Input("datakeys") set datakeysetter(keys: string | string[]) {
    if (keys instanceof Array) {
      this._datakeys = keys;
    }else{
      this._datakeys = [keys];
    }
  };

  // chart color key
  @Input() cmap: string = "chartjs";
  // chart label key
  @Input() labelkey: string = "";
  // chart type, see https://www.npmjs.com/package/ng2-charts
  @Input() ctype: any = "";
  // chart options
  @Input() coptions: ChartConfiguration["options"] | undefined;

  constructor(private resttt: RestttService) { }

  ngOnChanges() {
    this.load();
  }

  async load() {
    this.loaded = false;
    this.result = await this.resttt.get(this.query, true);
    this.makeChartDataset();
    this.loaded = true;
  }

  makeChartDataset() {
    this._chartData = {
      datasets: [],
      labels: this.result.cols[this.labelkey]
    };

    for (let key of this._datakeys) {
      let data: any[] = this.result.cols[key];
      let colors = getColormap(this.cmap, data.length);

      this._chartData.datasets.push({
        data: data,
        backgroundColor: colors,
        hoverBackgroundColor: colors,
        borderColor: "#ffffff",
      });
    }
  }
}
