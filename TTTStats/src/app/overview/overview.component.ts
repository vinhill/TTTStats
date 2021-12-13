import { Component, OnInit } from '@angular/core';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit {

  roleplot: any = null;

  constructor(private resttt: RestttService) { }

  ngOnInit(): void {
    this.loadRolePlot();
  }

  async loadRolePlot() {
    let table = await this.resttt.get("RoleCount", true);
    let dataitem = {
      type: "treemap",
      labels: table.cols.startrole,
      parents: table.cols.superteam,
      values: table.cols.count,
      marker: {colors: table.cols.colour},
    };

    // add suffix to parents to make superteam names unique
    dataitem.parents = dataitem.parents.map((val: any) => val + "s");

    // add first-level groups in sunburst plot
    let groups = [
      ["Traitor", "#d22722"],
      ["Innocent", "#00a01d"],
      ["Detective", "#1440a4"],
      ["Other", "#b8b8b8"],
      ["Killer", "#f542ef"]
    ];
    for (let group of groups) {
      dataitem.labels.push(group[0] + "s");
      dataitem.marker.colors.push(group[1]);
      dataitem.parents.push("");
      dataitem.values.push(0);
    }

    // finalize roleplot data
    this.roleplot = {
      data: [dataitem],
      layout: {
        margin: {l: 0, r: 0, b: 0, t:0},
      }
    };
  }
}
