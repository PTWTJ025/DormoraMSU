import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DormCompareComponent } from './dorm-compare.component';

describe('DormCompareComponent', () => {
  let component: DormCompareComponent;
  let fixture: ComponentFixture<DormCompareComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DormCompareComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DormCompareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
