import { Injectable, isDevMode } from '@angular/core';
import { deepcopy } from './utils';

@Injectable({
  providedIn: 'root'
})
export class RestttService {
	root: string;

	constructor() {
		if (isDevMode()) {
			this.root = 'http://localhost:3001/api/v1';
			console.log("Running in dev mode, using root: " + this.root);
		}else {
			this.root = 'https://resttt.fly.dev/api/v1';
		}
	}
	
	private cache: {[key: string]: any[]} = {};

	async custom(query: string, password: string): Promise<any[]> {
		let res = await fetch(this.root + "/query/custom", {
			method: "POST",
			body: JSON.stringify({
				"query": query,
				"password": password
				}),
			headers: {
				'Content-Type': "application/json"
			}
		});
		if(res.status != 200) {
			console.log(await res.json());
		}
		let content = await res.json();
		return content;
	}
	
	async getNoCache(name: string): Promise<any[]> {
		let res = await fetch(`${this.root}/query/${name}`, {
			method: "GET",
			headers: {
				'Content-Type': "application/json"
			}
		});
		if(res.status != 200) {
			console.log(await res.json());
		}
		let content = await res.json();
		return content;
	}

	async get(key: string) : Promise<any[]> {
		let cached = this.cache[key];
		if (!cached) {
			this.cache[key] = await this.getNoCache(key);
		}

		return deepcopy(this.cache[key]);
	}
}
