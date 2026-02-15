import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Auth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from '@angular/fire/auth';
import { Router } from '@angular/router';

export interface AdminProfile {
  uid: string;
  id: number;
  email: string;
  username: string;
  displayName: string | null;
  photoURL?: string | null;
  memberType: 'admin';
  provider?: 'password';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private backendUrl = environment.backendApiUrl;

  // *** Centralized User Session State ***
  public currentUser$ = new BehaviorSubject<AdminProfile | null | undefined>(
    undefined,
  );

  // *** ป้องกัน currentUser$ race condition ***
  private currentUserUpdateQueue: Promise<void> = Promise.resolve();

  // เพิ่ม flag เพื่อติดตามสถานะการโหลด auth state
  private authStateInitialized = false;
  private authStatePromise: Promise<void> | null = null;

  // *** Centralized Auth State Management ***
  private authState = {
    skipAuthStateChange: false,
    isRefreshingToken: false,
    isInitializing: false,
  };

  // Promise-based token refresh to prevent multiple simultaneous calls
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private router: Router,
  ) {
    this.initializeAuthState();
  }

  // Public controls for temporarily pausing/resuming auth state broadcasting
  public pauseAuthStateChange(): void {
    this.authState.skipAuthStateChange = true;
  }

  public resumeAuthStateChange(): void {
    this.authState.skipAuthStateChange = false;
  }

  // *** Method สำหรับ update currentUser$ แบบ queue เพื่อป้องกัน race condition ***
  private async updateCurrentUserSafely(
    adminProfile: AdminProfile | null | undefined,
  ): Promise<void> {
    this.currentUserUpdateQueue = this.currentUserUpdateQueue.then(async () => {
      this.currentUser$.next(adminProfile);
      // เพิ่ม delay เล็กน้อยเพื่อให้ UI มีเวลา update
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    return this.currentUserUpdateQueue;
  }

  // เพิ่ม method สำหรับ initialize auth state
  private initializeAuthState(): void {
    if (this.authStatePromise) {
      return; // กำลัง initialize อยู่แล้ว
    }

    this.authStatePromise = new Promise<void>((resolve) => {
      onAuthStateChanged(this.auth, async (user) => {
        // *** Centralized Auth State Check ***
        if (this.authState.skipAuthStateChange) {
          this.authState.skipAuthStateChange = false;
          return;
        }

        if (this.authState.isInitializing) {
          return;
        }

        try {
          // ตรวจสอบว่าเป็น admin หรือไม่
          const adminProfile = localStorage.getItem('adminProfile');
          if (adminProfile && user) {
            try {
              const profile = JSON.parse(adminProfile);
              if (profile.memberType === 'admin') {
                const adminData: AdminProfile = {
                  uid: user.uid,
                  id: profile.id,
                  email: user.email || '',
                  username: profile.username || '',
                  displayName: profile.displayName || user.displayName || null,
                  photoURL: user.photoURL || null,
                  memberType: 'admin',
                  provider: 'password',
                };
                await this.updateCurrentUserSafely(adminData);
                return;
              }
            } catch (error) {
              console.error(
                '[AuthService] Error parsing admin profile:',
                error,
              );
              localStorage.removeItem('adminProfile');
            }
          }

          // ถ้าไม่ใช่ admin ให้ sign out
          if (user) {
            await this.auth.signOut();
          }
          await this.updateCurrentUserSafely(null);
        } catch (error) {
          console.error('[AuthService] Error in auth state change:', error);
          // ไม่ set currentUser$ เป็น null เมื่อเกิด error เพื่อป้องกันการ redirect
          // ให้รอ auth state ถูกต้องก่อน
        } finally {
          if (!this.authStateInitialized) {
            this.authStateInitialized = true;
            resolve();
          }
        }
      });
    });
  }

  // เพิ่ม method สำหรับรอให้ auth state พร้อม
  async waitForAuthState(): Promise<void> {
    if (this.authStatePromise) {
      await this.authStatePromise;
    }
  }

  // เพิ่ม method สำหรับ refresh token
  async refreshToken(forceRefresh = false): Promise<string> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return Promise.reject('No authenticated user');
    }

    // *** ป้องกัน multiple simultaneous token refresh calls ***
    if (this.authState.isRefreshingToken && this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    // สร้าง promise ใหม่สำหรับ refresh token
    this.authState.isRefreshingToken = true;
    this.tokenRefreshPromise = new Promise<string>((resolve, reject) => {
      try {
        currentUser
          .getIdToken(forceRefresh)
          .then((token) => {
            resolve(token);
          })
          .catch((error) => {
            reject(error);
          })
          .finally(() => {
            this.authState.isRefreshingToken = false;
            this.tokenRefreshPromise = null;
          });
      } catch (error) {
        this.authState.isRefreshingToken = false;
        this.tokenRefreshPromise = null;
        reject(error);
      }
    });

    return this.tokenRefreshPromise;
  }

  // เพิ่ม method สำหรับตรวจสอบสถานะ token
  async verifyToken(): Promise<boolean> {
    try {
      const token = await this.refreshToken(false);
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

      const response = await this.http
        .get<{
          valid: boolean;
        }>(`${this.backendUrl}/auth/verify-token`, { headers })
        .toPromise();
      return response?.valid || false;
    } catch (error) {
      return false;
    }
  }

  // *** Core Authentication Methods ***

  /**
   * เข้าสู่ระบบแอดมินด้วย Email/Password
   */
  async signInAdmin(email: string, password: string): Promise<AdminProfile> {
    try {
      // ป้องกัน onAuthStateChanged ดึง profile ก่อนจะตรวจสอบประเภทผู้ใช้
      this.authState.skipAuthStateChange = true;

      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password,
      );
      const user = userCredential.user;

      // ตรวจสอบว่าเป็น admin จาก backend
      const idToken = await user.getIdToken();
      const headers = new HttpHeaders().set(
        'Authorization',
        `Bearer ${idToken}`,
      );

      const response = await this.http
        .get<any>(`${this.backendUrl}/auth/admin/me`, { headers })
        .toPromise();

      // Debug: ดูว่า Backend ส่งอะไรกลับมา
      console.log('🔍 Backend response:', response);

      // Backend ส่ง memberType: 'admin' มา
      if (!response || response.memberType !== 'admin') {
        console.error('❌ Admin verification failed:', {
          hasResponse: !!response,
          memberType: response?.memberType,
          fullResponse: response
        });
        await this.signOut(null);
        throw new Error('คุณไม่มีสิทธิ์เข้าถึงระบบแอดมิน');
      }

      const adminProfile: AdminProfile = {
        uid: user.uid,
        id: response.id,
        email: user.email || '',
        username: response.username || '',
        displayName: response.displayName || user.displayName || null,
        photoURL: user.photoURL || null,
        memberType: 'admin',
        provider: 'password',
      };

      // เก็บข้อมูล admin ใน localStorage
      localStorage.setItem('adminProfile', JSON.stringify(adminProfile));

      // อัปเดต currentUser$ ด้วยข้อมูลที่ถูกต้อง
      this.currentUser$.next(adminProfile);

      return adminProfile;
    } catch (error: any) {
      throw error;
    } finally {
      // ปลดล็อคให้ onAuthStateChanged กลับมาทำงานตามปกติ
      this.authState.skipAuthStateChange = false;
    }
  }

  /**
   * ออกจากระบบ
   */
  async signOut(redirectTo: string | Router | null = null): Promise<void> {
    try {
      // Reset all flags before signing out
      this.authState.skipAuthStateChange = true;

      // ลบข้อมูล admin จาก localStorage
      localStorage.removeItem('adminProfile');
      localStorage.removeItem('firebaseToken');

      await this.auth.signOut();
      this.currentUser$.next(null);

      if (redirectTo) {
        if (redirectTo instanceof Router) {
          await redirectTo.navigate(['/admin/login']);
        } else {
          await this.router.navigate([redirectTo]);
        }
      }
    } catch (error) {
      console.error('[AuthService] Error signing out:', error);
      throw error;
    }
  }

  // *** User Profile Management ***

  /**
   * ตรวจสอบสถานะการเข้าสู่ระบบเมื่อแอปเริ่มทำงาน
   */
  async checkAuthState(): Promise<AdminProfile | null> {
    if (!environment.production) {
    }

    // รอให้ auth state initialize เสร็จก่อน
    await this.waitForAuthState();

    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      this.currentUser$.next(null);
      return null;
    }

    try {
      // ลอง refresh token ก่อน
      try {
        await this.refreshToken(true);
      } catch (tokenError) {}

      // ตรวจสอบว่าเป็น admin
      const adminProfile = localStorage.getItem('adminProfile');
      if (adminProfile) {
        try {
          const profile = JSON.parse(adminProfile);
          if (profile.memberType === 'admin') {
            const adminData: AdminProfile = {
              uid: currentUser.uid,
              id: profile.id,
              email: currentUser.email || '',
              username: profile.username || '',
              displayName:
                profile.displayName || currentUser.displayName || null,
              photoURL: currentUser.photoURL || null,
              memberType: 'admin',
              provider: 'password',
            };
            this.currentUser$.next(adminData);
            return adminData;
          }
        } catch (error) {
          console.error('[AuthService] Error parsing admin profile:', error);
          localStorage.removeItem('adminProfile');
        }
      }

      // ถ้าไม่ใช่ admin ให้ sign out
      await this.auth.signOut();
      this.currentUser$.next(null);
      return null;
    } catch (error) {
      console.error('[AuthService] Error checking auth state:', error);
      return null;
    }
  }

  // *** Utility Methods ***

  /**
   * อัปเดตข้อมูลผู้ใช้ใน currentUser$ (สำหรับ external services)
   */
  updateCurrentUser(adminProfile: AdminProfile | null): void {
    this.updateCurrentUserSafely(adminProfile);
  }

  /**
   * ดึงข้อมูลผู้ใช้ปัจจุบันแบบ sync
   */
  getCurrentUser(): AdminProfile | null | undefined {
    return this.currentUser$.value;
  }

  /**
   * ตรวจสอบว่ามีผู้ใช้ล็อกอินอยู่หรือไม่
   */
  isAuthenticated(): boolean {
    const user = this.currentUser$.value;
    return user !== null && user !== undefined;
  }

  /**
   * ตรวจสอบว่าเป็นแอดมินหรือไม่
   */
  isAdmin(): boolean {
    const user = this.currentUser$.value;
    return user?.memberType === 'admin';
  }

  // *** Error Handling ***

  /**
   * จัดการข้อความ error ให้เป็นภาษาไทย
   */
  errorMessageHandler(error: any): string {
    // Firebase authentication errors
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          return 'ไม่พบบัญชีผู้ใช้นี้ในระบบ';
        case 'auth/wrong-password':
          return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        case 'auth/invalid-email':
          return 'รูปแบบอีเมลไม่ถูกต้อง';
        case 'auth/too-many-requests':
          return 'มีการพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ในภายหลัง';
        default:
          return `เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ${error.message}`;
      }
    }

    // Backend API errors
    if (error.status) {
      switch (error.status) {
        case 400:
          return error.error?.message || 'ข้อมูลไม่ถูกต้อง';
        case 401:
          return 'ไม่ได้รับอนุญาตให้เข้าถึงข้อมูล';
        case 403:
          return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
        case 404:
          return 'ไม่พบข้อมูลที่ต้องการ';
        case 429:
          return 'มีการส่งคำขอมากเกินไป กรุณาลองใหม่ในภายหลัง';
        case 500:
        case 501:
        case 502:
        case 503:
          return 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่ในภายหลัง';
        default:
          return (
            error.error?.message ||
            error.message ||
            'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
          );
      }
    }

    // Custom error messages from our backend
    if (error.message) {
      return error.message;
    }

    // Generic error
    return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองอีกครั้ง';
  }
}
