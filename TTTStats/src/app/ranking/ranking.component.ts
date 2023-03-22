import { Component, OnInit } from '@angular/core';
import { RestttService } from '../resttt.service';
import { round } from '../utils';

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
    let kdstat = await this.resttt.KDStat();
    kdstat.forEach(row => row.kills = row.kills - row.teamkills);

    let kdratio = kdstat.map(k => {
      return {name: k.player, value: round(k.kills / k.deaths, 2)}
    });
    kdratio.sort((a:any, b:any) => b.value - a.value);
    this.rankings.push({
      title: 'K/D',
      rows: kdratio
    });
    

    let teamkills = kdstat.map(k => {
      return {name: k.player, value: k.teamkills}
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

    let winrate = participateStats.map(k => {
      return {name: k.player, value: round(k.won / k.games, 2)}
    });
    winrate.sort((a:any, b:any) => b.value - a.value);
    this.rankings.push({
      title: 'Winrate',
      rows: winrate
    });

    let surviverate = participateStats.map(k => {
      return {name: k.player, value: round(k.survived / k.games, 2)}
    });
    surviverate.sort((a:any, b:any) => b.value - a.value);
    this.rankings.push({
      title: 'Survival rate',
      rows: surviverate
    });

    let jesterkills = await this.resttt.JesterKills();
    jesterkills.map((k: any) => k.value = k.count);
    jesterkills.sort((a:any, b:any) => b.value - a.value);
    this.rankings.push({
      title: 'Jester kills',
      rows: jesterkills
    });

    this.loaded = true;
  }
}
