import { Component, OnInit } from '@angular/core';
import { DataStoreService } from '../data-store.service';
import { LegendType } from '../data-chart/data-chart.component';
import { ChartConfiguration, ChartType } from 'chart.js';
import { getColormap } from '../utils';
import { Dataframe } from '../dataframe';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit {
  LegendType = LegendType;

  cMapCount: ChartConfiguration | undefined;
  cKillsDeaths: ChartConfiguration | undefined;
  cPopularPurchases: ChartConfiguration | undefined;
  cKillsPerWeapon: ChartConfiguration | undefined;
  cRoles: any[] | undefined;
  cWhoKilledWho: any[] | undefined;

  constructor(private datastore: DataStoreService) { }

  ngOnInit() {
    this.loadMapCount();
    this.loadKillsDeaths();
    this.loadPopularPurchases();
    this.loadKillsPerWeapon();
    this.loadRolesTreemap();
    this.loadWhoKilledWho();
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

  async loadRolesTreemap() {
    const res = await this.datastore.RoleCount();
    const tbl = new Dataframe(res);

    let dataitem = {
      type: "treemap",
      branchvalues: "total",
      labels: tbl.cols.startrole(),
      parents: tbl.cols.superteam(),
      values: tbl.cols.count(),
      marker: {colors: tbl.cols.colour()},
    };

    // aggregate group value from subgroups
    let values = new Map<string, number>();
    for (let i = 0; i < dataitem.labels.length; i++) {
      let group = dataitem.parents[i];
      if (!values.has(group))
        values.set(group, 0);
      values.set(group, values.get(group) + dataitem.values[i]);
    }

    // add suffix to parents to make superteam names unique
    dataitem.parents = dataitem.parents.map((val: any) => val + "s");

    // add first-level groups in sunburst plot
    let groups = [
      {name: "Traitors", color: "#d22722", value: values.get("Traitor")},
      {name: "Innocents", color: "#00a01d", value: values.get("Innocent")},
      {name: "Detectives", color: "#1440a4", value: values.get("Detective")},
      {name: "Others", color: "#b8b8b8", value: values.get("Other")},
      {name: "Killers", color: "#f542ef", value: values.get("Killer")}
    ];
    for (let group of groups) {
      dataitem.labels.push(group.name);
      dataitem.marker.colors.push(group.color);
      dataitem.parents.push("");
      dataitem.values.push(group.value);
    }

    // finalize roleplot data
    this.cRoles = [dataitem];
  }

  async loadWhoKilledWho() {
    const res = await this.datastore.WhoKilledWho();
    const tbl = new Dataframe(res);

    const players = (await this.datastore.Players());

    let playerMap = new Map<string, number>();
    for (let player of players) {
      playerMap.set(player, playerMap.size);
    }

    let nodecolors = getColormap("plotly", players.length);
    nodecolors = [...nodecolors, ...nodecolors];
    let nodelabels = [...players, ...players];

    let dataitem = {
      type: "sankey",
      orientation: "h",
      node: {
        pad: 15,
        thickness: 30,
        line: {color: "black", width: 0.5},
        label: nodelabels,
        color: nodecolors,
      },
      link: {
        source: tbl.cols.killer().map(k => playerMap.get(k)),
        target: tbl.cols.victim().map(v => players.length+playerMap.get(v)!),
        value: tbl.cols.count()
      }
    };

    this.cWhoKilledWho = [dataitem];
  }
}