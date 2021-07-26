import { Component, Input, OnInit } from '@angular/core';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'resttt',
  templateUrl: './resttt.component.html',
  styleUrls: ['./resttt.component.css']
})
export class RestttComponent implements OnInit {
  loaded: boolean = false;
  result: any = "";

  @Input() query!: string;
  @Input() display!: string;

  constructor(public resttt: RestttService) { }

  async ngOnInit() {
    this.result = await this.resttt.get(this.query);
    this.loaded = true;
  }

  stringify(obj: any): string {
    return JSON.stringify(obj);
  }

  keys(obj: any): string[] {
    return Object.keys(obj);
  }

}
