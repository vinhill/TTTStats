import { Component, OnInit } from '@angular/core';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.css']
})
export class RankingComponent implements OnInit {
  rankings: {title: string, rows: any[]}[] = [];
  loaded: boolean = false;

  constructor(private resttt: RestttService) { }

  ngOnInit(): void {
    this.loadApiData();
  }

  loadApiData() {
    this.rankings = [];
    this.loaded = false;
    this.loadRankings().catch((e) => {
      console.error("Error loading rankings: " + e);
    });
  }

  async loadRankings() {
    const kdstat = await this.resttt.KDStat();

    let kdratio = kdstat.map(k => {
      return {name: k.player, value: k.kills / k.deaths}
    });
    kdratio.sort((a:any, b:any) => b.value - a.value);
    this.rankings.push({
      title: 'K/D',
      rows: kdratio
    });
    

    let teamkills = kdstat.map(k => {
      return {player: k.player, value: k.teamkills}
    });
    teamkills.sort((a:any, b:any) => b.value - a.value);
    this.rankings.push({
      title: 'Teamkills',
      rows: teamkills
    });

    const participateStats = await this.resttt.ParticipateStats();

    let games = participateStats.map(k => {
      return {name: k.player, value: k.games}
    });
    games.sort((a:any, b:any) => b.value - a.value);
    this.rankings.push({
      title: 'Games',
      rows: games
    });

    let surviverate = participateStats.map(k => {
      return {player: k.player, rate: k.survived / k.games}
    });
    surviverate.sort((a:any, b:any) => b.rate - a.rate);
    this.rankings.push({
      title: 'Survival rate',
      rows: surviverate
    });

    this.loaded = true;
  }
}
