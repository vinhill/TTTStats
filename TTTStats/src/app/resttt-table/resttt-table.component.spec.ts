import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestttTableComponent } from './resttt-table.component';

describe('RestttTableComponent', () => {
  let component: RestttTableComponent;
  let fixture: ComponentFixture<RestttTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RestttTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RestttTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
