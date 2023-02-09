import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { ChartConfiguration, Chart, LegendItem } from 'chart.js';

/*
 * Very simple class to get legend info from a chart.
 * This is the recommended way to get legend info.
 */
class LegendItemExtractor {
  id: string = "htmlLegend";

  onReceivedItems: (items: LegendItem[]) => void;

  constructor(onReceivedItems: (items: LegendItem[]) => void) {
    this.onReceivedItems = onReceivedItems;
  }

  afterUpdate(chart: any) {
    const items = chart.options.plugins.legend.labels.generateLabels(chart);
    this.onReceivedItems(items);
  }
}

export enum LegendType {
  ChartJS,
  HTML,
  None
}

@Component({
  selector: 'data-chart',
  templateUrl: './data-chart.component.html',
  styleUrls: ['./data-chart.component.css']
})
export class DataChartComponent implements OnChanges {
  LegendType = LegendType;

  _legendtype = LegendType.HTML;
  private chart: Chart | undefined;
  htmlLegenditems: LegendItem[] = [];

  @Input() data!: ChartConfiguration;

  @Input("legend") set setlegend(legend: LegendType) {
    this._legendtype = legend;
  };

  @ViewChild('chart') private canvas!: ElementRef;

  ngOnChanges() {
    this.load();
  }

  load() {
    if (!this.data)
      return;

    if (this._legendtype != LegendType.ChartJS)
      this.disableChartjsLegend();

    if (this._legendtype == LegendType.HTML)
      this.prepareHTMLLegend();

    this.chart = new Chart(this.canvas.nativeElement, this.data);
  }

  prepareHTMLLegend() {
    let legendPlugin = new LegendItemExtractor((items: LegendItem[]) => {
      this.htmlLegenditems = items;
    });

    if (!this.data.plugins)
      this.data.plugins = [];
    this.data.plugins.push(legendPlugin);
  }

  toggleItem(item: any) {
    const {type} = this.chart!.config;
    if (type === 'pie' || type === 'doughnut') {
      // Pie and doughnut charts only have a single dataset and visibility is per item
      this.chart!.toggleDataVisibility(item.index);
    } else {
      this.chart!.setDatasetVisibility(item.datasetIndex, !this.chart!.isDatasetVisible(item.datasetIndex));
    }
    this.chart!.update();
  }

  disableChartjsLegend() {
    if (!this.data.options)
      this.data.options = {};
    if (!this.data.options.plugins)
      this.data.options.plugins = {};
    if (!this.data.options.plugins.legend)
      this.data.options.plugins.legend = {};
    this.data.options.plugins.legend.display = false;
  }
}
