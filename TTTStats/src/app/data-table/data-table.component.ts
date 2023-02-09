import { Component, Input, OnChanges } from '@angular/core';
import { DataStoreService } from '../data-store.service';
import { Dataframe } from '../dataframe';

@Component({
  selector: 'data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent implements OnChanges {
  loaded: boolean = false;
  _result: any[] = [];
  
  @Input() query!: string;
  @Input() params: any = {};
  @Input() headers: {[key: string] : string} = {};
  @Input("columns") _columns: string = "";

  get columns() {
    if (this._columns == "" && this._result.length > 0)
      return Object.keys(this._result[0]);
    else
      return this._columns.split(",").map(s => s.trim());
  }

  constructor(private datastore: DataStoreService) { }

  ngOnChanges() {
    this.load();
  }

  async load() {
    this.loaded = false;
    this._result = await this.datastore.get(this.query, this.params);
    this.loaded = true;
  }
}
