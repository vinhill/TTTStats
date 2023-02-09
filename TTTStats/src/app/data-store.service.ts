import { Injectable } from '@angular/core';
import { RestttService } from './resttt.service';
import { strcmp, round } from './utils';
import { Dataframe } from './dataframe';


/* Group data by key and for each group, set agg to the sum over agg */
function groupBySum(data: any[], key: string, agg: string) : any {
  // strcmp is quite general and also would work for numbers
  data.sort((a, b) => strcmp(a[key], b[key]) );

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

type KillStat = {player: string, kills: number, wrong: number, kpg: number, score: number, deaths: number, kd: number};

@Injectable({
  providedIn: 'root'
})
export class DataStoreService {
  // todo move computations to backend, route functions to resttt service

  constructor(private resttt: RestttService) { }

  async Players(): Promise<string[]> {
    let res = await this.resttt.get('Players');
    let tbl = new Dataframe(res);
    return tbl.cols.name().sort((a: string, b: string)=> strcmp(a.toLowerCase(), b.toLowerCase()));
  }

  async GameCount(): Promise<number> {
    let res = await this.resttt.get("PlayerGameCount");
    let tbl = new Dataframe(res);
    return tbl.cols.rounds().reduce((a: number, b: number) => a+b);
  }

  async PlayerGameCounts(): Promise<{player: string, rounds: number}[]> {
    return this.resttt.get("PlayerGameCount");
  }

  async PlayerGameCount(player: string): Promise<number> {
    let res = await this.resttt.get("PlayerGameCount");
    return res.find(row => row.player == player).rounds;
  }

  async MapCount(): Promise<{count: number, map: string}[]> {
    return this.resttt.get("MapCount");
  }

  async _joinColorSuperteam(rows: any[], rolecol: string): Promise<void> {
    let roledata = await this.resttt.get("Roles");
    let rolemap = new Map<string, any>();
    for (let row of roledata) {
      rolemap.set(row.name, row);
    }

    for (let row of rows) {
      let role = rolemap.get(row[rolecol]);
      row.colour = role.colour;
      row.superteam = role.superteam;
    }
  }

  async RoleCount(): Promise<{startrole: string, count: number, colour: string, superteam: string}[]> {
    let data = (await this.resttt.get("PlayerRoleCount"));
    data = groupBySum(data, "startrole", "count");
    data.forEach(row => delete row.player);
    await this._joinColorSuperteam(data, "startrole");
    return data;
  }

  async PlayerRoleCount(player: string): Promise<{startrole: string, count: number, player: string, colour: string, superteam: string}[]> {
    let res = (await this.resttt.get("PlayerRoleCount"));
    res = res.filter(row => row.player == player);
    await this._joinColorSuperteam(res, "startrole");
    return res;
  }

  async Kills() : Promise<{kills: number, wrong: number, player:string}[]> {
    return this.resttt.get("PlayerKillCount");
  }

  async KillStats(): Promise<KillStat[]> {
    let killdata = await this.Kills();
    let gamecount = await this.PlayerGameCounts();
    let deaths = await this.Deaths();

    let gcm = new Map<string, number>();
    for (let row of gamecount) {
      gcm.set(row.player, row.rounds);
    }

    let dm = new Map<string, number>();
    for (let row of deaths) {
      dm.set(row.player, row.deaths);
    }

    let res = killdata as KillStat[];
    for (let row of res) {
      row.kpg = round(row.kills / gcm.get(row.player)!, 2);
      row.score = (row.kills - 2 * row.wrong) / gcm.get(row.player)!;
      row.deaths = dm.get(row.player)!;
      row.kd = round(row.kills / row.deaths, 2);
    }

    res.sort((a, b) => b.score - a.score);

    return res;
  }

  async PlayerKillStats(player: string): Promise<KillStat> {
    let res = await this.KillStats();
    const opt_res = res.find(row => row.player == player);
    if (opt_res == undefined) {
      throw new Error("Player not found");
    }
    return opt_res;
  }

  async PlayerRoleSurvived(player: string): Promise<any[]> {
    console.warn("Type missing for PlayerRoleSurvived");
    let res = await this.resttt.get("PlayerSurviveCount");
    return res.filter(row => row.player == player);
  }

  async Survived(): Promise<{player: string, count: number, name: string, rate: number, value: number}[]> {
    let data = (await this.resttt.get("PlayerSurviveCount"));

    let gamecount = await this.PlayerGameCounts();
    let gcm = new Map<string, number>();
    for (let row of gamecount) {
      gcm.set(row.player, row.rounds);
    }

    data = groupBySum(data, "player", "count");

    data.forEach(row => {
      delete row.startrole;
      row.rate = round(row.count / gcm.get(row.player)!, 2);
    });

    return data;
  }

  async Deaths(): Promise<{player: string, deaths: number}[]> {
    return this.resttt.get("PlayerDeathCount");
  }

  async PopularPurchases(): Promise<{item: string, amount: number}[]> {
    return this.resttt.get("PopularPurchases");
  }

  async PlayerPopularPurchases(player: string): Promise<{item: string, amount: number}[]> {
    return this.resttt.get("PopularPurchases/" + player);
  }

  async TeamWincount(): Promise<any[]> {
    console.warn("Type missing for TeamWincount");
    let res = (await this.resttt.get("TeamWincount"));
    res.sort((a: any, b: any) => b.count - a.count);
    return res;
  }

  async PlayerRoleWincount(player: string): Promise<any[]> {
    console.warn("Type missing for PlayerRoleWincount");
    let res = (await this.resttt.get("PlayerRoleWincount"));
    res = res.filter(row => row.player == player);
    await this._joinColorSuperteam(res, "startrole");
    return res;
  }

  async RoleWincount(): Promise<any[]> {
    console.warn("Type missing for RoleWincount");
    let data = (await this.resttt.get("PlayerRoleWincount"));
    data = groupBySum(data, "startrole", "wins");
    data.forEach(row => delete row.player);
    await this._joinColorSuperteam(data, "startrole");
    return data;
  }

  async PlayerWincount(player : string): Promise<number> {
    let res =  await this.PlayerRoleWincount(player);
    let tbl = new Dataframe(res);
    return tbl.cols.amount().reduce((a: number, b: number) => a+b);
  }

  async WhoKilledWho(): Promise<{count: number, killer: string, victim: string}[]> {
    return this.resttt.get("WhoKilledWho");
  }

  async WhoTeamedWho(): Promise<any[]> {
    console.warn("Type missing for WhoTeamedWho");
    return this.resttt.get("WhoTeamedWho");
  }

  async KillsByWeapon(): Promise<{count: number, weapon: string}[]> {
    let data = (await this.resttt.get("KillsByWeapon"));
    data = groupBySum(data, "weapon", "count");
    data.forEach(row => delete row.causee);
    data.sort((a: any, b: any) => b.count-a.count);
    return data;
  }

  async KillsByWeaponLimited(limit: number) : Promise<{weapon: string, count: number}[]> {
    let data = (await this.KillsByWeapon());
    return data.slice(0, limit);
  }

  async PlayerKillsByWeapon(player: string): Promise<{causee: string, weapon: string, count: number}[]> {
    let res = (await this.resttt.get("KillsByWeapon"));
    res = res.filter(row => row.causee == player);
    res.sort((a: any, b: any) => b.count-a.count);
    return res;
  }

  async DeathsByWeapon(): Promise<any[]> {
    console.warn("Type missing for DeathsByWeapon");
    let data = (await this.resttt.get("DeathsByWeapon"));
    data = groupBySum(data, "weapon", "count");
    data.forEach(row => delete row.player);
    return data;
  }

  async PlayerDeathsByWeapon(player: string): Promise<{player: string, weapon: string, count: number}[]> {
    let res = (await this.resttt.get("DeathsByWeapon"));
    res = res.filter(row => row.player == player);
    res.sort((a: any, b: any) => b.count-a.count);
    return res;
  }
}
