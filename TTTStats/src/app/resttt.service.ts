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
			headers: {
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

	async get(route: string, cache: boolean = true) : Promise<any[]> {
		if (cache) {
			return this.getCached(route);
		} else {
			return this.getUncached(route);
		}
	}
}
