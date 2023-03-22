import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { deepcopy } from './utils';

@Injectable({
  providedIn: 'root'
})
export class RestttService {
	baseURL: BehaviorSubject<string>;
	
	private cache: {[key: string]: any[]} = {};

	constructor() {
		if (isDevMode()) {
			this.baseURL = new BehaviorSubject<string>('http://localhost:3001/api/v1');
			console.log("Running in dev mode, using root: " + this.baseURL.getValue());
		} else {
			this.baseURL = new BehaviorSubject<string>('https://resttt.fly.dev/api/v1');
		}
		this.baseURL.subscribe(() => this.clearCache());
		this.baseURL.subscribe({next: (url) => console.log("Using REST base URL: " + url)});
	}

	clearCache() {
		this.cache = {};
	}
	
	private async getUncached(route: string): Promise<any[]> {
		let res = await fetch(`${this.baseURL.getValue()}/data/${route}`, {
			method: "GET",
			headers: { // TODO do we need this?
				'Content-Type': "application/json"
			}
		});

		if(res.status != 200) {
			throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
		} else {
			return res.json();
		}
	}

	private async getCached(route: string): Promise<any[]> {
		let cached = this.cache[route];
		if (!cached) {
			this.cache[route] = await this.getUncached(route);
		}

		return deepcopy(this.cache[route]);
	}

	async get(route: string, cache: boolean = true): Promise<any[]> {
		if (cache) {
			return this.getCached(route);
		} else {
			return this.getUncached(route);
		}
	}

	private urlencode(path: string, params: {[key: string]: any}): string {
		let url = path + "?";
		for (const key in params) {
			if (params[key] !== undefined) {
				url += encodeURIComponent(key)
				url += "=";
				url += encodeURIComponent(params[key]);
				url += "&";
			}
		}
		return url;
	}

	async Players()
		: Promise<{
			name: string
		}[]>
	{
		return this.get("Players");
	}

	async Maps(since?: number)
		: Promise<{
			name: string, count: number, avg_duration: number
		}[]> 
	{
		return this.get(this.urlencode("Maps", {since: since}));
	}

	async Roles(since?: number, player?: string)
		: Promise<{
			name: string, team: string, category: string, color: string,
			participated: number, won: number, survived: number
		}[]>
	{
		return this.get(this.urlencode("Roles", {since: since, player: player}));
	}

	async Teams(since?: number, player?: string)
		: Promise<{
			name: string, color: string,
			participated: number, won: number, survived: number
		}[]>
	{
		return this.get(this.urlencode("Teams", {since: since, player: player}));
	}

	async KDStat(since?: number, player?: string)
		: Promise<{
			player: string, kills: number, deaths: number, teamkills: number
		}[]>
	{
		return this.get(this.urlencode("KDStat", {since: since, player: player}));
	}

	async Weapons(since?: number, player?: string)
		: Promise<{
			weapon: string, kills: number
		}[]>
	{
		return this.get(this.urlencode("Weapons", {since: since, player: player}));
	}

	async Items(since?: number, player?: string)
		: Promise<{
			item: string, count: number
		}[]>
	{
		return this.get(this.urlencode("Items", {since: since, player: player}));
	}

	async ParticipateStats(since?: number)
		: Promise<{
			player: string, games: number, survived: number, won: number
		}[]>
	{
		return this.get(this.urlencode("ParticipateStats", {since: since}));
	}

	async GameDays()
		: Promise<{
			date: string, rounds: number, participants: number
		}[]>
	{
		return this.get("GameDays");
	}

	async Games(since?: number, player?: string)
		: Promise<{
			mid: number, date: string, duration: number, map: string, participants: number
		}[]>
	{
		return this.get(this.urlencode("Games", {since: since, player: player}));
	}

	async MediumTexts(since: number)
		: Promise<{
			msg: string
		}[]>
	{
		return this.get("MediumTexts/" + since);
	}

	async WhoKilledWho(since?: number)
		: Promise<{
			killer: string, victim: string, count: number
		}[]>
	{
		return this.get(this.urlencode("WhoKilledWho", {since: since}));
	}

	async JesterKills()
		: Promise<{
			name: string, count: number
		}[]>
	{
		return this.get("JesterKills");
	}

	async MIDs(date: string)
		: Promise<{
			mid: number
		}[]>
	{
		return this.get("MIDs/" + date);
	}

	async Teamup(since?: number, player?: string)
		: Promise<{
			first: string, second: string, reason: string, count: number
		}[]>
	{
		return this.get(this.urlencode("Teamup", {since: since, player: player}));
	}

	async KarmaTS(since?: number, player?: string)
		: Promise<{
			mid: number, player: string, karma: number, time: number
		}[]>
	{
		return this.get(this.urlencode("KarmaTS", {since: since, player: player}));
	}

	async Karma(since?: number)
		: Promise<{
			player: string, date: string, min: number
		}[]>
	{
		return this.get(this.urlencode("Karma", {since: since}));
	}

	async KDTS(player: string)
		: Promise<{
			date: string, kills: number, deaths: number, teamkills: number
		}[]>
	{
		return this.get("KDTS/" + player);
	}

	async ParticipateTS(player: string)
		: Promise<{
			date: string, won: number, survived: number, participated: number
		}[]>
	{
		return this.get("ParticipateTS/" + player);
	}

	async DeathsByWeapon(player: string)
		: Promise<{
			weapon: string, count: number
		}[]>
	{
		return this.get("DeathsByWeapon/" + player);
	}

	async RoleDescriptions()
		: Promise<{
			name: string, team: string, category: string, color: string, descr: string
		}[]>
	{
		return this.get("RoleDescriptions");
	}

	async Multikills(since?: number)
		: Promise<{
			mid: number, time: number, player: string, weapon: string, count: number
		}[]>
	{
		return this.get(this.urlencode("Multikills", {since: since}));
	}
}
