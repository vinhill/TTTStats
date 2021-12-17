import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { getColormap } from '../utils';
import { ChartConfiguration, Chart, ChartType, LegendItem } from 'chart.js';
import { DataStoreService } from '../data-store.service';

class CustomLegend {
  id: string = "htmlLegend";

  onReceivedItems: (items: LegendItem[]) => void;

  constructor(onReceivedItems: (items: LegendItem[]) => void) {
    this.onReceivedItems = onReceivedItems;
  }

  afterUpdate(chart: any, args: any, options: any) {
    const items = chart.options.plugins.legend.labels.generateLabels(chart);
    this.onReceivedItems(items);
  }
}

@Component({
  selector: 'resttt-chart',
  templateUrl: './resttt-chart.component.html',
  styleUrls: ['./resttt-chart.component.css']
})
export class RestttChartComponent implements OnChanges {
  loaded: boolean = false;
  private _datakeys: string[] = [];
  private _chart: Chart | undefined;
  legenditems: LegendItem[] = [];

  @ViewChild('chart') private _chartCnvs!: ElementRef;

  // REST Query
  @Input() query!: string;
  @Input() params: any = {};

  // data key or keys to be displayed
  @Input("datakeys") set datakeysetter(keys: string) {
    this._datakeys = keys.split(",");
  };

  // chart color key
  @Input() cmap: string = "chartjs";
  // chart label key
  @Input() labelkey: string = "";
  // chart type, see https://www.npmjs.com/package/ng2-charts
  @Input() ctype: string = "";
  // chart options
  @Input() coptions: ChartConfiguration["options"] = {};
  // general toggle for legend
  @Input() legend: boolean = true;
  // specific toggle between chartjs svg and custom html legend
  @Input() htmllegend: boolean = false;

  constructor(private datastore: DataStoreService) { }

  ngOnChanges() {
    this.load();
  }

  load() {
    this.makeChart();
  }

  async makeChart() {
    this.loaded = false;
    let result = await this.datastore.get(this.query, this.params);

    if (!this.legend || this.htmllegend) {
      this.disableChartLegend();
    }

    let _chartData: ChartConfiguration = {
      type: this.ctype as ChartType,
      options: this.coptions,
      data: {
        datasets: [],
        labels: result.cols[this.labelkey]
      },
    };

    for (let key of this._datakeys) {
      let data: any[] = result.cols[key];
      let colors = getColormap(this.cmap, data.length);

      _chartData.data.datasets.push({
        data: data,
        backgroundColor: colors,
        hoverBackgroundColor: colors,
        hoverBorderColor: colors,
        borderColor: "#ffffff",
      });
    }

    if (this.legend && this.htmllegend) {
      let legendPlugin = new CustomLegend((items: LegendItem[]) => {
        this.legenditems = items;
      });

      if (!_chartData.plugins)
        _chartData.plugins = [];
      _chartData.plugins.push(legendPlugin);
    }

    this._chart = new Chart(this._chartCnvs.nativeElement, _chartData);

    this.loaded = true;
  }

  chartToggleItem(item: any) {
    const {type} = this._chart!.config;
    if (type === 'pie' || type === 'doughnut') {
      // Pie and doughnut charts only have a single dataset and visibility is per item
      this._chart!.toggleDataVisibility(item.index);
    } else {
      this._chart!.setDatasetVisibility(item.datasetIndex, !this._chart!.isDatasetVisible(item.datasetIndex));
    }
    this._chart!.update();
  }

  disableChartLegend() {
    if (!this.coptions)
      this.coptions = {};
    if (!this.coptions.plugins)
      this.coptions.plugins = {};
    if (!this.coptions.plugins.legend)
      this.coptions.plugins.legend = {};
    this.coptions.plugins.legend.display = false;
  }
}
