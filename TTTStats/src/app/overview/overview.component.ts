import { Component, OnInit } from '@angular/core';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit {
  roleplotLoaded: boolean = false
  roleplot: any = null;

  constructor(private resttt: RestttService) { }

  ngOnInit(): void {
    this.loadRolePlot();
  }

  async loadRolePlot() {
    let table = await this.resttt.get("RoleCount", true);
    let dataitem = {
      type: "treemap",
      branchvalues: "total",
      labels: table.cols.startrole,
      parents: table.cols.superteam,
      values: table.cols.count,
      marker: {colors: table.cols.colour},
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
    this.roleplot = {
      data: [dataitem],
      layout: {
        margin: {l: 0, r: 0, b: 0, t:0},
      }
    };
    this.roleplotLoaded = true;
  }
}
