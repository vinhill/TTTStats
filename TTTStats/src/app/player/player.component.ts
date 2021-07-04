import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css', '../masonry.css']
})
export class PlayerComponent implements OnInit {
  name: string = "";

  constructor(private route:ActivatedRoute) { }

  ngOnInit(): void {
	this.route.params.subscribe(params => {
		this.setPlayerName(params.name);
	});
  }
  
  setPlayerName(name: string) {
	  this.name = name;
  }

}
