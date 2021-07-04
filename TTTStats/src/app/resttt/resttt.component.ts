import { Component, Input } from '@angular/core';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'resttt',
  templateUrl: './resttt.component.html',
  styleUrls: ['./resttt.component.css']
})
export class RestttComponent {
	content: string = "Loading...";
	name: string = "";
	
	@Input("name") set setName(name: string) {
		this.name = name;
		this.content = "Loading...";
		this.reload();
	};
	
	async reload() {
		let res = await this.resttt.get(this.name);
		this.content = JSON.stringify(res);
	}

  constructor(private resttt:RestttService) { }
}
