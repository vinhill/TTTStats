import { Component } from '@angular/core';
import { DataStoreService } from '../data-store.service';
import { LegendType } from '../data-chart/data-chart.component';
import { ChartConfiguration, ChartType } from 'chart.js';
import { getColormap } from '../utils';
import { Dataframe } from '../dataframe';

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

  constructor(private datastore: DataStoreService) { }

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
    var res = await this.datastore.Dates();
    res = res.sort((a: any, b: any) => b.date - a.date);
    this.date = res[0].date;
    this.fillin.datestr = new Date(res[0].date).toLocaleDateString();
    this.fillin.dow = new Date(res[0].date).toLocaleDateString("en-US", { weekday: "long" });
    this.fillin.rounds = res[0].count;
  }

  simpleDataset(tbl: Dataframe, col: string, cmap: string) {
    const colors = getColormap(cmap, tbl.length);
    return {
      data: tbl.cols[col](),
      backgroundColor: colors,
      hoverBackgroundColor: colors,
      hoverBorderColor: colors,
      borderColor: "#ffffff",
    }
  }

  async loadMapCount() {
    const res = await this.datastore.MapCount(this.date);
    const tbl = new Dataframe(res);

    this.cMapCount = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(tbl, "count", "plotly")],
        labels: tbl.cols.map()
      }
    }
  }
}