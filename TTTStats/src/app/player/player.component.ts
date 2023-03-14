import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
  cRolesWinSur: ChartConfiguration | undefined;

  fillin = {
    rounds: 0,
    kills: 0,
    teamkills: 0,
    kdratio: 0,
    kgperc: 0,
    winperc: 0,
    surviveperc: 0
  }

  player: string = "";
  
  @ViewChild('cRoleSelect') cRoleSelect!: ElementRef;

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
      this.loadTS(),
      this.loadWhoKilledWhoMore(),
      this.loadRolesWinSur(),
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
    this.fillin.winperc = round(100 * participateStat.won / participateStat.games, 0);
    this.fillin.surviveperc = round(100 * participateStat.survived / participateStat.games, 0);

    const res2 = await this.resttt.KDStat();
    const kdstats = res2.find((p: any) => p.player == this.player)!;
    this.fillin.kills = kdstats.kills;
    this.fillin.teamkills = kdstats.teamkills;
    this.fillin.kdratio = round(kdstats.kills / kdstats.deaths, 2);
    this.fillin.kgperc = round(100 * kdstats.kills / this.fillin.rounds, 0);
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

    const d_kills: ChartConfiguration["data"]["datasets"][0] = {
      label: "kills",
      data: data.map(d => d.kills),
      backgroundColor: "#d22722",
      borderColor: "#d22722",
      pointBorderColor: "#d2272280",
      pointBackgroundColor: "#d2272280",
      pointHoverBackgroundColor: "#d2272280",
      pointHoverBorderColor: "#d2272280",
      radius: 5,
      hoverRadius: 6,
      xAxisID: "xAxis",
    }
    const d_deaths: ChartConfiguration["data"]["datasets"][0] = {
      label: "deaths",
      data: data.map(d => d.deaths),
      backgroundColor: "#00a01d",
      borderColor: "#00a01d",
      pointBorderColor: "#00a01d80",
      pointBackgroundColor: "#00a01d80",
      pointHoverBackgroundColor: "#00a01d80",
      pointHoverBorderColor: "#00a01d80",
      radius: 5,
      hoverRadius: 6,
      xAxisID: "xAxis",
    }
    const d_kd: ChartConfiguration["data"]["datasets"][0] = {
      label: "K/D",
      data: data.map(d => round(d.kills / Math.max(d.deaths, 0.5), 2)),
      backgroundColor: "##242424",
      borderColor: "##242424",
      pointBorderColor: "##242424",
      pointBackgroundColor: "##242424",
      radius: 5,
      hoverRadius: 6,
      xAxisID: "kd",
    }

    // no lines
    this.cWhoKilledWhoMore = {
      type: "line" as ChartType,
      options: {
        plugins: {legend: {position: 'bottom'}},
        aspectRatio: 1,
        indexAxis: "y",
        datasets: {line: {showLine: false}},
        scales: {
          kd: {
            position: "top",
            title: {
              text: "KD ratio",
              display: true
            }
          },
          xAxis: {
            position: "bottom",
            title: {
              text: "kills and deaths",
              display: true
            }
          }
        }
      },
      data: {
        datasets: [
          d_kills, d_deaths, d_kd
        ],
        labels: data.map(d => d.player)
      },
    };
  }

  async loadRolesWinSur() {
    const total_res = await this.resttt.Roles();
    const player_res = await this.resttt.Roles(undefined, this.player);
    
    const total_map = new Map<string, {winrate: number, surviverate: number}>();
    for (const r of total_res)
      total_map.set(r.name, {
        winrate: r.won / r.participated,
        surviverate: r.survived / r.participated
      });
    
    const data: {
      role: string, win_rt: number, surv_rt: number, tot_win_rt: number, tot_surv_rt: number, color: string
    }[] = [];
    for (const r of player_res) {
      const tot = total_map.get(r.name)!;
      data.push({
        role: r.name,
        win_rt: r.won / r.participated,
        surv_rt: r.survived / r.participated,
        tot_win_rt: tot.winrate,
        tot_surv_rt: tot.surviverate,
        color: r.color
      });
    }

    const select = this.cRoleSelect.nativeElement.value;

    // top and worst n for surviverate, winrate
    const n_each = 10;
    const roles: Set<string> = new Set();
    if (select === "best_win_rt" || select === "worst_win_rt")
      data.sort((a, b) => a.win_rt - b.win_rt);
    else
      data.sort((a, b) => a.surv_rt - b.surv_rt);
    for (let i = 0; i < n_each; i++) {
      if (select === "best_win_rt" || select === "best_sur_rt")
        roles.add(data[data.length - 1 - i].role);
      else
        roles.add(data[i].role);
    }

    let datasets: ChartConfiguration["data"]["datasets"] = [];
    const colors = data.filter(d => roles.has(d.role)).map(d => d.color);
    if (select === "best_win_rt" || select === "worst_win_rt") {
      datasets.push({
        label: "your winrate",
        data: data.filter(d => roles.has(d.role)).map(d => d.win_rt),
        backgroundColor: colors,
      });
      datasets.push({
        label: "total winrate",
        data: data.filter(d => roles.has(d.role)).map(d => d.tot_win_rt),
        backgroundColor: colors.map(x => x+"80"),
      });
    } else {
      datasets.push({
        label: "your surviverate",
        data: data.filter(d => roles.has(d.role)).map(d => d.surv_rt),
        backgroundColor: colors,
      });
      datasets.push({
        label: "total surviverate",
        data: data.filter(d => roles.has(d.role)).map(d => d.tot_surv_rt),
        backgroundColor: colors.map(x => x+"80"),
      });
    }

    this.cRolesWinSur = {
      type: "bar" as ChartType,
      options: {
        plugins: {legend: {position: 'bottom'}},
        indexAxis: "y",
        aspectRatio: 0.9,
      },
      data: {
        datasets,
        labels: data.filter(d => roles.has(d.role)).map(d => d.role)
      }
    }
  }
}
