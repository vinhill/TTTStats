import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocsComponent } from './docs/docs.component';
import { OverviewComponent } from './overview/overview.component';
import { PlayerComponent } from './player/player.component';
import { RankingComponent } from './ranking/ranking.component';

const routes: Routes = [
  // Default route
  { path: '', redirectTo: '/overview', pathMatch: 'full' },
  { path: 'overview', component: OverviewComponent },
  { path: 'ranking', component: RankingComponent },
  { path: 'docs', component: DocsComponent },
  { path: 'player/:name', component: PlayerComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
