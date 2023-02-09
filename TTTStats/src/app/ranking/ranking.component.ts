import { Component, OnInit } from '@angular/core';
import { DataStoreService } from '../data-store.service';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.css']
})
export class RankingComponent implements OnInit {
  rankings: {title: string, rows: any[]}[] = [];

  constructor(private datastore: DataStoreService) { }

  ngOnInit(): void {
    this.load();
  }

  async load() {
    let killstats = (await this.datastore.KillStats());
    killstats.sort((a:any, b:any) => b.kd - a.kd);
    killstats.forEach((k:any) => {
      k.name = k.player;
      k.value = k.kd;
    });
    this.rankings.push({
      title: 'K/D',
      rows: killstats
    });
    
    let teamkills = (await this.datastore.KillStats());
    teamkills.sort((a:any, b:any) => b.wrong - a.wrong);
    teamkills.forEach((k:any) => {
      k.name = k.player;
      k.value = k.wrong;
    });
    this.rankings.push({
      title: 'Teamkills',
      rows: teamkills
    });

    let games = (await this.datastore.PlayerGameCounts());
    games.sort((a:any, b:any) => b.rounds - a.rounds);
    games.forEach((k:any) => {
      k.name = k.player;
      k.value = k.rounds;
    });
    this.rankings.push({
      title: 'Games',
      rows: games
    });

    let survived = (await this.datastore.Survived());
    survived.sort((a:any, b:any) => b.rate - a.rate);
    survived.forEach((k:any) => {
      k.name = k.player;
      k.value = k.rate;
    });
    this.rankings.push({
      title: 'Survival rate',
      rows: survived
    });
  }
}
