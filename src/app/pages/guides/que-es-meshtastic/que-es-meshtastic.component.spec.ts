import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueEsMeshtasticComponent } from './que-es-meshtastic.component';

describe('QueEsMeshtasticComponent', () => {
  let component: QueEsMeshtasticComponent;
  let fixture: ComponentFixture<QueEsMeshtasticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueEsMeshtasticComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QueEsMeshtasticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
