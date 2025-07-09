import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComprarNodoComponent } from './comprar-nodo.component';

describe('ComprarNodoComponent', () => {
  let component: ComprarNodoComponent;
  let fixture: ComponentFixture<ComprarNodoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComprarNodoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComprarNodoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
