import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CardComponent } from './card/card.component';
import { OverviewComponent } from './overview/overview.component';
import { PlayerComponent } from './player/player.component';
import { RestttComponent } from './resttt/resttt.component';
import { RestttTableComponent } from './resttt-table/resttt-table.component';
import { RestttChartComponent } from './resttt-chart/resttt-chart.component';
import { DelayDirective } from './delay.directive';
import { DocsComponent } from './docs/docs.component';

import { NgChartsModule } from 'ng2-charts';

import { PlotlyViaCDNModule } from 'angular-plotly.js';
import { RankingComponent } from './ranking/ranking.component';
PlotlyViaCDNModule.setPlotlyVersion('2.8.0');

@NgModule({
  declarations: [
    AppComponent,
    CardComponent,
    OverviewComponent,
    PlayerComponent,
    RestttComponent,
    DelayDirective,
    DocsComponent,
    RestttTableComponent,
    RestttChartComponent,
    RankingComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
		NgChartsModule,
		PlotlyViaCDNModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
