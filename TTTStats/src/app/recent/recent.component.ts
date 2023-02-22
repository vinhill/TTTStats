import { Component } from '@angular/core';
import { LegendType } from '../data-chart/data-chart.component';
import { ChartConfiguration, ChartType } from 'chart.js';
import { getColormap, reverseIndex, ttt_prettify_label } from '../utils';
import { RestttService } from '../resttt.service';
import { getColumn } from '../datautils';

@Component({
  selector: 'app-recent',
  templateUrl: './recent.component.html',
  styleUrls: []
})
export class RecentComponent {
  LegendType = LegendType;

  cKarmaTS: ChartConfiguration | undefined;

  cMapCount: ChartConfiguration | undefined;
  cKillsDeaths: ChartConfiguration | undefined;
  cPopularPurchases: ChartConfiguration | undefined;
  cKillsPerWeapon: ChartConfiguration | undefined;
  cRoundsPlayerTS: ChartConfiguration | undefined;
  cRoles: any[] | undefined;
  cWhoKilledWho: any[] | undefined;

  mediumChats?: string;
  minKarma = {player: "", karma: 0};

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
        this.loadMediumChat(),
        this.loadKarma(),
        this.loadMapCount(),
        this.loadKillsDeaths(),
        this.loadPopularPurchases(),
        this.loadKillsPerWeapon(),
        this.loadRolesTreemap(),
        this.loadWhoKilledWho(),
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

  async loadMediumChat() {
    let res = await this.resttt.MediumTexts(this.since);
    this.mediumChats = res.map(x => x.msg).join(" - ");
  }

  async loadKarma() {
    let res = await this.resttt.KarmaTS(this.since);

    const min = res.reduce((a, b) => a.karma < b.karma ? a : b);
    this.minKarma = {player: min.player, karma: min.karma};

    const players = new Set<string>(res.map(x => x.player));

    let player_ts: {[player: string]: number[]} = {};
    players.forEach(x => player_ts[x] = [1000]);
    for (const row of res) {
      player_ts[row.player].push(row.karma);
      for (const player of players) {
        if (player === row.player) continue;
        player_ts[player].push(reverseIndex(player_ts[player], 0));
      }
    }
        
    const colors = getColormap("chartjs", Object.keys(player_ts).length);
    const datasets = [];
    for (const player of players) {
      const color = colors.shift();
      datasets.push({
        label: player,
        data: player_ts[player],
        backgroundColor: color,
        borderColor: color
      });
    }

    this.cKarmaTS = {
      type: "line" as ChartType,
      options: {plugins: {legend: {position: 'bottom'}}},
      data: {
        datasets: datasets,
        labels: res.map(x => "")
      }
    }
  }

  async loadMapCount() {
    const res = await this.resttt.Maps(this.since);

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
    const res = await this.resttt.KDStat(this.since);

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
    const res = await this.resttt.Items(this.since);

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
    var res = await this.resttt.Weapons(this.since);
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
    const res = await this.resttt.Roles(this.since);

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
    const res = await this.resttt.WhoKilledWho(this.since);

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
}