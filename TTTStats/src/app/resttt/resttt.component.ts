import { Component, OnInit, Input } from '@angular/core';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'resttt',
  templateUrl: './resttt.component.html',
  styleUrls: ['./resttt.component.css']
})
export class RestttComponent implements OnInit {
	content: string = "Loading...";
	
	@Input() name!: string;

  constructor(private resttt:RestttService) { }

  async ngOnInit() {
		let res = await this.resttt.get(this.name);
		this.content = JSON.stringify(res);
  }

}
