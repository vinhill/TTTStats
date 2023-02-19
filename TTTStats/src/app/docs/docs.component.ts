import { Component, OnInit } from '@angular/core';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'app-docs',
  templateUrl: './docs.component.html',
  styleUrls: ['./docs.component.css']
})
export class DocsComponent implements OnInit {
  groups: any = {
    "Innocent": [],
    "Detective": [],
    "Traitor": [],
    "Killer": [],
    "None": []
  };
  groupNames: any = Object.keys(this.groups);
  loaded: boolean = false;

  constructor(private resttt: RestttService) { }

  ngOnInit(): void {
    this.load();
  }

  async load() {
    let roles = await this.resttt.RoleDescriptions();
    // sort roles by team
    for (let group of Object.keys(this.groups)) {
      this.groups[group] = roles.filter(function(r:any) { return r.category == group; });
    }
    // sort teams by length of role descriptions
    for (let group of Object.keys(this.groups)) {
      this.groups[group].sort(function(a:any, b:any) {
        return b.descr.length - a.descr.length;
      });
    }
    this.loaded = true;
  }

}
