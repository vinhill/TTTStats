import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { getColormap } from '../utils';
import { ChartConfiguration, Chart, ChartType } from 'chart.js';
import { DataStoreService } from '../data-store.service';

const getOrCreateLegendList = (chart: any, legendContainer: any) => {
  let listContainer = legendContainer!.querySelector('ul');

  if (!listContainer) {
    listContainer = document.createElement('ul');

    legendContainer!.appendChild(listContainer);
  }

  return listContainer;
};

const htmlLegendPlugin = {
  id: 'htmlLegend',
  legendContainer: null,
  afterUpdate(chart: any, args: any, options: any) {
    const ul = getOrCreateLegendList(chart, this.legendContainer);

    // Remove old legend items
    while (ul.firstChild) {
      ul.firstChild.remove();
    }

    // Reuse the built-in legendItems generator
    const items = chart.options.plugins.legend.labels.generateLabels(chart);

    items.forEach((item:any) => {
      const li = document.createElement('li');
      li.style.alignItems = 'center';
      li.style.cursor = 'pointer';
      li.style.display = 'flex';
      li.style.flexDirection = 'row';
      li.style.marginLeft = '10px';

      li.onclick = () => {
        const {type} = chart.config;
        if (type === 'pie' || type === 'doughnut') {
          // Pie and doughnut charts only have a single dataset and visibility is per item
          chart.toggleDataVisibility(item.index);
        } else {
          chart.setDatasetVisibility(item.datasetIndex, !chart.isDatasetVisible(item.datasetIndex));
        }
        chart.update();
      };

      // Color box
      const boxSpan = document.createElement('span');
      boxSpan.style.background = item.fillStyle;
      boxSpan.style.borderColor = item.strokeStyle;
      boxSpan.style.borderWidth = item.lineWidth + 'px';
      boxSpan.style.display = 'inline-block';
      boxSpan.style.height = '20px';
      boxSpan.style.marginRight = '10px';
      boxSpan.style.width = '20px';

      // Text
      const textContainer = document.createElement('p');
      textContainer.style.color = item.fontColor;
      textContainer.style.textDecoration = item.hidden ? 'line-through' : '';

      const text = document.createTextNode(item.text);
      textContainer.appendChild(text);

      li.appendChild(boxSpan);
      li.appendChild(textContainer);
      ul.appendChild(li);
    });
  }
};

@Component({
  selector: 'resttt-chart',
  templateUrl: './resttt-chart.component.html',
  styleUrls: ['./resttt-chart.component.css']
})
export class RestttChartComponent implements OnChanges {
  loaded: boolean = false;
  private _datakeys: string[] = [];
  private _chart: Chart | undefined;

  @ViewChild('chart') private _chartCnvs!: ElementRef;
  @ViewChild('legend') private _legendCntr!: ElementRef;

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

    let _chartData: ChartConfiguration = {
      type: this.ctype as ChartType,
      options: this.coptions,
      data: {
        datasets: [],
        labels: result.cols[this.labelkey]
      },
      plugins: [htmlLegendPlugin],
    };
    htmlLegendPlugin.legendContainer = this._legendCntr.nativeElement;

    for (let key of this._datakeys) {
      let data: any[] = result.cols[key];
      let colors = getColormap(this.cmap, data.length);

      _chartData.data.datasets.push({
        data: data,
        backgroundColor: colors,
        hoverBackgroundColor: colors,
        borderColor: "#ffffff",
      });
    }

    this._chart = new Chart(this._chartCnvs.nativeElement, _chartData);

    this.loaded = true;
  }
}
