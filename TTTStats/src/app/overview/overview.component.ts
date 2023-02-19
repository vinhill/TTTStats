import { Component, OnInit } from '@angular/core';
import { RestttService } from '../resttt.service';
import { LegendType } from '../data-chart/data-chart.component';
import { ChartConfiguration, ChartType } from 'chart.js';
import { getColormap, ttt_prettify_label } from '../utils';
import { getColumn } from '../datautils';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: []
})
export class OverviewComponent implements OnInit {
  LegendType = LegendType;

  cMapCount: ChartConfiguration | undefined;
  cKillsDeaths: ChartConfiguration | undefined;
  cPopularPurchases: ChartConfiguration | undefined;
  cKillsPerWeapon: ChartConfiguration | undefined;
  cRoundsPlayerTS: ChartConfiguration | undefined;
  cRoles: any[] | undefined;
  cWhoKilledWho: any[] | undefined;

  constructor(private resttt: RestttService) { }

  ngOnInit() {
    this.loadApiData();
  }

  loadApiData() {
    Promise.all([
      this.loadMapCount(),
      this.loadKillsDeaths(),
      this.loadPopularPurchases(),
      this.loadKillsPerWeapon(),
      this.loadRolesTreemap(),
      this.loadWhoKilledWho(),
      this.loadRoundsPlayerTS()
    ]).catch(err => console.log(err));
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
    const res = await this.resttt.Maps();

    this.cMapCount = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(getColumn(res, "count"), "plotly")],
        labels: getColumn(res, "name").map(ttt_prettify_label)
      }
    }
  }

  async loadKillsDeaths() {
    const res = await this.resttt.KDStat();

    const ds_kills = {
      label: "Kills",
      data: getColumn(res, "kills"),
      backgroundColor: "#ff0000",
      borderColor: "#ff0000"
    }
    const ds_deaths = {
      label: "Deaths",
      data: getColumn(res, "deaths"),
      backgroundColor: "#0000ff",
      borderColor: "#0000ff"
    }

    this.cKillsDeaths = {
      type: "bar" as ChartType,
      options: {plugins: {legend: {position: 'bottom'}}},
      data: {
        datasets: [ds_kills, ds_deaths],
        labels: getColumn(res, "player")
      }
    }
  }

  async loadPopularPurchases() {
    const res = await this.resttt.Items();

    this.cPopularPurchases = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(getColumn(res, "count"), "plotly")],
        labels: getColumn(res, "item").map(ttt_prettify_label)
      }
    }
  }

  async loadKillsPerWeapon() {
    var res = await this.resttt.Weapons();
    res = res.sort((a: any, b: any) => b.kills-a.kills);
    res = res.splice(0, 20);

    this.cKillsPerWeapon = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(getColumn(res, "kills"), "plotly")],
        labels: getColumn(res, "weapon").map(ttt_prettify_label)
      }
    }
  }

  async loadRolesTreemap() {
    const res = await this.resttt.Roles();

    let dataitem = {
      type: "treemap",
      branchvalues: "total",
      labels: getColumn(res, "name"),
      parents: getColumn(res, "category"),
      values: getColumn(res, "participated"),
      marker: {colors: getColumn(res, "color")},
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
      {name: "Nones", color: "#b8b8b8", value: values.get("None")},
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
    const res = await this.resttt.WhoKilledWho();

    const players = await this.resttt.Players();

    let playerMap = new Map<string, number>();
    for (const player of players) {
      playerMap.set(player.name, playerMap.size);
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
        source: getColumn(res, "killer").map(k => playerMap.get(k)),
        target: getColumn(res, "victim").map(v => players.length+playerMap.get(v)!),
        value: getColumn(res, "count")
      }
    };

    this.cWhoKilledWho = [dataitem];
  }

  async loadRoundsPlayerTS() {
    const res = await this.resttt.Games();

    const colors = getColormap("chartjs", 2);

    const ds_rounds = {
      label: "rounds",
      data: getColumn(res, "rounds"),
      backgroundColor: colors[0],
      borderColor: colors[0]
    }
    const ds_players = {
      label: "player",
      data: getColumn(res, "participants"),
      backgroundColor: colors[1],
      borderColor: colors[1]
    }

    this.cRoundsPlayerTS = {
      type: "line" as ChartType,
      options: {plugins: {legend: {position: 'bottom'}}},
      data: {
        datasets: [ds_rounds, ds_players],
        labels: getColumn(res, "count")
      }
    }
  }
}