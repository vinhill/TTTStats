import { Component } from '@angular/core';
import { LegendType } from '../resttt-chart/resttt-chart.component';

@Component({
  selector: 'app-recent',
  templateUrl: './recent.component.html',
  styleUrls: ['./recent.component.css']
})
export class RecentComponent {
  LegendType = LegendType;

  matchdate: string = "dd/mm/yyyy";
}