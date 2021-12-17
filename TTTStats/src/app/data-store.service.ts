import { Injectable } from '@angular/core';
import { RestttService, RestttResult, RestttWithColumns } from './resttt.service';
import { strcmp, round } from './utils';


/* Group data by key and for each group, set agg to the sum over agg */
function groupBySum(data: any[], key: string, agg: string) : any {
  // strcmp is quite general and also would work for numbers
  data.sort((a, b) => strcmp(a.startrole, b.startrole) );

  let res = [];

  res.push(data[0]);
  let currentVal = res[0][key];

  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (row[key] == currentVal) {
      res[res.length-1][agg] += row[agg];
    }else {
      res.push(row);
      currentVal = row[key];
    }
  }

  return res;
}

@Injectable({
  providedIn: 'root'
})
export class DataStoreService {

  constructor(private resttt: RestttService) { }

  async Players(): Promise<string[]> {
    let res = await this.resttt.get('Players');
    return res.cols.name.sort((a: string, b: string)=> strcmp(a.toLowerCase(), b.toLowerCase()));
  }

  async GameCount(): Promise<number> {
    let res = await this.resttt.get("PlayerGameCount");
    return res.cols.rounds.reduce((a: number, b: number) => a+b);
  }

  async PlayerGameCounts(): Promise<RestttResult> {
    return this.resttt.get("PlayerGameCount");
  }

  async PlayerGameCount(player: string): Promise<number> {
    let res = await this.resttt.get("PlayerGameCount");
    return res.rows.find(row => row.player == player).rounds;
  }

  async MapCount(): Promise<RestttResult> {
    return this.resttt.get("MapCount");
  }

  async RoleCount(): Promise<RestttResult> {
    let data = (await this.resttt.get("PlayerRoleCount")).rows;
    data = groupBySum(data, "startrole", "count");
    data.forEach(row => delete row.player);
    return RestttWithColumns(data);
  }

  async PlayerRoleCount(player: string): Promise<RestttResult> {
    let res = await this.resttt.get("PlayerRoleCount");
    return RestttWithColumns(res.rows.filter(row => row.player == player));
  }

  async KillStats(): Promise<RestttResult> {
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

    return RestttWithColumns(killdata.rows);
  }

  async PlayerKillStats(player: string): Promise<any> {
    let res = await this.resttt.get("PlayerKillCount");
    return res.rows.find(row => row.player == player);
  }

  async PlayerRoleSurvived(player: string): Promise<RestttResult> {
      let res = await this.resttt.get("PlayerSurviveCount");
      return RestttWithColumns(res.rows.filter(row => row.player == player));
  }

  async Survived(): Promise<RestttResult> {
    let data = (await this.resttt.get("PlayerSurviveCount")).rows;
    data = groupBySum(data, "player", "count");
    data.forEach(row => delete row.startrole);
    return RestttWithColumns(data);
  }

  async Deaths(): Promise<RestttResult> {
    return this.resttt.get("PlayerDeathCount");
  }

  async PopularPurchases(): Promise<RestttResult> {
    return this.resttt.get("PopularPurchases");
  }

  async PlayerPopularPurchases(player: string): Promise<RestttResult> {
    return this.resttt.get("PopularPurchases/" + player);
  }

  async TeamWincount(): Promise<RestttResult> {
    let res = (await this.resttt.get("TeamWincount")).rows;
    res.sort((a: any, b: any) => b.count - a.count);
    return RestttWithColumns(res);
  }

  async PlayerRoleWincount(player: string): Promise<RestttResult> {
    let res = await this.resttt.get("PlayerRoleWincount");
    return RestttWithColumns(res.rows.filter(row => row.player == player));
  }

  async RoleWincount(): Promise<RestttResult> {
    let data = (await this.resttt.get("PlayerRoleWincount")).rows;
    data = groupBySum(data, "startrole", "amount");
    data.forEach(row => delete row.player);
    return RestttWithColumns(data);
  }

  async PlayerWincount(player : string): Promise<number> {
    let res =  await this.PlayerRoleWincount(player);
    return res.cols.amount.reduce((a: number, b: number) => a+b);
  }

  async WhoKilledWho(): Promise<RestttResult> {
    return this.resttt.get("WhoKilledWho");
  }

  async WhoTeamedWho(): Promise<RestttResult> {
    return this.resttt.get("WhoTeamedWho");
  }

  async KillsByWeapon(): Promise<RestttResult> {
    let data = (await this.resttt.get("KillsByWeapon")).rows;
    data = groupBySum(data, "weapon", "count");
    data.forEach(row => delete row.causee);
    return RestttWithColumns(data);
  }

  async PlayerKillsByWeapon(player: string): Promise<RestttResult> {
    let res = (await this.resttt.get("KillsByWeapon")).rows;
    res = res.filter(row => row.causee == player);
    res.sort((a: any, b: any) => b.count-a.count);
    return RestttWithColumns(res);
  }

  async DeathsByWeapon(): Promise<RestttResult> {
    let data = (await this.resttt.get("DeathsByWeapon")).rows;
    data = groupBySum(data, "weapon", "count");
    data.forEach(row => delete row.player);
    return RestttWithColumns(data);
  }

  async PlayerDeathsByWeapon(player: string): Promise<RestttResult> {
    let res = (await this.resttt.get("DeathsByWeapon")).rows;
    res = res.filter(row => row.player == player);
    res.sort((a: any, b: any) => b.count-a.count);
    return RestttWithColumns(res);
  }

  async get(query: string, params: any = {}): Promise<RestttResult> {
    switch(query) {
        case "PlayerGameCounts":
          return this.PlayerGameCounts();
      case "MapCount":
        return this.MapCount();
      case "RoleCount":
        return this.RoleCount();
        case "PlayerRoleCount":
          return this.PlayerRoleCount(params.player);
      case "KillStats":
        return this.KillStats();
      case "PlayerRoleSurvived":
        return this.PlayerRoleSurvived(params.player);
      case "Survived":
        return this.Survived();
      case "Deaths":
        return this.Deaths();
      case "PopularPurchases":
        return this.PopularPurchases();
        case "PlayerPopularPurchases":
          return this.PlayerPopularPurchases(params.player);
      case "TeamWincount":
        return this.TeamWincount();
      case "PlayerRoleWincount":
        return this.PlayerRoleWincount(params.player);
      case "RoleWinCount":
        return this.RoleWincount();
      case "WhoKilledWho":
        return this.WhoKilledWho();
      case "WhoTeamedWho":
        return this.WhoTeamedWho();
      case "KillsByWeapon":
        return this.KillsByWeapon();
      case "PlayerKillsByWeapon":
        return this.PlayerKillsByWeapon(params.player);
      case "DeathsByWeapon":
        return this.DeathsByWeapon();
      case "PlayerDeathsByWeapon":
        return this.PlayerDeathsByWeapon(params.player);
      default:
        throw Error("Unknown datastore query: " + query);;
    }
  }
}
