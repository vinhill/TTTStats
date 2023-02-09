import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CardComponent } from './card/card.component';
import { OverviewComponent } from './overview/overview.component';
import { RecentComponent } from './recent/recent.component';
import { RankingComponent } from './ranking/ranking.component';
import { PlayerComponent } from './player/player.component';
import { DataTableComponent } from './data-table/data-table.component';
import { DataChartComponent } from './data-chart/data-chart.component';
import { DataPlotlyComponent } from './data-plotly/data-plotly.component';
import { FadeDirective } from './fade.directive';
import { DocsComponent } from './docs/docs.component';

import { NgChartsModule } from 'ng2-charts';

import { PlotlyViaCDNModule } from 'angular-plotly.js';

PlotlyViaCDNModule.setPlotlyVersion('2.8.0');

@NgModule({
  declarations: [
    AppComponent,
    CardComponent,
    OverviewComponent,
    RecentComponent,
    PlayerComponent,
    FadeDirective,
    DocsComponent,
    DataTableComponent,
    DataChartComponent,
    DataPlotlyComponent,
    RankingComponent,
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
