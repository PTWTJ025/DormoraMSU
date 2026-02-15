// src/app/main/navbar/navbar.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, AdminProfile } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit, OnDestroy {
  menuOpen = false;
  profileDropdownOpen = false;
  currentUser: AdminProfile | null = null;
  private authSubscription: Subscription | undefined;
  currentPath: string = '';
  private routerSub: Subscription | undefined;
  isLoading = true;

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$
      .pipe(
        filter((user) => user !== undefined),
        distinctUntilChanged((prev, curr) => {
          return (
            prev?.uid === curr?.uid &&
            prev?.memberType === curr?.memberType &&
            prev?.photoURL === curr?.photoURL
          );
        })
      )
      .subscribe((user) => {
        if (user && user.memberType === 'admin') {
          this.currentUser = user;
        } else {
          this.currentUser = null;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      });

    this.currentPath = this.router.url;

    this.routerSub = this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        distinctUntilChanged((prev, curr) => {
          return (prev as NavigationEnd)?.url === (curr as NavigationEnd)?.url;
        })
      )
      .subscribe(() => {
        this.currentPath = this.router.url;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.routerSub?.unsubscribe();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleProfileDropdown() {
    this.profileDropdownOpen = !this.profileDropdownOpen;
  }

  closeProfileDropdown() {
    this.profileDropdownOpen = false;
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  getUserType(): 'admin' | null {
    return this.currentUser?.memberType || null;
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return '';
    return this.currentUser.displayName || this.currentUser.email || 'แอดมิน';
  }

  getUserUsername(): string {
    if (!this.currentUser) return '';
    return this.currentUser.username || '';
  }

  getUserPhotoURL(): string | null {
    const photoURL = this.currentUser?.photoURL || null;
    return photoURL;
  }

  getUserAvatarUrl(): string {
    if (this.currentUser?.photoURL) {
      return this.currentUser.photoURL;
    }
    return 'assets/icon/admin-avatar.png';
  }

  async onLogout() {
    try {
      await this.authService.signOut('/admin/login');
    } finally {
      this.closeProfileDropdown();
    }
  }

  goToProfile() {
    // แอดมินไปหน้าแอดมินแทน
    this.router.navigate(['/admin']);
    this.closeProfileDropdown();
  }

  onPhotoLoad() {
    this.cdr.markForCheck();
  }

  onPhotoError() {
    this.cdr.markForCheck();
  }

  shouldShowDormAndMapMenu(): boolean {
    return true; // แสดงเมนูหอพักและแผนที่สำหรับทุกคน
  }

  getHomeLink(): string {
    if (this.isLoggedIn() && this.getUserType() === 'admin') {
      return '/admin';
    }
    return '/main';
  }

  mobileMenuOpen = false;

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
}
