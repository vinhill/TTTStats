import { Component, Input } from '@angular/core';
import { RestttService } from '../resttt.service';

import { SingleDataSet, Label } from 'ng2-charts';
import { ChartType } from 'chart.js';

@Component({
  selector: 'resttt',
  templateUrl: './resttt.component.html',
  styleUrls: ['./resttt.component.css']
})
export class RestttComponent {
	content: string = "Loading...";
	res: any = null;
	name: string = "";
	
	@Input("name") set setName(name: string) {
		this.name = name;
		this.content = "Loading...";
		this.reload();
	};
	
	async reload() {
		this.res = await this.resttt.get(this.name);
		this.content = JSON.stringify(this.res);
	}

  constructor(private resttt:RestttService) { }
}
