import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, OnDestroy {
  // Tab Management
  selectedTab: 'submissions' | 'duplicates' | 'approved' | 'review' | 'edit' = 'submissions';

  // Data Properties
  allSubmissions: any[] = [];
  filteredSubmissions: any[] = [];
  duplicateGroups: any[] = [];
  reviewSubmissionDetail: any | null = null;

  // Statistics
  totalSubmissions = 0;
  pendingSubmissions = 0;
  approvedSubmissions = 0;
  rejectedSubmissions = 0;
  duplicateCount = 0;

  // UI State
  isLoading = false;
  errorMessage = '';
  adminName = 'Admin';

  // Toast Properties
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  profileDropdownOpen = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];
  private backendUrl = environment.backendApiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAdminProfile();
    this.loadData();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // --- Data Loading Methods ---
  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load submissions from API
    this.http.get<any>(`${this.backendUrl}/admin/submissions`)
      .subscribe({
        next: (response) => {
          this.allSubmissions = response.data || [];
          this.updateFilteredSubmissions();
          this.updateStatistics();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading submissions:', error);
          this.errorMessage = 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
          this.isLoading = false;
        }
      });
  }

  setupSubscriptions(): void {
    // Subscriptions setup if needed for real-time updates
  }

  updateFilteredSubmissions(): void {
    switch (this.selectedTab) {
      case 'submissions':
        this.filteredSubmissions = this.allSubmissions.filter(s => s.status === 'pending');
        break;
      case 'approved':
        this.filteredSubmissions = this.allSubmissions.filter(s => s.status === 'approved');
        break;
      default:
        this.filteredSubmissions = this.allSubmissions;
    }
  }

  updateStatistics(): void {
    this.totalSubmissions = this.allSubmissions.length;
    this.pendingSubmissions = this.allSubmissions.filter(s => s.status === 'pending').length;
    this.approvedSubmissions = this.allSubmissions.filter(s => s.status === 'approved').length;
    this.rejectedSubmissions = this.allSubmissions.filter(s => s.status === 'rejected').length;
  }

  // --- Tab Management ---
  setTab(tab: 'submissions' | 'duplicates' | 'approved' | 'review' | 'edit'): void {
    this.selectedTab = tab;
    this.updateFilteredSubmissions();
  }

  // --- Submission Review ---
  reviewSubmission(submissionId: string): void {
    const submission = this.allSubmissions.find(s => s.id === submissionId);
    if (submission) {
      this.reviewSubmissionDetail = submission;
      this.selectedTab = 'review';
    }
  }

  cancelReviewSubmission(): void {
    this.reviewSubmissionDetail = null;
    this.selectedTab = 'submissions';
  }

  approveSubmission(): void {
    if (!this.reviewSubmissionDetail) return;

    this.http.put<any>(
      `${this.backendUrl}/admin/submissions/${this.reviewSubmissionDetail.submission_id}/approve`,
      {}
    ).subscribe({
      next: () => {
        this.showToastNotification('อนุมัติข้อมูลเรียบร้อยแล้ว', 'success');
        this.cancelReviewSubmission();
        this.loadData();
      },
      error: (error) => {
        console.error('Error approving submission:', error);
        this.showToastNotification('เกิดข้อผิดพลาดในการอนุมัติ', 'error');
      }
    });
  }

  rejectSubmission(): void {
    if (!this.reviewSubmissionDetail) return;

    const reason = prompt('กรุณาระบุเหตุผลในการไม่อนุมัติ:');
    if (reason === null) return;

    this.http.put<any>(
      `${this.backendUrl}/admin/submissions/${this.reviewSubmissionDetail.submission_id}/reject`,
      { rejection_reason: reason }
    ).subscribe({
      next: () => {
        this.showToastNotification('ไม่อนุมัติข้อมูลเรียบร้อยแล้ว', 'success');
        this.cancelReviewSubmission();
        this.loadData();
      },
      error: (error) => {
        console.error('Error rejecting submission:', error);
        this.showToastNotification('เกิดข้อผิดพลาดในการไม่อนุมัติ', 'error');
      }
    });
  }

  approveAndPublishSubmission(): void {
    if (!this.reviewSubmissionDetail) return;

    this.http.put<any>(
      `${this.backendUrl}/admin/submissions/${this.reviewSubmissionDetail.submission_id}/approve`,
      {}
    ).subscribe({
      next: () => {
        this.showToastNotification('อนุมัติและเผยแพร่ข้อมูลเรียบร้อยแล้ว', 'success');
        this.cancelReviewSubmission();
        this.loadData();
      },
      error: (error) => {
        console.error('Error approving and publishing:', error);
        this.showToastNotification('เกิดข้อผิดพลาดในการเผยแพร่', 'error');
      }
    });
  }

  editSubmission(): void {
    // TODO: Implement edit functionality
    this.showToastNotification('ฟีเจอร์แก้ไขข้อมูลจะพัฒนาในเวอร์ชันถัดไป', 'info');
  }

  // --- Duplicate Management ---
  selectDuplicateGroup(group: any): void {
    this.showToastNotification('ฟีเจอร์เปรียบเทียบข้อมูลซ้ำจะพัฒนาในเวอร์ชันถัดไป', 'info');
  }

  mergeDuplicateSubmissions(groupId: string, primarySubmissionId: string): void {
    const confirmed = confirm('คุณต้องการรวมข้อมูลซ้ำนี้หรือไม่?');
    if (!confirmed) return;

    this.http.post<any>(
      `${this.backendUrl}/admin/submissions/merge-duplicates`,
      { groupId, primarySubmissionId }
    ).subscribe({
      next: () => {
        this.showToastNotification('รวมข้อมูลซ้ำเรียบร้อยแล้ว', 'success');
        this.loadData();
      },
      error: (error) => {
        console.error('Error merging duplicates:', error);
        this.showToastNotification('เกิดข้อผิดพลาดในการรวมข้อมูล', 'error');
      }
    });
  }

  // --- Utility Methods ---
  getSubmissionStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getSubmissionStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'รอตรวจสอบ';
      case 'approved':
        return 'อนุมัติแล้ว';
      case 'rejected':
        return 'ไม่อนุมัติ';
      default:
        return 'ไม่ทราบสถานะ';
    }
  }

  formatPrice(price: number): string {
    if (!price) return 'ไม่ระบุ';
    return price.toLocaleString('th-TH') + ' บาท';
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return 'ไม่ทราบ';
    return new Date(timestamp).toLocaleDateString('th-TH');
  }

  // --- Toast Notifications ---
  showToastNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.hideToast();
    }, 3000);
  }

  hideToast(): void {
    this.showToast = false;
  }

  // --- UI Methods ---
  toggleProfileDropdown(): void {
    this.profileDropdownOpen = !this.profileDropdownOpen;
  }

  toggleMobileSidebar(): void {
    // TODO: Implement mobile sidebar toggle
  }

  getAdminAvatarUrl(): string {
    return 'assets/icon/admin-avatar.png';
  }

  onImageError(): void {
    // Handle image load error
  }

  // --- Admin Profile ---
  loadAdminProfile(): void {
    const adminProfile = localStorage.getItem('adminProfile');
    if (adminProfile) {
      try {
        const profile = JSON.parse(adminProfile);
        this.adminName = profile.displayName || profile.email || 'Admin';
      } catch (error) {
        console.error('Error parsing admin profile:', error);
      }
    }
  }

  async onLogout(): Promise<void> {
    try {
      localStorage.removeItem('adminProfile');
      localStorage.removeItem('firebaseToken');
      
      // Navigate to admin login
      this.router.navigate(['/admin/login']);
      
      this.showToastNotification('ออกจากระบบเรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error during logout:', error);
      this.showToastNotification('เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
    }
  }

  // --- Demo Methods (สำหรับทดสอบ) ---
  addTestSubmission(): void {
    // TODO: Implement test submission creation for new system
    this.showToastNotification('ฟีเจอร์เพิ่มข้อมูลทดสอบจะพัฒนาในเวอร์ชันถัดไป', 'info');
  }
}