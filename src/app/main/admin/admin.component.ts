import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminProfile, AdminService, Dormitory, DormitoryDetail } from '../../services/admin.service';
import { Auth } from '@angular/fire/auth';
import { signOut } from '@angular/fire/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MapService } from '../../services/map.service';
import { environment } from '../../../environments/environment';
import { interval, Subscription } from 'rxjs';
interface Amenity {
  id: string;
  name: string;
  location_type: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})

export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('previewMapContainer', { static: false }) previewMapContainer?: ElementRef;
  
  // Auto-refresh properties
  private refreshSubscription?: Subscription;
  private refreshInterval = 10000; // 10 seconds for real-time updates

  // Rejection modal properties
  showRejectionModal = false;
  rejectionReason = '';

  // Statistics properties
  totalDorms = 0;
  pendingDorms = 0;
  approvedDorms = 0;

  // Success modal properties
  showSuccessModal = false;
  successMessage = '';
  successType = ''; // 'approve' | 'delete'

  // Delete confirmation modal properties
  showDeleteModal = false;
  deleteMessage = '';
  deleteDormId: string | number = '';
  deleteDormName = '';
  memberCount = 0;
  isDeleting = false;
  retryCount = 0;



  constructor(
    private router: Router,
    private adminService: AdminService,
    private firebaseAuth: Auth,
    private sanitizer: DomSanitizer,
    private mapService: MapService,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document


    
  ) {
    // ตรวจสอบข้อมูลแอดมินจาก localStorage
    this.loadAdminProfile();
  }

  

  ngOnInit(): void {
    this.loadDormitories();
    this.startAutoRefresh();
  }

  ngAfterViewInit(): void {
    // Admin Component ไม่ต้องสร้างแผนที่เอง เพราะ AdminEditDormComponent จะจัดการเอง
      this.cdr.markForCheck();
  }

  

  private readonly AMENITIES: Amenity[] = [
    // ภายในห้อง (Internal)
    { id: 'aircon', name: 'แอร์', location_type: 'ภายใน' },
    { id: 'fan', name: 'พัดลม', location_type: 'ภายใน' },
    { id: 'tv', name: 'TV', location_type: 'ภายใน' },
    { id: 'fridge', name: 'ตู้เย็น', location_type: 'ภายใน' },
    { id: 'bed', name: 'เตียงนอน', location_type: 'ภายใน' },
    { id: 'wifi', name: 'WIFI', location_type: 'ภายใน' },
    { id: 'wardrobe', name: 'ตู้เสื้อผ้า', location_type: 'ภายใน' },
    { id: 'desk', name: 'โต๊ะทำงาน', location_type: 'ภายใน' },
    { id: 'microwave', name: 'ไมโครเวฟ', location_type: 'ภายใน' },
    { id: 'waterHeater', name: 'เครื่องทำน้ำอุ่น', location_type: 'ภายใน' },
    { id: 'sink', name: 'ซิงค์ล้างจาน', location_type: 'ภายใน' },
    { id: 'dressingTable', name: 'โต๊ะเครื่องแป้ง', location_type: 'ภายใน' },
  
    // ภายนอก (External)
    { id: 'cctv', name: 'กล้องวงจรปิด', location_type: 'ภายนอก' },
    { id: 'security', name: 'รปภ.', location_type: 'ภายนอก' },
    { id: 'elevator', name: 'ลิฟต์', location_type: 'ภายนอก' },
    { id: 'parking', name: 'ที่จอดรถ', location_type: 'ภายนอก' },
    { id: 'fitness', name: 'ฟิตเนส', location_type: 'ภายนอก' },
    { id: 'lobby', name: 'Lobby', location_type: 'ภายนอก' },
    { id: 'waterDispenser', name: 'ตู้น้ำหยอดเหรียญ', location_type: 'ภายนอก' },
    { id: 'swimmingPool', name: 'สระว่ายน้ำ', location_type: 'ภายนอก' },
    { id: 'parcelShelf', name: 'ที่วางพัสดุ', location_type: 'ภายนอก' },
    { id: 'petsAllowed', name: 'อนุญาตให้เลี้ยงสัตว์', location_type: 'ภายนอก' },
    { id: 'keyCard', name: 'คีย์การ์ด', location_type: 'ภายนอก' },
    { id: 'washingMachine', name: 'เครื่องซักผ้า', location_type: 'ภายนอก' },
    { id: 'other', name: 'อื่นๆ', location_type: '' },
  ];
  
  private amenityIndexMap = new Map(this.AMENITIES.map((a, i) => [a.id, i]));

  get amenitiesList(): Amenity[] {
    return this.AMENITIES;
  }
  
  getAmenityIndex(amenityId: string): number {
    return this.amenityIndexMap.get(amenityId) ?? -1;
  }

  private getAmenityIdFromIndex(index: number): number | undefined {
    const mapping = [
      1, // index 0: แอร์
      2, // index 1: พัดลม
      3, // index 2: TV
      4, // index 3: ตู้เย็น
      5, // index 4: เตียงนอน
      6, // index 5: WIFI
      7, // index 6: ตู้เสื้อผ้า
      8, // index 7: โต๊ะทำงาน
      9, // index 8: ไมโครเวฟ
      10, // index 9: เครื่องทำน้ำอุ่น
      11, // index 10: ซิงค์ล้างจาน
      12, // index 11: โต๊ะเครื่องแป้ง
      13, // index 12: กล้องวงจรปิด
      14, // index 13: รปภ.
      15, // index 14: ลิฟต์
      16, // index 15: ที่จอดรถ
      17, // index 16: ฟิตเนส
      18, // index 17: Lobby
      19, // index 18: ตู้น้ำหยอดเหรียญ
      20, // index 19: สระว่ายน้ำ
      21, // index 20: ที่วางพัสดุ
      22, // index 21: อนุญาตให้เลี้ยงสัตว์
      23, // index 22: คีย์การ์ด
      24, // index 23: เครื่องซักผ้า
      // index 24: อื่นๆ (ไม่ต้องส่ง amenity_id)
    ];
  
    return mapping[index] || undefined;
  }

  ngOnDestroy(): void {
    // หยุด auto-refresh
    this.stopAutoRefresh();
    
    // ทำลายแผนที่ตัวอย่าง
    try {
      this.mapService.destroyMapByContainer('preview-map');
      console.log('[Admin] ทำลายแผนที่ preview-map สำเร็จ');
    } catch (error) {
      console.log('[Admin] Map cleanup error (preview-map):', error);
    }
  }

  // --- Admin State ---
  isLoggedIn = false;
  adminName = 'Admin1';
  adminUid = '23545';

  // --- Toast Notification State ---
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

  // --- Toast Notification Methods ---
  showToastNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    
    // Auto hide after 3 seconds
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    this.toastTimeout = setTimeout(() => {
      this.hideToast();
    }, 3000);
  }

  hideToast(): void {
    this.showToast = false;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
  }
  adminProfile: AdminProfile | null = null;
  profileDropdownOpen = false;
  showProfileModalFlag = false;
  showImageModalFlag = false;
  selectedImageUrl = '';
  selectedImageTitle = '';
  isMobileSidebarOpen = false;

  // --- Dormitory Data ---
  dorms: Dormitory[] = [];
  filteredDorms: Dormitory[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  currentPage = 1;
  totalPages = 5;

  selectedTab: 'all' | 'รออนุมัติ' | 'review' | 'edit' = 'all';
  
  // Review state
  reviewingDormId: string | null = null;
  reviewDormDetail: any = null;
  isLoadingDetail = false;
  currentReviewStep: 1 | 2 = 1;
  currentImageIndex = 0;
  imageModalOpen = false;
  imageModalIndex = 0;

  // Admin Component ไม่ต้องจัดการแผนที่ เพราะ AdminEditDormComponent จะจัดการเอง

  setTab(tab: 'all' | 'รออนุมัติ' | 'review') {
    this.selectedTab = tab;
    if (tab === 'รออนุมัติ') {
      this.loadPendingDormitories();
    } else if (tab === 'all') {
      this.filterDorms();
    }
  }

  loadDormitories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.adminService.getAllDormitories().subscribe({
      next: (dormitories) => {
        // จัดรูปแบบวันที่จาก ISO format เป็น DD-MM-YYYY
        this.dorms = dormitories.map(dorm => ({
          ...dorm,
          submitted_date: this.formatDate(dorm.submitted_date)
        }));
        this.filteredDorms = this.dorms;
        
        // อัปเดตสถิติ
        this.updateStatistics();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dormitories:', error);
        this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก';
        this.isLoading = false;
        // ไม่มี fallback data
      }
    });
  }

  // Auto-refresh methods
  startAutoRefresh(): void {
    if (!this.refreshSubscription) {
      this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
        this.refreshData();
      });
    }
  }

  stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  // Auto-refresh is now always enabled and silent

  refreshData(): void {
    if (this.selectedTab === 'รออนุมัติ') {
      this.loadPendingDormitoriesSilent();
    } else {
      this.loadDormitoriesSilent();
    }
  }

  // Silent refresh methods - no loading indicators
  loadDormitoriesSilent(): void {
    this.adminService.getAllDormitories().subscribe({
      next: (dormitories) => {
        // จัดรูปแบบวันที่จาก ISO format เป็น DD-MM-YYYY
        this.dorms = dormitories.map(dorm => ({
          ...dorm,
          submitted_date: this.formatDate(dorm.submitted_date)
        }));
        this.filteredDorms = this.dorms;
      },
      error: (error) => {
        console.error('Error loading dormitories:', error);
        // Silent error handling
      }
    });
  }

  loadPendingDormitoriesSilent(): void {
    this.adminService.getPendingDormitories().subscribe({
      next: (dormitories) => {
        // จัดรูปแบบวันที่จาก ISO format เป็น DD-MM-YYYY
        this.filteredDorms = dormitories.map(dorm => ({
          ...dorm,
          submitted_date: this.formatDate(dorm.submitted_date)
        }));
      },
      error: (error) => {
        console.error('Error loading pending dormitories:', error);
        // Silent error handling
      }
    });
  }

  loadPendingDormitories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.adminService.getPendingDormitories().subscribe({
      next: (dormitories) => {
        // จัดรูปแบบวันที่จาก ISO format เป็น DD-MM-YYYY
        this.filteredDorms = dormitories.map(dorm => ({
          ...dorm,
          submitted_date: this.formatDate(dorm.submitted_date)
        }));
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading pending dormitories:', error);
        this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพักรออนุมัติ';
        this.isLoading = false;
        // Fallback to mock data if API fails
        this.filteredDorms = this.dorms.filter(dorm => dorm.approval_status === 'รออนุมัติ');
      }
    });
  }

  // loadMockData method removed - no more mock data

  filterDorms(): void {
    if (this.selectedTab === 'รออนุมัติ') {
      this.filteredDorms = this.dorms.filter(dorm => 
        dorm.approval_status === 'รออนุมัติ'
      );
    } else {
      this.filteredDorms = this.dorms;
    }
  }

  getApprovedDorms(): any[] {
    return this.dorms.filter(dorm => dorm.approval_status === 'อนุมัติ');
  }

  getPendingDorms(): any[] {
    // ถ้าเป็นแท็บรออนุมัติ ให้ใช้ filteredDorms ที่โหลดมาจาก API
    if (this.selectedTab === 'รออนุมัติ') {
      return this.filteredDorms;
    }
    // ถ้าไม่ใช่ ให้กรองจาก dorms ตามเดิม
    return this.dorms.filter(dorm => dorm.approval_status === 'รออนุมัติ');
  }



  editDormitory(dormId: string): void {
    // Navigate to dedicated edit page
    this.router.navigate(['/admin/edit-dorm', dormId]);
  }

  navigateToOwnerEdit(): void {
    // Navigate to owner edit page (full edit mode)
    if (this.reviewingDormId) {
      this.router.navigate(['/owner/dorm-edit', this.reviewingDormId]);
    }
  }

  viewDormDetail(): void {
    // Navigate to dorm detail page
    if (this.reviewingDormId) {
      window.open(`/main/dorm-detail/${this.reviewingDormId}`, '_blank');
    }
  }

  closeEditMode(): void {
    // กลับไปรายการหอพัก
    this.selectedTab = 'all';
    this.reviewingDormId = null;
    this.reviewDormDetail = null;
  }

  onEditSuccess(): void {
    // บันทึกสำเร็จแล้ว รีเฟรชข้อมูล
    console.log('[Admin] Edit success, refreshing data...');
    this.refreshData();
    this.selectedTab = 'all';
    this.reviewingDormId = null;
    this.reviewDormDetail = null;
  }

  reviewDormitory(dormId: string): void {
    this.reviewingDormId = dormId;
    this.selectedTab = 'review';
    this.currentReviewStep = 1;
    this.loadDormitoryDetail(dormId);
  }

  loadDormitoryDetail(dormId: string): void {
    this.isLoadingDetail = true;
    console.log('[Admin] Loading dormitory detail for ID:', dormId);
    
    this.adminService.getDormitoryDetail(dormId).subscribe({
      next: (detail) => {
        console.log('[Admin] Full API Response:', detail);
        console.log('[Admin] Data structure check:');
        console.log('- detail.dormitory:', detail.dormitory);
        console.log('- detail.images:', detail.images);
        console.log('- detail.room_types:', detail.room_types);
        console.log('- detail.amenities:', detail.amenities);
        
        this.reviewDormDetail = detail;
        this.isLoadingDetail = false;
        
        // Reset image index when loading new dormitory
        this.currentImageIndex = 0;
        this.imageModalIndex = 0;
        
        // บังคับให้ Angular ตรวจจับการเปลี่ยนแปลง
        this.cdr.detectChanges();
        
        // สร้างแผนที่ตัวอย่างหลังจากโหลดข้อมูลเสร็จ
        setTimeout(() => {
          this.initPreviewMap();
        }, 500);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading dormitory detail:', error);
        
        let errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก';
        
        if (error.status === 404) {
          errorMessage = `ไม่พบหอพัก ID: ${dormId} ในระบบ\n\nหอพักนี้อาจถูกลบไปแล้ว หรือยังไม่ได้รับการอนุมัติ`;
        } else if (error.status === 403) {
          errorMessage = 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลหอพักนี้';
        } else if (error.status === 500) {
          errorMessage = 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง';
        }
        
        alert(errorMessage);
        this.isLoadingDetail = false;
        this.cancelReview();
      }
    });
  }

  cancelReview(): void {
    this.reviewingDormId = null;
    this.reviewDormDetail = null;
    this.selectedTab = 'รออนุมัติ';
    this.currentReviewStep = 1;
  }

  goToReviewStep(step: 1 | 2): void {
    this.currentReviewStep = step;
  }

  approveDormFromReview(): void {
    if (!this.reviewingDormId) return;
    
    if (confirm('คุณแน่ใจหรือไม่ที่จะอนุมัติหอพักนี้?')) {
      this.adminService.updateDormitoryApproval(this.reviewingDormId, { status: 'อนุมัติ' }).subscribe({
        next: (response) => {
          console.log('Approve dormitory response:', response);
          this.showToastNotification('อนุมัติหอพักเรียบร้อยแล้ว', 'success');
          this.cancelReview();
          this.loadDormitories();
        },
        error: (error) => {
          console.error('Error approving dormitory:', error);
          this.showToastNotification('เกิดข้อผิดพลาดในการอนุมัติหอพัก: ' + (error.error?.message || 'ไม่ทราบสาเหตุ'), 'error');
        }
      });
    }
  }

  rejectDormFromReview(): void {
    if (!this.reviewingDormId) return;
    
    const reason = prompt('กรุณาระบุเหตุผลในการไม่อนุมัติ:');
    if (reason) {
      this.adminService.updateDormitoryApproval(this.reviewingDormId, { status: 'ไม่อนุมัติ', rejectionReason: reason }).subscribe({
        next: (response) => {
          console.log('Reject dormitory response:', response);
          this.showToastNotification('ไม่อนุมัติหอพักเรียบร้อยแล้ว', 'success');
          this.cancelReview();
          this.loadDormitories();
        },
        error: (error) => {
          console.error('Error rejecting dormitory:', error);
          this.showToastNotification('เกิดข้อผิดพลาดในการไม่อนุมัติหอพัก: ' + (error.error?.message || 'ไม่ทราบสาเหตุ'), 'error');
        }
      });
    }
  }

  // Image carousel methods
  get prevImageIndex(): number {
    if (!this.reviewDormDetail?.images) return 0;
    return this.currentImageIndex === 0 
      ? this.reviewDormDetail.images.length - 1 
      : this.currentImageIndex - 1;
  }

  get nextImageIndex(): number {
    if (!this.reviewDormDetail?.images) return 0;
    return this.currentImageIndex === this.reviewDormDetail.images.length - 1 
      ? 0 
      : this.currentImageIndex + 1;
  }

  get hasImages(): boolean {
    return Array.isArray(this.reviewDormDetail?.images) && this.reviewDormDetail.images.length > 0;
  }

  onPrevImage(): void {
    if (!this.reviewDormDetail?.images || this.reviewDormDetail.images.length === 0) return;
    
    this.currentImageIndex = this.currentImageIndex === 0 
      ? this.reviewDormDetail.images.length - 1 
      : this.currentImageIndex - 1;
  }

  onNextImage(): void {
    if (!this.reviewDormDetail?.images || this.reviewDormDetail.images.length === 0) return;
    
    this.currentImageIndex = this.currentImageIndex === this.reviewDormDetail.images.length - 1 
      ? 0 
      : this.currentImageIndex + 1;
  }

  openImageModalReview(index: number): void {
    this.imageModalIndex = index;
    this.imageModalOpen = true;
  }

  closeImageModalReview(): void {
    this.imageModalOpen = false;
  }

  prevModalImage(): void {
    if (!this.reviewDormDetail?.images) return;
    this.imageModalIndex = this.imageModalIndex === 0 
      ? this.reviewDormDetail.images.length - 1 
      : this.imageModalIndex - 1;
    this.cdr.detectChanges();
  }

  nextModalImage(): void {
    if (!this.reviewDormDetail?.images) return;
    this.imageModalIndex = this.imageModalIndex === this.reviewDormDetail.images.length - 1 
      ? 0 
      : this.imageModalIndex + 1;
    this.cdr.detectChanges();
  }

  formatNumberOrDash(value: number | null): string {
    return value ? value.toLocaleString('th-TH') : '-';
  }

  getPriceRangeText(): string {
    const dormitory = this.reviewDormDetail?.dormitory || this.reviewDormDetail;
    if (!dormitory) return '-';
    
    const { min_price, max_price } = dormitory;
    if (!min_price && !max_price) return '-';
    if (min_price === max_price) {
      return `${min_price.toLocaleString('th-TH')} บาท/เดือน`;
    }
    return `${min_price.toLocaleString('th-TH')} - ${max_price.toLocaleString('th-TH')} บาท/เดือน`;
  }

  getAmenitiesByLocation(locationType: string): any[] {
    if (!this.reviewDormDetail?.amenities) return [];
    
    // ถ้า amenities เป็น array ให้กรองตาม location_type
    if (Array.isArray(this.reviewDormDetail.amenities)) {
      return this.reviewDormDetail.amenities.filter(
        (amenity: any) => amenity.location_type === locationType
      );
    }
    
    // ถ้า amenities เป็น object ให้ใช้ key เป็น locationType
    return this.reviewDormDetail.amenities[locationType] || [];
  }

  getAllAmenitiesByLocation(locationType: string): any[] {
    // ใช้ AMENITIES array แทน API data เพื่อแสดงทุกสิ่ง
    const allAmenities = this.AMENITIES.filter(amenity => amenity.location_type === locationType);
    
    if (!this.reviewDormDetail?.amenities) {
      // ถ้าไม่มีข้อมูล API ให้แสดงทุกสิ่งเป็น unavailable
      return allAmenities.map(amenity => ({
        amenity_name: amenity.name,
        is_available: false,
        location_type: amenity.location_type
      }));
    }
    
    // ถ้ามีข้อมูล API ให้เช็คว่ามีหรือไม่
    const apiAmenities = this.getAmenitiesByLocation(locationType);
    const apiAmenityNames = apiAmenities.map(api => api.amenity_name);
    
    return allAmenities.map(amenity => {
      const isAvailable = apiAmenityNames.includes(amenity.name);
      return {
        amenity_name: amenity.name,
        is_available: isAvailable,
        location_type: amenity.location_type
      };
    });
  }

  getAmenityIcon(amenityName: string): string {
    const iconMap: { [key: string]: string } = {
      'แอร์': 'fas fa-snowflake',
      'พัดลม': 'fas fa-fan',
      'TV': 'fas fa-tv',
      'ตู้เย็น': 'fas fa-box',
      'เตียงนอน': 'fas fa-bed',
      'WIFI': 'fas fa-wifi',
      'ตู้เสื้อผ้า': 'fas fa-tshirt',
      'โต๊ะทำงาน': 'fas fa-desktop',
      'ไมโครเวฟ': 'fas fa-microchip',
      'เครื่องทำน้ำอุ่น': 'fas fa-shower',
      'ซิงค์ล้างจาน': 'fas fa-sink',
      'โต๊ะเครื่องแป้ง': 'fas fa-magic',
      'กล้องวงจรปิด': 'fas fa-video',
      'รปภ.': 'fas fa-shield-alt',
      'ลิฟต์': 'fas fa-elevator',
      'ที่จอดรถ': 'fas fa-car',
      'ฟิตเนส': 'fas fa-dumbbell',
      'Lobby': 'fas fa-building',
      'ตู้น้ำหยอดเหรียญ': 'fas fa-coins',
      'สระว่ายน้ำ': 'fas fa-swimming-pool',
      'ที่วางพัสดุ': 'fas fa-box-open',
      'อนุญาตให้เลี้ยงสัตว์': 'fas fa-paw',
      'คีย์การ์ด': 'fas fa-key',
      'เครื่องซักผ้า': 'fas fa-tshirt'
    };
    return iconMap[amenityName] || 'fas fa-check';
  }

  isAmenityAvailable(amenityId: string): boolean {
    if (!this.reviewDormDetail?.amenities) return false;
    
    // Check all location types for the amenity
    for (const locationType of ['ภายใน', 'ภายนอก', 'common']) {
      const amenities = this.reviewDormDetail.amenities[locationType] || [];
      if (amenities.some((amenity: any) => amenity.amenity_name === amenityId && amenity.is_available)) {
        return true;
      }
    }
    return false;
  }


  getSpecificAmenityIcon(amenityName: string): boolean {
    const specificAmenities = [
      'โต๊ะแป้ง', 'แอร์', 'เครื่องปรับอากาศ', 'พัดลม', 'ทีวี', 'ตู้เย็น', 'เตียง', 
      'Wi-Fi', 'wifi', 'ตู้เสื้อผ้า', 'โต๊ะทำงาน', 'ไมโครเวฟ', 'เครื่องทำน้ำอุ่น', 
      'อ่างล้างหน้า', 'กล้องวงจรปิด', 'CCTV', 'รักษาความปลอดภัย', 'ลิฟต์', 
      'ที่จอดรถ', 'ฟิตเนส', 'ห้องรับแขก', 'ตู้น้ำดื่ม', 'สระว่ายน้ำ', 'ชั้นวางพัสดุ', 
      'อนุญาตสัตว์เลี้ยง', 'คีย์การ์ด', 'เครื่องซักผ้า'
    ];
    
    return specificAmenities.some(amenity => 
      amenityName.toLowerCase().includes(amenity.toLowerCase())
    );
  }

  getMapUrl(): SafeResourceUrl | null {
    if (!this.reviewDormDetail?.dormitory) return null;
    const { latitude, longitude } = this.reviewDormDetail.dormitory;
    
    const url = `https://www.google.com/maps?q=${latitude},${longitude}&hl=th&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  loadAdminProfile(): void {
    const adminProfileStr = localStorage.getItem('adminProfile');
    if (adminProfileStr) {
      try {
        this.adminProfile = JSON.parse(adminProfileStr);
        this.isLoggedIn = true;
        this.adminName = this.adminProfile?.displayName || this.adminProfile?.username || 'Admin1';
        this.adminUid = this.adminProfile?.username || '23545';
      } catch (error) {
        console.error('Error parsing admin profile:', error);
        this.redirectToLogin();
      }
    } else {
      this.redirectToLogin();
    }
  }

  // Helper method to get admin avatar URL with fallback
  getAdminAvatarUrl(): string {
    // ถ้ามีรูปโปรไฟล์ ให้ใช้รูปนั้น
    if (this.adminProfile?.photoURL) {
      return this.adminProfile.photoURL;
    }
    
    // ถ้าไม่มีรูป ให้ใช้ home-owner.png เป็นค่าเริ่มต้นสำหรับ admin (เนื่องจาก admin มีสิทธิ์เหมือนเจ้าของหอพัก)
    return 'assets/icon/home-owner.png';
  }

  onImageError(event: any): void {
    // ถ้ารูปไม่โหลดได้ ให้ใช้รูป default
    event.target.src = 'assets/images/photo.png';
  }

  redirectToLogin(): void {
    this.router.navigate(['/admin/login']);
  }

  getHomeLink(): string | any[] {
    return ['/'];
  }

  // --- Dropdown Functions ---
  toggleProfileDropdown(): void {
    this.profileDropdownOpen = !this.profileDropdownOpen;
  }

  closeProfileDropdown(): void {
    this.profileDropdownOpen = false;
  }

  // --- Mobile Sidebar ---
  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }


  async onLogout(): Promise<void> {
    this.closeProfileDropdown();
    
    try {
      // Sign out จาก Firebase Auth
      await signOut(this.firebaseAuth);
    } catch (error) {
      console.error('Firebase sign out error:', error);
    }
    
    // ลบข้อมูล admin และ Firebase token จาก localStorage
    localStorage.removeItem('adminProfile');
    localStorage.removeItem('firebaseToken');
    
    // Redirect ไปหน้า login
    this.router.navigate(['/admin/login']);
  }

  // --- Modal Functions ---
  showProfileModal(event: Event): void {
    event.stopPropagation();
    this.showProfileModalFlag = true;
  }

  closeProfileModal(): void {
    this.showProfileModalFlag = false;
  }

  showImageModal(imageUrl: string, title: string): void {
    this.selectedImageUrl = imageUrl;
    this.selectedImageTitle = title;
    this.showImageModalFlag = true;
  }

  closeImageModal(): void {
    this.showImageModalFlag = false;
    this.selectedImageUrl = '';
    this.selectedImageTitle = '';
  }

  // --- Helper Functions ---
  getPendingCount(): number {
    return this.dorms.filter(dorm => dorm.approval_status === 'รออนุมัติ').length;
  }

  getApprovedCount(): number {
    return this.dorms.filter(dorm => dorm.approval_status === 'อนุมัติ').length;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'อนุมัติ':
        return 'bg-green-100 text-green-800';
      case 'รออนุมัติ':
        return 'bg-yellow-100 text-yellow-800';
      case 'ไม่อนุมัติ':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // ปุ่มใน header (กรณียังไม่ล็อกอิน)
  goLogin() {
    this.router.navigate(['/admin/login']);
  }

  // จัดรูปแบบวันที่จาก ISO format เป็น DD-MM-YYYY
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original string if formatting fails
    }
  }

  // Map initialization for review page
  private initPreviewMap(): void {
    if (!this.reviewDormDetail?.dormitory?.latitude || !this.reviewDormDetail?.dormitory?.longitude) {
      console.log('[Admin] No coordinates available for map');
      return;
    }

    // ตรวจสอบว่าแมปถูกสร้างแล้วหรือไม่
    if (this.mapService.isMapInitialized('preview-map')) {
      console.log('[Admin] Preview map already initialized');
      return;
    }

    try {
      console.log('[Admin] Initializing preview map...');
      
      const lat = this.reviewDormDetail.dormitory.latitude;
      const lng = this.reviewDormDetail.dormitory.longitude;
      const dormName = this.reviewDormDetail.dormitory.dorm_name;
      const address = this.reviewDormDetail.dormitory.address;
      
      this.mapService.initializeMap('preview-map', lat, lng, dormName, address);
      
      console.log('[Admin] Preview map initialized successfully');
      
    } catch (error) {
      console.error('[Admin] Preview map initialization error:', error);
    }
  }

  // อนุมัติหอพัก
  approveDormitory(): void {
    if (!this.reviewDormDetail?.dormitory?.dorm_id) {
      console.error('ไม่มี ID หอพัก');
      return;
    }

    const dormId = this.reviewDormDetail.dormitory.dorm_id;
    const payload = { status: 'อนุมัติ' };

    this.adminService.updateDormitoryApproval(dormId, payload).subscribe({
      next: (response) => {
        console.log('อนุมัติหอพักสำเร็จ:', response);
        // รีเฟรชข้อมูล
        this.loadPendingDormitories();
        this.loadDormitories(); // รีเฟรชข้อมูลทั้งหมดเพื่ออัปเดตสถิติ
        // ปิด modal
        this.closeReviewModal();
        // แสดง popup สำเร็จ
        this.showSuccessPopup('อนุมัติหอพักเรียบร้อยแล้ว', 'approve');
      },
      error: (error) => {
        console.error('เกิดข้อผิดพลาดในการอนุมัติ:', error);
        alert('เกิดข้อผิดพลาดในการอนุมัติหอพัก');
      }
    });
  }

  // ไม่อนุมัติหอพัก
  rejectDormitory(): void {
    if (!this.reviewDormDetail?.dormitory?.dorm_id) {
      console.error('ไม่มี ID หอพัก');
      return;
    }

    // เปิด popup modal แทน prompt
    this.showRejectionModal = true;
    this.rejectionReason = '';
  }

  confirmRejection(): void {
    if (!this.reviewDormDetail?.dormitory?.dorm_id) {
      console.error('ไม่มี ID หอพัก');
      return;
    }

    const dormId = this.reviewDormDetail.dormitory.dorm_id;
    const payload = { 
      status: 'ไม่อนุมัติ',
      rejectionReason: this.rejectionReason || 'ไม่ระบุเหตุผล'
    };

    this.adminService.updateDormitoryApproval(dormId, payload).subscribe({
      next: (response) => {
        console.log('ไม่อนุมัติหอพักสำเร็จ:', response);
        // รีเฟรชข้อมูล
        this.loadPendingDormitories();
        this.loadDormitories(); // รีเฟรชข้อมูลทั้งหมดเพื่ออัปเดตสถิติ
        // ปิด rejection modal
        this.showRejectionModal = false;
        this.rejectionReason = '';
        // ปิด review modal
        this.closeReviewModal();
        // แสดง popup สำเร็จ
        this.showSuccessPopup('ไม่อนุมัติหอพักเรียบร้อยแล้ว', 'reject');
      },
      error: (error) => {
        console.error('เกิดข้อผิดพลาดในการไม่อนุมัติ:', error);
        alert('เกิดข้อผิดพลาดในการไม่อนุมัติหอพัก');
      }
    });
  }

  // ปิด modal ตรวจสอบ
  closeReviewModal(): void {
    this.selectedTab = 'รออนุมัติ';
    this.reviewDormDetail = null;
    this.currentImageIndex = 0;
  }

  // ปิด rejection modal
  cancelRejection(): void {
    this.showRejectionModal = false;
    this.rejectionReason = '';
  }

  // ลบหอพักพร้อมตรวจสอบสมาชิก
  deleteDormitoryWithCheck(dormId: string | number, dormName: string): void {
    // ตรวจสอบสมาชิกก่อนลบ
    this.adminService.checkDormitoryMembers(String(dormId)).subscribe({
      next: (response) => {
        console.log('ตรวจสอบสมาชิก:', response);
        
        // เก็บข้อมูลสำหรับ modal
        this.deleteDormId = dormId;
        this.deleteDormName = dormName;
        this.memberCount = response.member_count || 0;
        
        if (response.has_members && response.member_count > 0) {
          this.deleteMessage = `คุณต้องการลบหอพัก "${dormName}" และ สมาชิกของหอ ใช่หรือไม่ ?`;
        } else {
          this.deleteMessage = `คุณแน่ใจหรือไม่ที่จะลบหอพัก "${dormName}" ?`;
        }
        
        // แสดง delete confirmation modal
        this.showDeleteModal = true;
      },
      error: (error) => {
        console.error('เกิดข้อผิดพลาดในการตรวจสอบสมาชิก:', error);
        // ถ้า API ไม่ทำงาน ให้ใช้ modal ปกติ
        this.deleteDormId = dormId;
        this.deleteDormName = dormName;
        this.memberCount = 0;
        this.deleteMessage = `คุณแน่ใจหรือไม่ที่จะลบหอพัก "${dormName}"?`;
        this.showDeleteModal = true;
      }
    });
  }

  // ลบหอพักจริง
  private performDeleteDormitory(dormId: string | number): void {
    this.adminService.deleteDormitory(String(dormId), true).subscribe({
      next: (response) => {
        console.log('ลบหอพักสำเร็จ:', response);
        // ปิด loading และ modal
        this.isDeleting = false;
        this.showDeleteModal = false;
        // รีเฟรชข้อมูล
        this.loadDormitories();
        this.loadPendingDormitories();
        // แสดง popup สำเร็จ
        this.showSuccessPopup('ลบหอพักเรียบร้อยแล้ว', 'delete');
      },
      error: (error) => {
        console.error('เกิดข้อผิดพลาดในการลบหอพัก:', error);
        // ปิด loading
        this.isDeleting = false;
        
        if (error.status === 409) {
          this.retryCount++;
          if (this.retryCount < 3) {
            // ลองใหม่ด้วย confirm=true
            console.log(`ลองลบหอพักอีกครั้ง (ครั้งที่ ${this.retryCount})`);
    setTimeout(() => {
              this.performDeleteDormitory(dormId);
            }, 1000);
          } else {
            alert('หอพักนี้มีสมาชิกอาศัยอยู่ กรุณายืนยันการลบอีกครั้ง');
            this.retryCount = 0;
          }
        } else {
          alert('เกิดข้อผิดพลาดในการลบหอพัก');
        }
      }
    });
  }

  // อัปเดตสถิติ
  private updateStatistics(): void {
    if (!this.dorms) return;
    
    this.totalDorms = this.dorms.length;
    this.pendingDorms = this.dorms.filter(dorm => dorm.approval_status === 'รออนุมัติ').length;
    this.approvedDorms = this.dorms.filter(dorm => dorm.approval_status === 'อนุมัติ').length;
  }

  // แสดง popup สำเร็จ
  showSuccessPopup(message: string, type: string): void {
    this.successMessage = message;
    this.successType = type;
    this.showSuccessModal = true;
  }

  // ปิด success modal
  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.successType = '';
  }

  // ยืนยันการลบ
  confirmDelete(): void {
    this.isDeleting = true;
    this.retryCount = 0; // รีเซ็ต retry count
    this.performDeleteDormitory(this.deleteDormId);
  }

  // ยกเลิกการลบ
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.isDeleting = false;
    this.retryCount = 0;
    this.deleteDormId = '';
    this.deleteDormName = '';
    this.deleteMessage = '';
    this.memberCount = 0;
  }
}
