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
    this.resttt.baseURL.subscribe({next: (url) => {
      this.restURL = url;
      this.loadApiData();
    }});
  }
  
  ngOnInit() {
    this.loadApiData();
  }

  loadApiData() {
    this.datastore.Players()
      .then(res => this.players = res)
      .catch(e => console.error("Error loading players: " + e));
  }

  setRestUrl() {
    this.resttt.baseURL.next(this.restUrlInput.nativeElement.value);
  }
}