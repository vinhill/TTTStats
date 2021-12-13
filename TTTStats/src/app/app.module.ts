import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CardComponent } from './card/card.component';
import { OverviewComponent } from './overview/overview.component';
import { PlayerComponent } from './player/player.component';
import { RestttComponent } from './resttt/resttt.component';
import { DelayDirective } from './delay.directive';
import { DocsComponent } from './docs/docs.component';

import { ChartsModule } from 'ng2-charts';

//import * as PlotlyJS from 'plotly.js-dist-min';
//import { PlotlyModule } from 'angular-plotly.js';
//PlotlyModule.plotlyjs = PlotlyJS;

import { PlotlyViaCDNModule } from 'angular-plotly.js';
PlotlyViaCDNModule.setPlotlyVersion('2.8.0');

@NgModule({
  declarations: [
    AppComponent,
    CardComponent,
    OverviewComponent,
    PlayerComponent,
    RestttComponent,
    DelayDirective,
    DocsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
		ChartsModule,
    //PlotlyModule,
		PlotlyViaCDNModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
