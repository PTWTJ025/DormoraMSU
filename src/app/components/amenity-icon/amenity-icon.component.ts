import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-amenity-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-2 p-2 rounded-lg">
      <!-- กล่องเช็กสีแดง / เทา (ไม่มี border) -->
      <div
        class="w-4 h-4 rounded flex items-center justify-center"
        [ngClass]="{
          'bg-red-500': available,
          'bg-gray-200': !available
        }"
      >
        <svg
          *ngIf="available"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          class="w-3 h-3 text-white"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879A1 1 0 003.293 9.293l4 4a1 1 0 001.414 0l8-8z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <span
        class="text-sm font-medium select-none"
        [ngClass]="{
          'text-gray-800': available,
          'text-gray-400 line-through': !available
        }"
      >
        {{ name }}
      </span>
    </div>
  `,
  styles: [],
})
export class AmenityIconComponent {
  @Input() name: string = '';
  @Input() available: boolean = true;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
