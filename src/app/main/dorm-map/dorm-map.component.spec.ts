import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DormMapComponent } from './dorm-map.component';

describe('DormMapComponent', () => {
  let component: DormMapComponent;
  let fixture: ComponentFixture<DormMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DormMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DormMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
