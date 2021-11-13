import { Component, Input } from '@angular/core';

@Component({
  selector: 'card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent {
  @Input() title!: string;

  classes: string = "";

  constructor() {
    // Default value
    this.size = "medium";
  }

  @Input() set size(size: string) {
    if (size == "tiny") {
      this.classes = "col-6 col-md-4 col-lg-3 col-xl-2";
    } else if (size == "small") {
      this.classes = "col-6 col-md-6 col-lg-4 col-xl-3";
    } else if (size == "medium") {
      this.classes = "col-12 col-md-8 col-lg-6 col-xl-4";
    } else if(size == "large") {
      this.classes = "col-12 col-lg-8 col-xl-6";
    }else if (size == "xlarge") {
      this.classes = "col-lg-12 col-xl-8";
    }
  }
}
