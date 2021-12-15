import { Injectable } from '@angular/core';

export type RestttResult = {
	rows: any[];
	cols: any;
}

@Injectable({
  providedIn: 'root'
})
export class RestttService {
	
	private cache: {[key: string]: RestttResult} = {};

	async custom(query: string, password: string): Promise<RestttResult> {
		let res = await fetch("https://resttt.glitch.me/api/v1/query/custom", {
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
		let content = this.withColumns(await res.json());
		return content;
	}
	
	async getNoCache(name: string): Promise<RestttResult> {
		let res = await fetch(`https://resttt.glitch.me/api/v1/query/${name}`, {
			method: "GET",
			headers: {
				'Content-Type': "application/json"
			}
		});
		if(res.status != 200) {
			console.log(await res.json());
		}
		let content = this.withColumns(await res.json());
		return content;
	}

	async get(key: string) : Promise<RestttResult> {
		let cached = this.cache[key];
		if (!cached) {
			this.cache[key] = await this.getNoCache(key);
		}

		return this.cache[key];
	}

	public withColumns(table: any[]): RestttResult {
		/*
		[{c1: 0, c2: 1}, {c1: 3, c2: 2}]
		to
		{c1: [0, 3], c2: [1,2]}
		*/
		if (table.length == 0) {
			return {rows: table, cols: {}};
		}

		let cols: any = {};
		for (let column of Object.keys(table[0])) {
			cols[column] = table.map(function(row: any) {
		  		return row[column]
			});
	  	}

		return {rows: table, cols: cols};
	}
}
