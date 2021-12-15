import { Component, OnInit } from '@angular/core';
import { DataStoreService } from './data-store.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  players: Array<string> = [];
  
  constructor(private datastore: DataStoreService) {}
  
  async ngOnInit() {
	  // TODO remove all any and type them correctly
	  let res = await this.datastore.get("Players");
	  this.players = res.cols.name;
  }
}