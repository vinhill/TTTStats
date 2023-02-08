import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataStoreService } from '../data-store.service';
import { LegendType } from '../resttt-chart/resttt-chart.component';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements OnInit {
  LegendType = LegendType;
  
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
      this.load();
    });
  }

  setPlayerName(name: string) {
	  this.name = name;
  }

  async load() {
    this.rounds = await this.datastore.PlayerGameCount(this.name);
    let killdata = await this.datastore.PlayerKillStats(this.name);
    this.kills = killdata.kills;
    this.teamkills = killdata.wrong;
    this.kdratio = killdata.kd;
    this.kgratio = killdata.kpg;
  }
}
