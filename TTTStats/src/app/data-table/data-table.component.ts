import { Component, Input } from '@angular/core';

@Component({
  selector: 'data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent {
  @Input() data!: any[];
  @Input() headers: {[key: string] : string} = {};
  @Input("columns") _columns: string = "";

  get columns() {
    if (this._columns == "" && this.data.length > 0)
      return Object.keys(this.data[0]);
    else
      return this._columns.split(",").map(s => s.trim());
  }
}
