import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  showPassword = false;
  errorMessage: string | null = null;
  showModal = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService,
    private adminService: AdminService,
    private firebaseAuth: Auth
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [true]
    });
  }

  ngOnInit(): void {
    this.checkExistingAuth();
    this.loadRememberedCredentials();
  }

  /**
   * โหลดข้อมูลที่จดจำไว้
   */
  private loadRememberedCredentials(): void {
    const rememberedEmail = localStorage.getItem('adminRememberEmail');
    if (rememberedEmail) {
      this.form.patchValue({
        email: rememberedEmail,
        remember: true
      });
    }
  }

  /**
   * ตรวจสอบว่ามีผู้ใช้ล็อกอินอยู่แล้วหรือไม่
   * ถ้ามี ให้ logout และลบข้อมูล admin ที่อาจเหลืออยู่
   */
  private async checkExistingAuth(): Promise<void> {
    try {
      // ตรวจสอบว่ามี admin profile อยู่แล้วหรือไม่
      const adminProfile = localStorage.getItem('adminProfile');
      if (adminProfile) {
        await this.router.navigate(['/admin']);
        return;
      }

      // ตรวจสอบว่ามีผู้ใช้ล็อกอินอยู่แล้วหรือไม่
      const currentUser = this.firebaseAuth.currentUser;
      if (currentUser) {
        
        // บังคับ logout จาก Firebase
        await signOut(this.firebaseAuth);
        
        // ลบข้อมูลทั้งหมดจาก localStorage
        localStorage.removeItem('userProfile');
        localStorage.removeItem('adminProfile');
        localStorage.removeItem('firebaseToken');
        
        // Minimal: no verbose log
      }
    } catch (error) {
      console.error('[AdminLogin] Error during auth check:', error);
      // ยังคงให้เข้าหน้า admin login ได้แม้เกิด error
    }
  }

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
  
    this.isSubmitting = true;
    this.errorMessage = null;
  
    try {
      const { email, password, remember } = this.form.value;
      
      // ใช้ AuthService method ใหม่สำหรับ admin login
      const adminProfile = await this.auth.signInAdmin(email, password);
      
      // จัดการ "จดจำฉัน"
      if (remember) {
        localStorage.setItem('adminRememberEmail', email);
      } else {
        localStorage.removeItem('adminRememberEmail');
      }
      
      await this.router.navigate(['/admin']);
    } catch (error: any) {
      console.error('Admin login error:', error);
      this.errorMessage = this.auth.errorMessageHandler(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  showContactModal(): void {
    this.showModal = true;
  }

  closeContactModal(): void {
    this.showModal = false;
  }
}


