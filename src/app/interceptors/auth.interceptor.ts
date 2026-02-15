// src/app/interceptors/auth.interceptor.ts
import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpHandlerFn
} from '@angular/common/http';
import { Observable, from, throwError, of } from 'rxjs';
import { switchMap, catchError, retryWhen, mergeMap, delay, take } from 'rxjs/operators';
import { Auth } from '@angular/fire/auth'; // Import Auth from @angular/fire/auth
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

// Function-based interceptor for use with withInterceptors
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const auth = inject(Auth);
  const router = inject(Router);
  const authService = inject(AuthService);

  // ถ้า request ไปยัง backend ของเรา
  if (req.url.startsWith(environment.backendApiUrl)) {
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      return from(authService.refreshToken()).pipe(
        switchMap(idToken => {
          // Clone the request เพื่อเพิ่ม Authorization header
          const clonedRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${idToken}`
            }
          });
          try {
            const role = authService.currentUser$.value?.memberType ?? 'unknown';
            // Only log in development mode and without sensitive data
            
          } catch {}
          return next(clonedRequest);
        }),
        catchError((error) => {
          console.error('[AuthInterceptor] Error getting auth token:', error);
          
          // แยกประเภท error ออกจากกัน - ห้าม retry 400 errors
          if (error instanceof HttpErrorResponse) {
            if (error.status === 400) {
              // 400 Bad Request ไม่ควร retry และไม่เกี่ยวกับ auth
              if (!environment.production) {
                console.log('[AuthInterceptor] 400 Bad Request - not retrying');
              }
              return throwError(() => error);
            }
            // Handle 401 Unauthorized or 403 Forbidden responses
            if (error.status === 401 || error.status === 403) {
              if (!environment.production) {
                console.log('[AuthInterceptor] Token expired or invalid, redirecting to admin login');
              }
              router.navigate(['/admin/login']);
            }
          }
          return throwError(() => error);
        })
      );
    }
    // ไม่มี currentUser ให้ log ไว้สำหรับ debug
    if (!environment.production) {
      console.warn('[AuthInterceptor]', req.method, req.url, '| No current user -> sending without Authorization header');
    }
  }
  
  // ถ้าไม่มี user หรือไม่ใช่ request ไป Backend ของเรา
  return next(req);
}

// Keep the class-based interceptor for backward compatibility
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private auth: Auth, private router: Router, private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip authentication for auth-related endpoints to prevent circular dependencies
    if (request.url.includes('/auth/verify-token')) {
      return next.handle(request);
    }
    
    // ถ้า request ไปยัง backend ของเรา
    if (request.url.startsWith(environment.backendApiUrl)) { // ตรวจสอบ URL ของ Backend
      const currentUser = this.auth.currentUser;
      
      if (currentUser) {
        return from(this.authService.refreshToken()).pipe(
          switchMap(idToken => {
            // Clone the request เพื่อเพิ่ม Authorization header
            const clonedRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${idToken}`
              }
            });
            try {
              const role = this.authService.currentUser$.value?.memberType ?? 'unknown';
              // Only log in development mode and without sensitive data
              if (!environment.production) {
                console.log('[AuthInterceptor:class]', request.method, request.url, '| Attached Authorization Bearer token | role =', role);
              }
            } catch {}
            return next.handle(clonedRequest);
          }),
          catchError((error) => {
            console.error('[AuthInterceptor] Error getting auth token:', error);
            
            if (error instanceof HttpErrorResponse) {
              // แยกประเภท error ออกจากกัน - ห้าม retry 400 errors
              if (error.status === 400) {
                // 400 Bad Request ไม่ควร retry และไม่เกี่ยวกับ auth
                if (!environment.production) {
                  console.log('[AuthInterceptor] 400 Bad Request - not retrying');
                }
                return throwError(() => error);
              }
              // Handle 401 Unauthorized or 403 Forbidden responses
              if (error.status === 401 || error.status === 403) {
                if (!environment.production) {
                  console.log('[AuthInterceptor] Token expired or invalid, redirecting to admin login');
                }
                this.router.navigate(['/admin/login']);
              }
            }
            return throwError(() => error);
          })
        );
      } else {
        // ถ้าไม่มี user หรือ idToken ให้ส่ง request เดิมไป
        return next.handle(request);
      }
    } else {
      // สำหรับ request ที่ไม่ได้ส่งไป Backend ของเรา ให้ส่งไปโดยไม่แก้ไข
      return next.handle(request);
    }
  }
}