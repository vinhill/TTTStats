import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestttComponent } from './resttt.component';

describe('RestttComponent', () => {
  let component: RestttComponent;
  let fixture: ComponentFixture<RestttComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RestttComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RestttComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
