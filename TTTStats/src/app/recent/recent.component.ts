import { Component } from '@angular/core';
import { LegendType } from '../data-chart/data-chart.component';
import { ChartConfiguration, ChartType } from 'chart.js';
import { getColormap } from '../utils';
import { RestttService } from '../resttt.service';
import { getColumn } from '../datautils';

@Component({
  selector: 'app-recent',
  templateUrl: './recent.component.html',
  styleUrls: ['./recent.component.css']
})
export class RecentComponent {
  LegendType = LegendType;

  cMapCount: ChartConfiguration | undefined;

  fillin = {
    datestr: "dd/mm/yyyy",
    dow: "DoW",
    rounds: 0
  }

  date: string = "yyyy-mm-ddThh:mm:ss.sssZ";

  since: number = 0;

  constructor(private resttt: RestttService) { }

  ngOnInit() {
    this.loadApiData();
  }

  loadApiData() {
    this.loadDate()
      .then(() => Promise.all([
        this.loadMapCount()
      ]))
      .catch(err => console.log(err));
  }

  async loadDate() {
    var res = await this.resttt.Games();
    res = res.sort((a: any, b: any) => b.date - a.date);

    this.date = res[0].date;

    const mids = await this.resttt.MIDs(this.date.substring(0, 10));
    this.since = mids[0].mid;
    

    this.fillin.datestr = new Date(res[0].date).toLocaleDateString();
    this.fillin.dow = new Date(res[0].date).toLocaleDateString("en-US", { weekday: "long" });
    this.fillin.rounds = res[0].rounds;
  }

  simpleDataset(data: any[], cmap: string) {
    const colors = getColormap(cmap, data.length);
    return {
      data: data,
      backgroundColor: colors,
      hoverBackgroundColor: colors,
      hoverBorderColor: colors,
      borderColor: "#ffffff",
    }
  }

  async loadMapCount() {
    const res = await this.resttt.Maps(this.since);

    this.cMapCount = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(getColumn(res, "count"), "plotly")],
        labels: getColumn(res, "name")
      }
    }
  }
}