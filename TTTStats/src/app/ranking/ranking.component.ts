import { Component, OnInit } from '@angular/core';
import { DataStoreService } from '../data-store.service';
import { RestttResult } from '../resttt.service';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.css']
})
export class RankingComponent implements OnInit {
  players: string[] = [];
  kills: any[] = [];

  constructor(private datastore: DataStoreService) { }

  ngOnInit(): void {
    this.load();
  }

  async load() {
    this.players = await this.datastore.Players();
    this.kills = (await this.datastore.Kills()).rows;
    this.kills.sort((a:any, b:any) => b.kills - a.kills);
  }
}
