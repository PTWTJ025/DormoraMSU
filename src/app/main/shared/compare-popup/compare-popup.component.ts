import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DormCompareService } from '../../../services/dorm-compare.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-compare-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Compare Popup -->
    <div *ngIf="showPopup" 
         class="fixed bottom-6 right-6 z-50 transform transition-all duration-300 ease-out">
      <div class="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 min-w-[320px]">
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-gray-800">เปรียบเทียบหอพัก</h3>
          <button (click)="hidePopup()" 
                  class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Compare Items List -->
        <div class="space-y-2 mb-4 max-h-48 overflow-y-auto">
          <div *ngFor="let item of compareItems" 
               class="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
            <!-- Image -->
            <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <img [src]="item.image" [alt]="item.name" class="w-full h-full object-cover">
            </div>
            
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-medium text-gray-900 truncate">{{ item.name }}</h4>
              <p class="text-xs text-gray-500 truncate">{{ item.price }}</p>
              <p class="text-xs text-gray-400 truncate">{{ item.zone }}</p>
            </div>
            
            <!-- Remove Button -->
            <button (click)="removeFromCompare(item.id)"
                    class="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-2">
          <!-- Compare Button -->
          <button (click)="goToComparePage()"
                  [disabled]="!canCompare()"
                  class="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <span *ngIf="canCompare(); else singleDormText">เปรียบเทียบ ({{ compareItems.length }})</span>
            <ng-template #singleDormText>
              <span>เลือกหอพักเพิ่ม ({{ compareItems.length }}/5)</span>
            </ng-template>
          </button>
          
          <!-- Clear Button -->
          <button (click)="clearAllCompare()"
                  class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            <span>ล้างตัวเลือก</span>
          </button>
        </div>

        <!-- Info Text -->
        <p class="text-xs text-gray-500 mt-2 text-center">
          <span *ngIf="canCompare(); else needMoreText">พร้อมเปรียบเทียบ {{ compareItems.length }} หอพัก</span>
          <ng-template #needMoreText>
            <span>เลือกหอพักเพิ่มเพื่อเปรียบเทียบ (ขั้นต่ำ 2 หอพัก)</span>
          </ng-template>
        </p>
      </div>
    </div>
  `,
  styles: []
})
export class ComparePopupComponent implements OnInit, OnDestroy {
  showPopup = false;
  compareItems: any[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private dormCompareService: DormCompareService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to show popup state
    this.subscriptions.push(
      this.dormCompareService.showComparePopup$.subscribe(show => {
        this.showPopup = show;
      })
    );

    // Subscribe to compare items
    this.subscriptions.push(
      this.dormCompareService.compareItems$.subscribe(items => {
        this.compareItems = items;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  hidePopup(): void {
    this.dormCompareService.hideComparePopup();
  }

  removeFromCompare(dormId: number): void {
    this.dormCompareService.removeFromCompare(dormId);
  }

  clearAllCompare(): void {
    this.dormCompareService.clearAllCompare();
  }

  goToComparePage(): void {
    this.router.navigate(['/dorm-compare']);
  }

  canCompare(): boolean {
    return this.dormCompareService.canCompare();
  }
}
