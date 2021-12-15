import { Component, OnInit, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardComponent } from '../card/card.component';
import { DataStoreService } from '../data-store.service';
import { ExecLimiter } from '../utils';

declare var Masonry: any;
declare var ResizeObserver: any;

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements OnInit {
  name: string = "";
  rounds: number | undefined;
  kills: number | undefined;
  teamkills: number | undefined;

  masonry: any;
  resizeObserver: ResizeObserver;
  executor: ExecLimiter;

  constructor(private route: ActivatedRoute, private datastore: DataStoreService) {
    this.resizeObserver = new ResizeObserver((entries: any) => {
      this.executor.requestExec();
    });
    this.executor = new ExecLimiter(() => {
      this.masonry.layout();
    });
  }

  @ViewChild('masonry')
  set initMasonry(elem: any) {
    this.masonry = new Masonry(elem.nativeElement, {
      itemSelector: '.masonry-item',
    });
  }

  @ViewChildren(CardComponent, {read: ElementRef})
  set observeCards(cards: QueryList<ElementRef>) {
    for (let child of cards) {
      this.resizeObserver.observe(child.nativeElement.firstChild);
    }
  };

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.setPlayerName(params.name);
      this.load();
    });
  }

  setPlayerName(name: string) {
	  this.name = name;
  }

  async load() {
    this.rounds = await this.datastore.PlayerGameCount(this.name);
    let killdata = await this.datastore.PlayerKillStats(this.name);
    this.kills = killdata.kills;
    this.teamkills = killdata.wrong;
  }
}
