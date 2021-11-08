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
    "Other": []
  };
  groupNames: any = Object.keys(this.groups);

  constructor(private resttt: RestttService) { }

  ngOnInit(): void {
    this.load();
  }

  async load() {
    let roles = await this.resttt.get("Roles");
    for (let group of Object.keys(this.groups)) {
      this.groups[group] = roles.filter(function(r:any) { return r.superteam == group; });
    }
  }

}
