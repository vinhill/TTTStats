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
  cRoleWonSurRate: ChartConfiguration | undefined;
  cTeamWonSurRate: ChartConfiguration | undefined;
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
      this.loadRoundsPlayerTS(),
      this.loadRoleWonSurRate(),
      this.loadTeamWonSurRate(),
    ]).catch(err => console.log(err));
  }

  simpleDataset(data: any[], cmap: string): ChartConfiguration["data"]["datasets"][0] {
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
      data: {
        datasets: [this.simpleDataset(getColumn(res, "count"), "plotly")],
        labels: getColumn(res, "name").map(ttt_prettify_label)
      }
    }
  }

  async loadKillsDeaths() {
    let res = await this.resttt.KDStat();
    res.forEach(row => {
      row.kills = row.kills - row.teamkills
    });
    res = res.sort((a: any, b: any) => (b.kills/b.deaths) - (a.kills/a.deaths));

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
    let res = await this.resttt.Items();

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

    const players = (await this.resttt.Players()).map(p => p.name);

    let playerIdx = new Map<string, number>();
    for (const player of players) {
      playerIdx.set(player, playerIdx.size);
    }

    let nodecolors = getColormap("plotly", players.length);
    nodecolors = [...nodecolors, ...nodecolors];
    const nodelabels = [...players, ...players];

    const dataitem = {
      type: "sankey",
      orientation: "h",
      node: {
        pad: 15,
        thickness: 30,
        line: {color: "black", width: 0.5},
        label: nodelabels,
        color: nodecolors,
        hovertemplate: '%{label}',
      },
      link: {
        source: getColumn(res, "killer").map(k => playerIdx.get(k)),
        target: getColumn(res, "victim").map(v => players.length+playerIdx.get(v)!),
        value: getColumn(res, "count")
      }
    };

    this.cWhoKilledWho = [dataitem];
  }

  async loadRoundsPlayerTS() {
    const res = await this.resttt.GameDays();

    const colors = getColormap("plotly", 2);

    const ds_rounds = {
      label: "rounds",
      data: getColumn(res, "rounds"),
      backgroundColor: colors[0],
      borderColor: colors[0],
      pointBorderColor: colors[0],
      pointBackgroundColor: colors[0],
    }
    const ds_players = {
      label: "player",
      data: getColumn(res, "participants"),
      backgroundColor: colors[1],
      borderColor: colors[1],
      pointBorderColor: colors[1],
      pointBackgroundColor: colors[1],
    }

    this.cRoundsPlayerTS = {
      type: "line" as ChartType,
      options: {plugins: {legend: {position: 'bottom'}}},
      data: {
        datasets: [ds_rounds, ds_players],
        labels: getColumn(res, "date")
      }
    }
  }

  async loadRoleWonSurRate() {
    let res = await this.resttt.Roles();
    res = res.filter(x => x.won > 0 || x.survived > 0)

    const points = res.map(x => {
      return {x: x.won / x.participated, y: x.survived / x.participated}
    });
    
    this.cRoleWonSurRate = {
      type: "scatter" as ChartType,
      data: {
        datasets: [{
          borderColor: getColumn(res, "color"),
          backgroundColor: getColumn(res, "color"),
          hoverBackgroundColor: getColumn(res, "color"),
          hoverBorderColor: getColumn(res, "color"),
          data: points,
          radius: 5,
          hoverRadius: 6,
        }],
      },
      options: {
        scales: {
          x: { title: { display: true, text: "win rate", font: { size: 14 } } },
          y: { title: { display: true, text: "survival rate" } }
        },
        aspectRatio: 1.5,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context: any) => {
                return `${res[context.dataIndex].name}: won ${Math.round(100*context.parsed.x)}%, survived ${Math.round(100*context.parsed.y)}%`;
              }
            }
          }
        }
      }
    }
  }

  async loadTeamWonSurRate() {
    let res = await this.resttt.Teams();
    res = res.filter(x => x.won > 0 || x.survived > 0)

    const points = res.map(x => {
      return {x: x.won / x.participated, y: x.survived / x.participated}
    });

    this.cTeamWonSurRate = {
      type: "scatter" as ChartType,
      data: {
        datasets: [{
          borderColor: getColumn(res, "color"),
          backgroundColor: getColumn(res, "color"),
          hoverBackgroundColor: getColumn(res, "color"),
          hoverBorderColor: getColumn(res, "color"),
          data: points,
          radius: 8,
          hoverRadius: 9,
        }],
      },
      options: {
        scales: {
          x: { title: { display: true, text: "win rate", font: { size: 14 } } },
          y: { title: { display: true, text: "survival rate" } }
        },
        aspectRatio: 1.5,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context: any) => {
                return `${res[context.dataIndex].name}: won ${Math.round(100*context.parsed.x)}%, survived ${Math.round(100*context.parsed.y)}%`;
              }
            }
          }
        }
      }
    }
  }
}