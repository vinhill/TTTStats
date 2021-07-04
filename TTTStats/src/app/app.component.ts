import { Component, OnInit } from '@angular/core';
import { RestttService } from './resttt.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  players: Array<string> = [];
  
  constructor(private resttt:RestttService) {}
  
  async ngOnInit() {
	  // TODO remove all any and type them correctly
	  let res = await this.resttt.get("Players");
	  this.players = res.map(function(p:any){
		  return p.name;
	  });
  }
}