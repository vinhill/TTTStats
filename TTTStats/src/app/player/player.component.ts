import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements OnInit {
  name: string = "";
  rounds: number | undefined;
  kills: number | undefined;
  teamkills: number | undefined;

  constructor(private route: ActivatedRoute, private resttt: RestttService) { }

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
    await this.getPlayedRounds();
    await this.getKills();
  }

  async getPlayedRounds() {
    let playerrounds = await this.resttt.get("PlayerGameCount");
    playerrounds = playerrounds.filter((x: any) => x.player == this.name);
    if (playerrounds.length != 1)
      throw new Error(`PlayerGameCount for player ${this.name} returned ${playerrounds}.`);
    else
      this.rounds = playerrounds[0].rounds;
  }

  async getKills() {
    let killcounts = await this.resttt.get("PlayerKillCount");
    killcounts = killcounts.filter((x: any) => x.player == this.name);
    if (killcounts.length != 1)
      throw new Error(`PlayerKillCount for player ${this.name} returned ${killcounts}.`);
    else {
      this.kills = killcounts[0].kills;
      this.teamkills = killcounts[0].wrong;
    }
  }
}
