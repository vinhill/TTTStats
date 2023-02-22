import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LegendType } from '../data-chart/data-chart.component';
import { ChartConfiguration, ChartType } from 'chart.js';
import { getColormap, round, ttt_prettify_label } from '../utils';
import { RestttService } from '../resttt.service';
import { getColumn } from '../datautils';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: []
})
export class PlayerComponent implements OnInit {
  LegendType = LegendType;

  cPopularPurchases: ChartConfiguration | undefined;
  cKillsByWeapon: ChartConfiguration | undefined;
  cDeathsByWeapon: ChartConfiguration | undefined;
  cTS: ChartConfiguration | undefined;
  cWhoKilledWhoMore: ChartConfiguration | undefined;
  cRoles: any[] | undefined;
  
  fillin = {
    rounds: 0,
    kills: 0,
    teamkills: 0,
    kdratio: 0,
    kgratio: 0,
    winratio: 0,
    surviveratio: 0
  }

  player: string = "";

  constructor(private route: ActivatedRoute, private resttt: RestttService) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.setPlayerName(params.name);
      this.loadApiData();
    });
  }

  loadApiData() {
    Promise.all([
      this.loadBasics(),
      this.loadPopularPurchases(),
      this.loadKillsByWeapon(),
      this.loadDeathsByWeapon(),
      this.loadRolesTreemap(),
      this.loadTS(),
      this.loadWhoKilledWhoMore(),
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

  setPlayerName(name: string) {
	  this.player = name;
  }

  async loadBasics() {
    const res = await this.resttt.ParticipateStats();
    const participateStat = res.find((p: any) => p.player == this.player)!;
    this.fillin.rounds = participateStat.games;
    this.fillin.winratio = round(participateStat.won / participateStat.games, 2);
    this.fillin.surviveratio = round(participateStat.survived / participateStat.games, 2);

    const res2 = await this.resttt.KDStat();
    const kdstats = res2.find((p: any) => p.player == this.player)!;
    this.fillin.kills = kdstats.kills;
    this.fillin.teamkills = kdstats.teamkills;
    this.fillin.kdratio = round(kdstats.kills / kdstats.deaths, 2);
    this.fillin.kgratio = round(kdstats.kills / this.fillin.rounds, 2);
  }

  async loadPopularPurchases() {
    const res = await this.resttt.Items(undefined, this.player);

    this.cPopularPurchases = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(getColumn(res, "count"), "plotly")],
        labels: getColumn(res, "item").map(ttt_prettify_label)
      }
    }
  }

  async loadKillsByWeapon() {
    var res = await this.resttt.Weapons(undefined, this.player);
    res = res.sort((a: any, b: any) => b.kills-a.kills);
    res = res.splice(0, 25);

    this.cKillsByWeapon = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(getColumn(res, "kills"), "plotly")],
        labels: getColumn(res, "weapon").map(ttt_prettify_label)
      }
    }
  }

  async loadDeathsByWeapon() {
    const res = await this.resttt.DeathsByWeapon(this.player);

    this.cDeathsByWeapon = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(getColumn(res, "count"), "plotly")],
        labels: getColumn(res, "weapon").map(ttt_prettify_label)
      }
    }
  }

  async loadRolesTreemap() {
    const res = await this.resttt.Roles(undefined, this.player);

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

  async loadTS() {
    const pts = await this.resttt.ParticipateTS(this.player);
    const kdts = await this.resttt.KDTS(this.player);
    const colors = getColormap("plotly", 3);

    const winrate = pts.map(p => round(p.won / p.participated, 2));
    const surviverate = pts.map(p => round(p.survived / p.participated, 2));
    const kd = kdts.map(k => round(k.kills / k.deaths, 2));

    const ds_rounds = {
      label: "win rate",
      data: winrate,
      backgroundColor: colors[0],
      borderColor: colors[0],
      pointBorderColor: colors[0],
      pointBackgroundColor: colors[0],
    }
    const ds_players = {
      label: "survival rate",
      data: surviverate,
      backgroundColor: colors[1],
      borderColor: colors[1],
      pointBorderColor: colors[1],
      pointBackgroundColor: colors[1],
    }
    const ds_kd = {
      label: "K/D ratio",
      data: kd,
      backgroundColor: colors[2],
      borderColor: colors[2],
      pointBorderColor: colors[2],
      pointBackgroundColor: colors[2],
    }

    this.cTS = {
      type: "line" as ChartType,
      options: {plugins: {legend: {position: 'bottom'}}},
      data: {
        datasets: [ds_rounds, ds_players, ds_kd],
        labels: getColumn(pts, "date")
      }
    }
  }

  async loadWhoKilledWhoMore() {
    let res = await this.resttt.WhoKilledWho();
    res = res.filter(r => r.killer == this.player || r.victim == this.player);

    let player_kd: {[player: string]: {kills: number, deaths: number}} = {};
    res
      .map(r => r.killer == this.player ? r.victim : r.killer)
      .forEach(p => player_kd[p] = {kills: 0, deaths: 0});
    for (let r of res) {
      if (r.killer == this.player)
        player_kd[r.victim].kills = r.count;
      else
      player_kd[r.killer].deaths = r.count;
    }

    let data = Object.entries(player_kd).map(([player, kd]) => ({player, ...kd}));
    data.sort((a, b) => Math.abs(b.kills / b.deaths) - Math.abs(a.kills / a.deaths));

    // no lines
    this.cWhoKilledWhoMore = {
      type: "line" as ChartType,
      options: {
        plugins: {legend: {position: 'bottom'}},
        aspectRatio: 1,
        indexAxis: "y",
        datasets: {line: {showLine: false}}
      },
      data: {
        datasets: [
          {
            label: "kills",
            data: data.map(d => d.kills),
            backgroundColor: "#d22722",
            borderColor: "#d22722",
            pointBorderColor: "#d22722",
            pointBackgroundColor: "#d22722",
          },
          {
            label: "deaths",
            data: data.map(d => d.deaths),
            backgroundColor: "#00a01d",
            borderColor: "#00a01d",
            pointBorderColor: "#00a01d",
            pointBackgroundColor: "#00a01d",
          }
        ],
        labels: data.map(d => d.player)
      },
    };
  }
}
