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
  cKillsDeaths: ChartConfiguration | undefined;
  cPopularPurchases: ChartConfiguration | undefined;
  cKillsPerWeapon: ChartConfiguration | undefined;

  matchdate: string = "dd/mm/yyyy"

  constructor(private datastore: DataStoreService) { }

  ngOnInit() {
    this.loadMapCount();
    this.loadKillsDeaths();
    this.loadPopularPurchases();
    this.loadKillsPerWeapon();
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
    const res = await this.datastore.MapCount();
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

  async loadKillsDeaths() {
    const res = await this.datastore.KillStats();
    const tbl = new Dataframe(res);

    const ds_kills = {
      label: "Kills",
      data: tbl.cols.kills(),
      backgroundColor: "#ff0000",
      borderColor: "#ff0000"
    }
    const ds_deaths = {
      label: "Deaths",
      data: tbl.cols.deaths(),
      backgroundColor: "#0000ff",
      borderColor: "#0000ff"
    }

    this.cKillsDeaths = {
      type: "bar" as ChartType,
      options: {plugins: {legend: {position: 'bottom'}}},
      data: {
        datasets: [ds_kills, ds_deaths],
        labels: tbl.cols.player()
      }
    }
  }

  async loadPopularPurchases() {
    const res = await this.datastore.PopularPurchases();
    const tbl = new Dataframe(res);

    this.cPopularPurchases = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(tbl, "amount", "plotly")],
        labels: tbl.cols.item()
      }
    }
  }

  async loadKillsPerWeapon() {
    var res = await this.datastore.KillsByWeapon();
    res = res.sort((a: any, b: any) => b.count-a.count);
    res = res.splice(0, 25);
    res.splice(0, 25);
    const tbl = new Dataframe(res);

    this.cKillsPerWeapon = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(tbl, "count", "plotly")],
        labels: tbl.cols.weapon()
      }
    }
  }
}