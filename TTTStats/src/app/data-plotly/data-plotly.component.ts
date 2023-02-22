import { Component, ElementRef, Input } from '@angular/core';

@Component({
  selector: 'data-plotly',
  templateUrl: './data-plotly.component.html',
  styleUrls: ['./data-plotly.component.css']
})
export class DataPlotlyComponent {
  @Input() data!: any[];
  @Input() layout?: any = {margin: {l: 0, r: 0, b: 0, t:0}, autosize: true};

  constructor(private element: ElementRef) { }

  plotlyResizeWorkaround() {
    // workaround for plotly svm-container not taking the height of its child
    let container = this.element.nativeElement.querySelector(".svg-container");
    if (container) {
        container.style.height = container.firstChild.clientHeight+"px";
    }
  }
}
