import { Component, OnInit } from '@angular/core';
import { RestttService } from './resttt.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'TTTStats';
	results: any = [];
	
	constructor(private resttt:RestttService) {}
	
	async ngOnInit() {
		let roles = await this.resttt.get("PlayerGameCount");
		this.results.push(JSON.stringify(roles));
	}
}