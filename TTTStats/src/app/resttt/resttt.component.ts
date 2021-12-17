import { Component, ElementRef, Input, OnChanges } from '@angular/core';
import { DataStoreService } from '../data-store.service';
import { range } from '../utils';
import { RestttResult } from '../resttt.service';

@Component({
  selector: 'resttt',
  templateUrl: './resttt.component.html',
  styleUrls: ['./resttt.component.css']
})
export class RestttComponent implements OnChanges {
  loaded: boolean = false;
  _result: RestttResult | undefined;
  _treemap: any;
  _sankey: any;

  // REST Query
  @Input() query!: string;
  @Input() params: any = {};
  // Display mode text or RoleTM
  @Input() display!: string;

  @Input() options: any = {};

  constructor(private datastore: DataStoreService, private element: ElementRef) { }

  ngOnChanges() {
    this.load();
  }

  async load() {
    this.loaded = false;
    this._result = await this.datastore.get(this.query, this.params);
    if (this.display == "RoleTM")
      this.loadRoleTreemap();
    if (this.display == "Sankey")
      this.loadSankey();
    this.loaded = true;
  }

  stringify(obj: any): string {
    return JSON.stringify(obj);
  }

  loadRoleTreemap() {
    let dataitem = {
      type: "treemap",
      branchvalues: "total",
      labels: this._result!.cols.startrole,
      parents: this._result!.cols.superteam,
      values: this._result!.cols.count,
      marker: {colors: this._result!.cols.colour},
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

  async loadSankey() {
    let players = (await this.datastore.Players()).cols.name;

    let playerMap = new Map<string, number>();
    for (let player of players) {
      playerMap.set(player, playerMap.size);
    }

    let dataitem = {
      type: "sankey",
      orientation: "h",
      node: {
        pad: 15,
        thickness: 30,
        line: {color: "black", width: 0.5},
        label: [...players, ...players]
      },
      link: {
        source: this._result!.cols[this.options.source].map(k => playerMap.get(k)),
        target: this._result!.cols[this.options.target].map(v => players.length+playerMap.get(v)!),
        value: this._result!.cols.count
      }
    };

    this._sankey = {
      data: [dataitem],
      layout: {
        margin: {l: 0, r: 0, b: 0, t:0},
        autosize: true
      }
    };
  }

  /*plotlyResizeWorkaround() {
    // workaround for plotly svm-container not taking the height of its child
    let container = this.element.nativeElement.querySelector(".svg-container");
    if (!container) {
      setTimeout(() => {
        this.plotlyResizeWorkaround();
      }, 100);
    }else {
      console.log("Added");
      container.firstChild.addEventListener("change", () => {
        console.log("Works");
        container.style.height = container.firstChild.clientHeight+"px";
      });
    }
  }*/
}
