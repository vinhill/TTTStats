import { Component, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CardComponent } from '../card/card.component';
import { PlottingService } from '../plotting.service';
import { ExecLimiter } from '../utils';
import { LegendType } from '../resttt-chart/resttt-chart.component';

declare var Masonry: any;
declare var ResizeObserver: any;

@Component({
  selector: 'app-recent',
  templateUrl: './recent.component.html',
  styleUrls: ['./recent.component.css']
})
export class RecentComponent {
  LegendType = LegendType;

  masonry: any;
  resizeObserver: ResizeObserver;
  executor: ExecLimiter;

  constructor(private plotting: PlottingService) {
    this.resizeObserver = new ResizeObserver(() => {
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