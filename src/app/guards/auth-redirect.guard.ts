import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import {
  map,
  take,
  filter,
  catchError,
  switchMap,
  tap,
  first,
  timeout,
} from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthRedirectGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    return this.authService.currentUser$.pipe(
      filter((user) => user !== undefined),
      timeout(15000),
      first(),
      map((user) => {
        const destPath = route.routeConfig?.path || '';
        const isAdminLoginPage = destPath === 'admin/login' || destPath.startsWith('admin/login') || destPath === 'login' || destPath === 'signin';
        const isAdminPage =
          route.data?.['userType'] === 'admin' ||
          (destPath.startsWith('admin') && !isAdminLoginPage);

        // ===== ADMIN LOGIC =====
        const adminProfile = localStorage.getItem('adminProfile');
        let isAdmin = false;

        if (user && user.memberType === 'admin') {
          isAdmin = true;
        } else if (adminProfile) {
          try {
            const profile = JSON.parse(adminProfile);
            if (profile.memberType === 'admin') {
              isAdmin = true;
            }
          } catch (error) {
            localStorage.removeItem('adminProfile');
            localStorage.removeItem('firebaseToken');
          }
        }

        if (isAdmin) {
          // ถ้าเป็น admin login page ให้ redirect ไป admin dashboard
          if (isAdminLoginPage) {
            return this.router.createUrlTree(['/admin']);
          }
          // อนุญาตทุก admin route (admin, admin/edit/:id เป็นต้น)
          return true;
        }

        // ===== NO ADMIN LOGIC =====
        // ถ้าไม่ใช่ admin และพยายามเข้า admin page ให้ redirect ไป admin login
        if (isAdminPage) {
          return this.router.createUrlTree(['/admin/login']);
        }

        // ถ้าเป็น admin login page หรือหน้าสาธารณะ ให้อนุญาต
        return true;
      }),
      catchError((error) => {
        const destPath = route.routeConfig?.path || '';
        const isAdminLoginPage = destPath === 'admin/login' || destPath.startsWith('admin/login') || destPath === 'login' || destPath === 'signin';
        const isAdminPage =
          route.data?.['userType'] === 'admin' ||
          (destPath.startsWith('admin') && !isAdminLoginPage);

        if (isAdminPage) {
          return of(this.router.createUrlTree(['/admin/login']));
        }
        return of(true);
      }),
    );
  }
}
