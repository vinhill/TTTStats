import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestttChartComponent } from './resttt-chart.component';

describe('RestttChartComponent', () => {
  let component: RestttChartComponent;
  let fixture: ComponentFixture<RestttChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RestttChartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RestttChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
