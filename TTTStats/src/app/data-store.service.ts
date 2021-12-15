import { Injectable } from '@angular/core';
import { RestttService, RestttResult } from './resttt.service';
import { strcmp, round } from './utils';

@Injectable({
  providedIn: 'root'
})
export class DataStoreService {

  constructor(private resttt: RestttService) { }

  async Players() : Promise<RestttResult> {
    return this.resttt.get('Players');
  }

  async GameCount() : Promise<number> {
    let res = await this.resttt.get("PlayerGameCount");
    return res.cols.rounds.reduce((a: number, b: number) => a+b);
  }

  async PlayerGameCounts() : Promise<RestttResult> {
    return this.resttt.get("PlayerGameCount");
  }

  async PlayerGameCount(player: string) : Promise<number> {
    let res = await this.resttt.get("PlayerGameCount");
    return res.rows.find(row => row.player == player).rounds;
  }

  async MapCount() : Promise<RestttResult> {
    return this.resttt.get("MapCount");
  }

  async RoleCount() : Promise<RestttResult> {
    let data = (await this.resttt.get("PlayerRoleCount")).rows;
    data.sort((a, b) => strcmp(a.startrole, b.startrole) );
    
    let res = [];
    let currentRole: string = "";
    for (let row of data) {
      if (row.startrole != currentRole) {
        delete row.player;
        res.push(row);
        currentRole = row.startrole;
      }else {
        res[res.length-1].count += row.count;
      }
    }
    
    return this.resttt.withColumns(res);
  }

  async PlayerRoleCount(player: string) : Promise<RestttResult> {
    let res = await this.resttt.get("PlayerRoleCount");
    return this.resttt.withColumns(res.rows.filter(row => row.player == player));
  }

  async KillStats() : Promise<RestttResult> {
    let killdata = await this.resttt.get("PlayerKillCount");
    let gamecount = await this.PlayerGameCounts();
    let gcm = new Map<string, number>();
    
    for (let row of gamecount.rows) {
      gcm.set(row.player, row.rounds);
    }

    for (let row of killdata.rows) {
      row.kpg = round(row.kills / gcm.get(row.player)!, 2);
      row.score = (row.kills - 2 * row.wrong) / gcm.get(row.player)!;
    }

    killdata.rows.sort((a, b) => b.score - a.score);

    return this.resttt.withColumns(killdata.rows);
  }

  async PlayerKillStats(player : string) : Promise<any> {
    let res = await this.resttt.get("PlayerKillCount");
    return res.rows.find(row => row.player == player);
  }

  async PopularPurchases() : Promise<RestttResult> {
    return this.resttt.get("PopularPurchases");
  }

  async PlayerPopularPurchases(player: string) : Promise<RestttResult> {
    return this.resttt.get("PopularPurchases/" + player);
  }

  async TeamWincount() : Promise<RestttResult> {
    let res = (await this.resttt.get("TeamWincount")).rows;
    res.sort((a: any, b: any) => b.count - a.count);
    return this.resttt.withColumns(res);
  }

  async PlayerRoleWincount(player : string) : Promise<RestttResult> {
    let res = await this.resttt.get("PlayerRoleWincount");
    return this.resttt.withColumns(res.rows.filter(row => row.player == player));
  }

  async RoleWincount() : Promise<RestttResult> {
    let data = (await this.resttt.get("PlayerRoleWincount")).rows;
    data.sort((a, b) => a.starrole.localeCompare(b.startrole) );
    
    let res = [];
    let currentRole: string = "";
    for (let row of data) {
      if (row.startrole != currentRole) {
        delete row.player;
        res.push(row);
      }else {
        res[res.length-1].amount += row.amount;
      }
    }
    
    return this.resttt.withColumns(res);
  }

  async PlayerWincount(player : string) : Promise<number> {
    let res =  await this.PlayerRoleWincount(player);
    return res.cols.amount.reduce((a: number, b: number) => a+b);
  }

  async get(query : string, params: any = {}) : Promise<RestttResult> {
    switch(query) {
      case "Players":
        return this.Players();
      case "MapCount":
        return this.MapCount();
      case "RoleCount":
        return this.RoleCount();
      case "PlayerGameCounts":
        return this.PlayerGameCounts();
      case "KillStats":
        return this.KillStats();
      case "PopularPurchases":
        return this.PopularPurchases();
      case "TeamWincount":
        return this.TeamWincount();
      case "RoleWinCount":
        return this.RoleWincount();
      case "PlayerPopularPurchases":
        return this.PlayerPopularPurchases(params.player);
      case "PlayerRoleCount":
        return this.PlayerRoleCount(params.player);
      case "PlayerRoleWincount":
        return this.PlayerRoleWincount(params.player);
      default:
        throw Error("Unknown datastore query: " + query);;
    }
  }
}
