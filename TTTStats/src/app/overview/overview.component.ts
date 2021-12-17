import { Component, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CardComponent } from '../card/card.component';
import { ExecLimiter } from '../utils';

declare var Masonry: any;
declare var ResizeObserver: any;

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent {
  masonry: any;
  resizeObserver: ResizeObserver;
  executor: ExecLimiter;

  constructor() {
    this.resizeObserver = new ResizeObserver((entries: any) => {
      this.executor.requestExec();
    });
    this.executor = new ExecLimiter(() => {
      this.relayout();
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

  relayout() {
    this.masonry.layout();
  }
}