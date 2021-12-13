import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RestttService {
	
	private cache: any = {};

	async custom(query: string, password: string, includeCols: boolean = false): Promise<any> {
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
		let content = await res.json();
		if (includeCols) {
			content = this.withColumns(content);
		}
		return content;
	}
	
	async getNoCache(name: string, includeCols: boolean = false): Promise<any> {
		let res = await fetch(`https://resttt.glitch.me/api/v1/query/${name}`, {
			method: "GET",
			headers: {
				'Content-Type': "application/json"
			}
		});
		if(res.status != 200) {
			console.log(await res.json());
		}
		let content = await res.json();
		if (includeCols) {
			content = this.withColumns(content);
		}
		return content;
	}

	async get(key: string, includeCols: boolean = false) : Promise<any> {
		let cached = this.cache[key];
		if (!cached || (!cached.cols && includeCols) ) {
			this.cache[key] = await this.getNoCache(key, includeCols);
		}

		return this.cache[key];
	}

	public withColumns(table: Array<any>): any {
		/*
		[{c1: 0, c2: 1}, {c1: 3, c2: 2}]
		to
		{c1: [0, 3], c2: [1,2]}
		*/
		if (table.length == 0) {
			return table;
		}

		let ret: any = table;
		ret.cols = {};
		for (let column of Object.keys(table[0])) {
			ret.cols[column] = table.map(function(row: any) {
		  		return row[column]
			});
	  	}

		return ret;
	}
}
