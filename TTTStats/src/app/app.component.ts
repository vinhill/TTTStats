import { Component, ElementRef, OnInit, ViewChild, isDevMode } from '@angular/core';
import { DataStoreService } from './data-store.service';
import { RestttService } from './resttt.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  players: Array<string> = [];
  restURL: string;
  isDevMode: boolean = isDevMode();
  
  @ViewChild('restUrlInput') restUrlInput!: ElementRef;

  constructor(private datastore: DataStoreService, private resttt: RestttService) {
    this.restURL = resttt.baseURL.getValue();
    this.resttt.baseURL.subscribe((url) => this.restURL = url);
  }
  
  async ngOnInit() {
    this.players = await this.datastore.Players();
  }

  setRestUrl() {
    this.resttt.baseURL.next(this.restUrlInput.nativeElement.value);
  }
}