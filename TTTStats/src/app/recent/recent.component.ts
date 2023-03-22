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
  cTeamWonSurRate: ChartConfiguration | undefined;
  cRoles: any[] | undefined;
  cWhoKilledWho: any[] | undefined;

  mediumChats?: string;
  minKarma = {player: "", karma: 0};
  multikills: {
    data: {player: string, count: number, weapon: string, mid: number, time: number}[],
    header: {[key: string] : string}
  } = {data: [], header: {}};

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
        this.loadTeamWonSurRate(),
        this.loadMultikills(),
      ]))
      .catch(err => console.log(err));
  }

  async loadDate() {
    var res = await this.resttt.GameDays();
    res = res.sort((a: any, b: any) => b.date - a.date);

    this.date = res[0].date;

    const mids = await this.resttt.MIDs(this.date.substring(0, 10));
    this.since = mids[0].mid;
    console.log("since", this.since)

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
    const games = await this.resttt.Games(this.since);
    const karmats = await this.resttt.KarmaTS(this.since);

    const min = karmats.reduce((a, b) => a.karma < b.karma ? a : b);
    this.minKarma = {player: min.player, karma: min.karma};

    const first_mid = games[0].mid;
    const xmax = games[games.length - 1].mid - first_mid + 1;
    const get_xpos = (mid: number, time: number) => {
      // 1+ for xmin = 1
      return mid - first_mid + 1 + time / games[mid - first_mid].duration
    };

    // separate out karmats by player
    const players = new Set<string>(karmats.map(x => x.player));

    let playerts: {[player: string]: [{x: number, y: number}]} = {};
    players.forEach(x => playerts[x] = [{x: 1, y: 10000}]);
    for (const row of karmats) {
      playerts[row.player].push({
        x: get_xpos(row.mid, row.time),
        y: row.karma
      });
    }
    players.forEach(p => {
      playerts[p].push({
        x: xmax,
        y: reverseIndex(playerts[p], 0).y
      });
    });

    // create plot
    const datasets: ChartConfiguration["data"]["datasets"] = [];
    const cmap = getColormap("plotly", players.size);
    let pidx = 0;
    for (const player of players) {
      datasets.push({
        label: player,
        data: playerts[player],
        borderColor: cmap[pidx],
        backgroundColor: cmap[pidx],
        pointBackgroundColor: cmap[pidx],
        pointBorderColor: cmap[pidx],
        pointHoverBackgroundColor: cmap[pidx],
        pointHoverBorderColor: cmap[pidx],
      });
      pidx++;
    }
    
    this.cKarmaTS = {
      type: "line" as ChartType,
      options: {
        plugins: { legend: { position: "bottom" } },
        scales: {
          x: {
            type: "linear",
            title: { text: "Game", display: true },
          },
          y: {
            title: { text: "Karma", display: true },
          }
        }
      },
      data: {
        datasets: datasets,
      }
    };
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
    let res = await this.resttt.KDStat(this.since);
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
  
  async loadTeamWonSurRate() {
    let res = await this.resttt.Teams(this.since);
    res = res.filter(x => x.won > 0 || x.survived > 0)

    const points = res.map(x => {
      return {x: x.won / x.participated, y: x.survived / x.participated}
    });

    const colors = getColormap("plotly", res.length);

    this.cTeamWonSurRate = {
      type: "scatter" as ChartType,
      data: {
        datasets: [{
          borderColor: colors,
          backgroundColor: colors,
          data: points,
          radius: 5,
        }],
      },
      options: {
        scales: {
          x: { title: { display: true, text: "win rate", font: { size: 14 } } },
          y: { title: { display: true, text: "survival rate" } }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context: any) => {
                return `${res[context.dataIndex].name}: won ${100*context.parsed.x.toFixed(2)}%, survived ${100*context.parsed.y.toFixed(2)}%`;
              }
            }
          }
        }
      }
    }
  }

  async loadMultikills() {
    let res = await this.resttt.Multikills(this.since);
    res = res.filter(x => x.count > 1);
    this.multikills = {
      data: res,
      header: {
        "player": "Killer",
        "count": "Kills",
        "weapon": "Weapon",
      }
    }
  }
}