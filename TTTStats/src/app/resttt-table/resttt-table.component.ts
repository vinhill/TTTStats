import { Component, Input, OnChanges } from '@angular/core';
import { RestttService } from '../resttt.service';

@Component({
  selector: 'resttt-table',
  templateUrl: './resttt-table.component.html',
  styleUrls: ['./resttt-table.component.css']
})
export class RestttTableComponent implements OnChanges {
  loaded: boolean = false;
  _result: any;
  
  // REST Query
  @Input() query!: string;

  // data key or keys to be displayed
  @Input() datakeys: string[] = [];

  // table column display names
  @Input() cnames: {[key: string] : string} = {};

  constructor(private resttt: RestttService) { }

  ngOnChanges() {
    this.load();
  }

  async load() {
    this.loaded = false;
    this._result = await this.resttt.get(this.query, true);
    this.loaded = true;
  }
}
