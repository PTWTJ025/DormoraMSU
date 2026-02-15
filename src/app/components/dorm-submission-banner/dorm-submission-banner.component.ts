import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dorm-submission-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="text-gray-800 py-8 px-6 rounded-lg shadow-lg mb-8" style="background: linear-gradient(135deg, #FFCD22 0%, #F59E0B 100%);">
      <div class="max-w-4xl mx-auto text-center">
        <div class="flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mr-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m2.25-18v18m13.5-18v18m2.25-18v18M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v3" />
          </svg>
          <h2 class="text-3xl font-bold">มีหอพักให้เช่าหรือไม่?</h2>
        </div>
        
        <p class="text-xl mb-6 opacity-90">
          ส่งข้อมูลหอพักของคุณให้เราฟรี! ไม่ต้องสมัครสมาชิก ไม่ต้องล็อกอิน
        </p>
        
        <div class="grid md:grid-cols-3 gap-6 mb-8">
          <div class="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mr-3 text-gray-700">
              <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
            <span class="text-lg">ง่ายและรวดเร็ว</span>
          </div>
          <div class="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mr-3 text-gray-700">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <span class="text-lg">ปลอดภัย 100%</span>
          </div>
          <div class="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mr-3 text-gray-700">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            <span class="text-lg">ฟรี ไม่มีค่าใช้จ่าย</span>
          </div>
        </div>
        
        <div class="space-y-4">
          <a 
            routerLink="/dorm-submit"
            class="inline-flex items-center px-8 py-4 bg-white text-gray-800 font-bold text-lg rounded-full hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 mr-3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            ส่งข้อมูลหอพักของคุณ
          </a>
          
          <p class="text-sm opacity-75">
            ทีมงานจะตรวจสอบและเผยแพร่ข้อมูลภายใน 3-5 วันทำการ
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DormSubmissionBannerComponent {
  // ไม่ต้องใช้ environment.googleSheets อีกต่อไป
}