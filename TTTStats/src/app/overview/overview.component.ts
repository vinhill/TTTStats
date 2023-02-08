import { Component } from '@angular/core';
import { LegendType } from '../resttt-chart/resttt-chart.component';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent {
  LegendType = LegendType;

}