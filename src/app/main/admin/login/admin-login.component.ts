import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { AuthModalService } from '../../../services/auth-modal.service';
import { MainComponent } from '../../main.component';
import { signOut } from '@angular/fire/auth';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MainComponent],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent implements OnInit {
  @Input() isModal = false;
  @Output() close = new EventEmitter<void>();

  form: FormGroup;
  registerForm: FormGroup;
  isSubmitting = false;
  showPassword = false;
  showRegisterPassword = false;
  errorMessage: string | null = null;
  registerSuccessMessage: string | null = null;
  showContactModal = false;
  activeTab: 'login' | 'register' = 'login';

  constructor(
    private fb: FormBuilder,
    public router: Router,
    private auth: AuthService,
    private adminService: AdminService,
    private authModalService: AuthModalService,
    private firebaseAuth: Auth
  ) {
    this.form = this.fb.group({
      identifier: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [true]
    });

    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{9,10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.checkExistingAuth();
    this.loadRememberedCredentials();

    this.authModalService.activeTab$.subscribe(tab => {
      if (tab) this.activeTab = tab;
    });
  }

  /**
   * โหลดข้อมูลที่จดจำไว้
   */
  private loadRememberedCredentials(): void {
    const remembered = localStorage.getItem('dormoraRememberIdentifier');
    if (remembered) {
      this.form.patchValue({
        identifier: remembered,
        remember: true
      });
    }
  }

  /**
   * ตรวจสอบว่ามีผู้ใช้ล็อกอินอยู่แล้วหรือไม่
   */
  private async checkExistingAuth(): Promise<void> {
    try {
      const adminProfile = localStorage.getItem('adminProfile');
      if (adminProfile) {
        await this.router.navigate(['/admin']);
        return;
      }

      const currentUser = this.firebaseAuth.currentUser;
      if (currentUser) {
        await signOut(this.firebaseAuth);
        localStorage.removeItem('userProfile');
        localStorage.removeItem('adminProfile');
        localStorage.removeItem('firebaseToken');
      }
    } catch (error) {
      console.error('[Login] Error during auth check:', error);
    }
  }

  get identifier() { return this.form.get('identifier'); }
  get password() { return this.form.get('password'); }

  setTab(tab: 'login' | 'register'): void {
    this.activeTab = tab;
    this.errorMessage = null;
    this.registerSuccessMessage = null;
  }

  /**
   * ปิด Modal Popup และกลับไปหน้าเดิมหรือหน้าแรก
   */
  onClose(): void {
    this.close.emit();
    this.authModalService.close();
    document.body.style.overflow = '';

    const currentUrl = this.router.url;
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      this.router.navigate(['/']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    try {
      const { identifier, password, remember } = this.form.value;
      const cleanIdentifier = (identifier || '').trim();

      if (remember) {
        localStorage.setItem('dormoraRememberIdentifier', cleanIdentifier);
      } else {
        localStorage.removeItem('dormoraRememberIdentifier');
      }

      const adminProfile = await this.auth.signInAdmin(cleanIdentifier, password);

      if (adminProfile) {
        await this.router.navigate(['/admin']);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage = this.auth.errorMessageHandler(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  async onRegisterSubmit(): Promise<void> {
    if (this.registerForm.invalid || this.isSubmitting) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    this.registerSuccessMessage = null;

    try {
      // Mock registration or future Supabase auth sign-up
      this.registerSuccessMessage = 'ส่งคำขอสมัครสมาชิกสำเร็จแล้ว! ระบบกำลังเชื่อมต่อบัญชีของคุณ';
      setTimeout(() => {
        this.activeTab = 'login';
        this.form.patchValue({ identifier: this.registerForm.value.email });
      }, 1500);
    } catch (error: any) {
      this.errorMessage = 'เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง';
    } finally {
      this.isSubmitting = false;
    }
  }

  loginWithLine(): void {
    this.errorMessage = 'ระบบเข้าสู่ระบบด้วย LINE อยู่ระหว่างการเปิดใช้งาน (กรุณาใช้บัญชีหลัก หรือติดต่อแอดมินทาง LINE OA)';
  }

  loginWithGoogle(): void {
    this.errorMessage = 'ระบบเข้าสู่ระบบด้วย Google อยู่ระหว่างการเปิดใช้งาน';
  }

  loginWithFacebook(): void {
    this.errorMessage = 'ระบบเข้าสู่ระบบด้วย Facebook อยู่ระหว่างการเปิดใช้งาน';
  }

  openContactModal(): void {
    this.showContactModal = true;
  }

  closeContactModal(): void {
    this.showContactModal = false;
  }
}


