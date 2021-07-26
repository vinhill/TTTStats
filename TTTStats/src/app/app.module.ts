import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CardComponent } from './card/card.component';
import { OverviewComponent } from './overview/overview.component';
import { PlayerComponent } from './player/player.component';
import { RestttComponent } from './resttt/resttt.component';

import { ChartsModule } from 'ng2-charts';

@NgModule({
  declarations: [
    AppComponent,
    CardComponent,
    OverviewComponent,
    PlayerComponent,
    RestttComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
		ChartsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
