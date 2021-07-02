import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RestttService {
	
	async custom(query: string, password: string): Promise<any> {
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
		return await res.json();
	}
	
	async get(name: string): Promise<any> {
		let res = await fetch(`https://resttt.glitch.me/api/v1/query/${name}`, {
			method: "GET",
			headers: {
				'Content-Type': "application/json"
			}
		});
		return await res.json();
	}
}
