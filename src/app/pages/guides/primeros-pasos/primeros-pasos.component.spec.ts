import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrimerosPasosComponent } from './primeros-pasos.component';

describe('PrimerosPasosComponent', () => {
  let component: PrimerosPasosComponent;
  let fixture: ComponentFixture<PrimerosPasosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimerosPasosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrimerosPasosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
