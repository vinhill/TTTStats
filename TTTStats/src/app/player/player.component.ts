import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LegendType } from '../data-chart/data-chart.component';
import { ChartConfiguration, ChartType } from 'chart.js';
import { getColormap } from '../utils';
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
  cRoles: any[] | undefined;
  
  name: string = "";
  rounds: number | undefined;
  kills: number | undefined;
  teamkills: number | undefined;
  kdratio: number | undefined;
  kgratio: number | undefined;

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
      this.loadRolesTreemap()
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
	  this.name = name;
  }

  async loadBasics() {
    const participateStat = await this.resttt.ParticipateStats(undefined, this.name);
    this.rounds = participateStat[0].games;

    const killstats = await this.resttt.KDStat(undefined, this.name);
    this.kills = killstats[0].kills;
    this.teamkills = killstats[0].teamkills;
    this.kdratio = this.kills / killstats[0].deaths;
    this.kgratio = this.kills / this.rounds;
  }

  async loadPopularPurchases() {
    const res = await this.resttt.Items(undefined, this.name);

    this.cPopularPurchases = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(getColumn(res, "amount"), "plotly")],
        labels: getColumn(res, "item")
      }
    }
  }

  async loadKillsByWeapon() {
    var res = await this.resttt.Weapons(undefined, this.name);
    res = res.sort((a: any, b: any) => b.kills-a.kills);
    res = res.splice(0, 25);

    this.cKillsByWeapon = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(getColumn(res, "count"), "plotly")],
        labels: getColumn(res, "weapon")
      }
    }
  }

  async loadDeathsByWeapon() {
    const res = await this.resttt.DeathsByWeapon(this.name);

    this.cDeathsByWeapon = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(getColumn(res, "count"), "plotly")],
        labels: getColumn(res, "weapon")
      }
    }
  }

  async loadRolesTreemap() {
    const res = await this.resttt.Roles(undefined, this.name);

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
}
