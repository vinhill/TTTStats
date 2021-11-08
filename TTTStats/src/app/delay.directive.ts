import { Directive, Input, OnInit, ElementRef } from '@angular/core';

/* Attribute for DOM Element to make it fade in / fade out after some initial delay */
@Directive({
  selector: '[delay]'
})
export class DelayDirective implements OnInit {

  constructor(private ref: ElementRef) {}

  @Input() delay!: number;

  ngOnInit() {
    setTimeout(() => {
      this.invert();
    }, this.delay);
  }

  invert() {
    if(this.ref.nativeElement.hidden) {
      this.fadeIn();
    }else {
      this.fadeOut();
    }
  }

  // https://stackoverflow.com/questions/6121203/how-to-do-fade-in-and-fade-out-with-javascript-and-css

  fadeOut() {
    let element = this.ref.nativeElement;
    element.style.opacity = 1;

    var op = 1;  // initial opacity
    var timer = setInterval(function () {
        if (op <= 0.1){
            clearInterval(timer);
            element.hidden = true;
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op -= op * 0.1;
    }, 50);
  }

  fadeIn() {
    let element = this.ref.nativeElement;
    element.style.opacity = 0;
    element.hidden = false;

    var op = 0.05;  // initial opacity
    var timer = setInterval(function () {
        if (op >= 1){
            clearInterval(timer);
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op += op * 0.1;
    }, 30);
  }
}
