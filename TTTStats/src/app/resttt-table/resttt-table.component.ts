import { Component, Input, OnChanges } from '@angular/core';
import { DataStoreService } from '../data-store.service';

@Component({
  selector: 'resttt-table',
  templateUrl: './resttt-table.component.html',
  styleUrls: ['./resttt-table.component.css']
})
export class RestttTableComponent implements OnChanges {
  loaded: boolean = false;
  _result: any;
  _datakeys: string[] = [];
  
  // REST Query
  @Input() query!: string;
  @Input() params: any = {};

  // data key or keys to be displayed
  @Input("datakeys") set datakeysetter(keys: string) {
    this._datakeys = keys.split(",");
  };

  // table column display names
  @Input() cnames: {[key: string] : string} = {};

  constructor(private datastore: DataStoreService) { }

  ngOnChanges() {
    this.load();
  }

  async load() {
    this.loaded = false;
    let res = await this.datastore.get(this.query, this.params);
    this._result = res.rows;
    if (this._datakeys.length == 0) {
      this._datakeys = Object.keys(res.cols);
    }
    this.loaded = true;
  }
}
