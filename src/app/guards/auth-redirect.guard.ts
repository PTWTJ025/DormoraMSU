import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, take, filter, catchError, switchMap, tap, first, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthRedirectGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    return this.authService.currentUser$.pipe(
      filter(user => user !== undefined),
      timeout(15000),
      first(),
      map(user => {
        const destPath = route.routeConfig?.path || '';
        const isAdminPage = destPath === 'admin';
        const isAdminLoginPage = destPath === 'admin/login';

        // ===== ADMIN LOGIC =====
        const adminProfile = localStorage.getItem('adminProfile');
        if (adminProfile) {
          try {
            const profile = JSON.parse(adminProfile);
            if (profile.memberType === 'admin') {
              // ถ้าเป็น admin page ให้อนุญาต
              if (isAdminPage) {
                return true;
              }
              
              // ถ้าเป็น admin login page ให้ redirect ไป admin
              if (isAdminLoginPage) {
                return this.router.createUrlTree(['/admin']);
              }
              
              // สำหรับหน้าอื่นๆ ให้ redirect ไป admin
              return this.router.createUrlTree(['/admin']);
            }
          } catch (error) {
            localStorage.removeItem('adminProfile');
            localStorage.removeItem('firebaseToken');
          }
        }

        // ===== NO ADMIN LOGIC =====
        // ถ้าไม่ใช่ admin และพยายามเข้า admin page ให้ redirect ไป admin login
        if (isAdminPage) {
          return this.router.createUrlTree(['/admin/login']);
        }

        // ถ้าเป็น admin login page ให้อนุญาต
        if (isAdminLoginPage) {
          return true;
        }

        // สำหรับหน้าอื่นๆ ให้อนุญาต (หน้าสาธารณะ)
        return true;
      }),
      catchError(error => {
        // In case of error, allow access (default behavior)
        return of(true);
      })
    );
  }
}