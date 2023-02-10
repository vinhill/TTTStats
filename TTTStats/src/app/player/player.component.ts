import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataStoreService } from '../data-store.service';
import { LegendType } from '../data-chart/data-chart.component';
import { ChartConfiguration, ChartType } from 'chart.js';
import { getColormap } from '../utils';
import { Dataframe } from '../dataframe';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
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

  constructor(private route: ActivatedRoute, private datastore: DataStoreService) {}

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

  setPlayerName(name: string) {
	  this.name = name;
  }

  async loadBasics() {
    this.rounds = await this.datastore.PlayerGameCount(this.name);
    let killdata = await this.datastore.PlayerKillStats(this.name);
    this.kills = killdata.kills;
    this.teamkills = killdata.wrong;
    this.kdratio = killdata.kd;
    this.kgratio = killdata.kpg;
  }

  async loadPopularPurchases() {
    const res = await this.datastore.PlayerPopularPurchases(this.name);
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

  async loadKillsByWeapon() {
    const res = await this.datastore.PlayerKillsByWeapon(this.name);
    const tbl = new Dataframe(res);

    this.cKillsByWeapon = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(tbl, "count", "plotly")],
        labels: tbl.cols.weapon()
      }
    }
  }

  async loadDeathsByWeapon() {
    const res = await this.datastore.PlayerDeathsByWeapon(this.name);
    const tbl = new Dataframe(res);

    this.cDeathsByWeapon = {
      type: "doughnut" as ChartType,
      options: {},
      data: {
        datasets: [this.simpleDataset(tbl, "count", "plotly")],
        labels: tbl.cols.weapon()
      }
    }
  }

  async loadRolesTreemap() {
    const res = await this.datastore.PlayerRoleCount(this.name);
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
}
