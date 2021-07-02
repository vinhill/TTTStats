import { TestBed } from '@angular/core/testing';

import { RestttService } from './resttt.service';

describe('RestttService', () => {
  let service: RestttService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RestttService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
