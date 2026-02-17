// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes'; // ตรวจสอบว่า path ถูกต้อง
import { environment } from '../environments/environment'; // import environment
// Removed client hydration since SSR is not used
import { provideAnimations } from '@angular/platform-browser/animations';
import { LayoutModule } from '@angular/cdk/layout';

// Import the interceptor function
import { authInterceptor } from './interceptors/auth.interceptor';

// สำหรับ Firebase
import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import { getAuth, provideAuth, browserLocalPersistence, initializeAuth, indexedDBLocalPersistence, browserPopupRedirectResolver } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
// import { getDatabase, provideDatabase } from '@angular/fire/database'; // ถ้าคุณใช้ Realtime Database
import { AuthService } from './services/auth.service';

// Factory function to initialize auth state
export function initializeAuthFactory(authService: AuthService) {
  return () => new Promise<void>((resolve) => {
    // ใช้ waitForAuthState แทน checkAuthState เพื่อรอให้ auth state พร้อม
    authService.waitForAuthState()
      .then(() => {
        resolve();
      })
      .catch(error => {
        resolve(); // Resolve anyway to prevent app from hanging
      });
    
    // เพิ่ม timeout เป็น 10 วินาทีเพื่อให้ auth state มีเวลาพร้อม
    setTimeout(() => {
      resolve();
    }, 10000);
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), // สำหรับจัดการ Routing
    provideAnimations(),
    importProvidersFrom(LayoutModule), // เพิ่ม LayoutModule สำหรับ responsive breakpoints
    provideHttpClient(
      withInterceptors([authInterceptor])
    ), // สำหรับ HttpClient ใน AuthService และเพิ่ม AuthInterceptor

    // --- ตั้งค่า Firebase ---
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => {
      const app = getApp();
      const auth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver
      });
      return auth;
    }),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuthFactory,
      deps: [AuthService],
      multi: true
    }
  ]
};