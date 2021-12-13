import { Component, Input, OnChanges } from '@angular/core';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'resttt',
  templateUrl: './resttt.component.html',
  styleUrls: ['./resttt.component.css']
})
export class RestttComponent implements OnChanges {
  loaded: boolean = false;
  _result: any;
  _treemap: any;

  // REST Query
  @Input() query!: string;
  // Display mode text or RoleTM
  @Input() display!: string;

  constructor(private resttt: RestttService) { }

  ngOnChanges() {
    this.load();
  }

  async load() {
    this.loaded = false;
    this._result = await this.resttt.get(this.query, true);
    if (this.display == "RoleTM")
      this.loadRoleTreemap();
    this.loaded = true;
  }

  stringify(obj: any): string {
    return JSON.stringify(obj);
  }

  loadRoleTreemap() {
    let dataitem = {
      type: "treemap",
      branchvalues: "total",
      labels: this._result.cols.startrole,
      parents: this._result.cols.superteam,
      values: this._result.cols.count,
      marker: {colors: this._result.cols.colour},
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
    this._treemap = {
      data: [dataitem],
      layout: {
        margin: {l: 0, r: 0, b: 0, t:0},
      }
    };
  }
}
