import { Injectable } from '@angular/core';
import { RestttService } from './resttt.service';

@Injectable({
  providedIn: 'root'
})
export class DatastoreService {

  constructor(private resttt: RestttService) { }
}
