import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AdminProfile,
  AdminService,
  Dormitory,
  DormitoryDetail,
} from '../../services/admin.service';
import { Auth } from '@angular/fire/auth';
import { signOut } from '@angular/fire/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MapService } from '../../services/map.service';
import { environment } from '../../../environments/environment';
import { interval, Subscription } from 'rxjs';
import { AmenityIconComponent } from '../../components/amenity-icon/amenity-icon.component';
import { AdminEditDormComponent } from './admin-edit-dorm/admin-edit-dorm.component';

interface Amenity {
  id: string;
  name: string;
  location_type: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, AmenityIconComponent, AdminEditDormComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('previewMapContainer', { static: false })
  previewMapContainer?: ElementRef;

  // Auto-refresh properties
  private refreshSubscription?: Subscription;
  private refreshInterval = 10000; // 10 seconds for real-time updates

  // Rejection modal properties
  showRejectionModal = false;
  rejectionReason = '';

  // Selection properties for dorms (shared)
  selectAllDorms = false;
  areAllPendingDormsSelected = false;

  // Statistics properties
  totalDorms = 0;
  pendingDorms = 0;
  approvedDorms = 0;
  rejectedCount = 0;

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

  // Bulk confirmation modal properties
  showBulkConfirmModal = false;
  bulkConfirmTitle = '';
  bulkConfirmMessage = '';
  bulkConfirmType: 'approve' | 'reject' | 'delete' | null = null;
  isProcessingBulk = false;

  constructor(
    private router: Router,
    private adminService: AdminService,
    private firebaseAuth: Auth,
    private sanitizer: DomSanitizer,
    private mapService: MapService,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document,
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
    {
      id: 'petsAllowed',
      name: 'อนุญาตให้เลี้ยงสัตว์',
      location_type: 'ภายนอก',
    },
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
    } catch (error) {
      // Silent cleanup
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
  showToastNotification(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
  ): void {
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
  selectedDorms: string[] = []; // Track selected dormitory IDs
  isLoading = false;
  errorMessage: string | null = null;

  currentPage = 1;
  totalPages = 5;

  selectedTab: 'all' | 'pending' | 'review' | 'edit' | 'rejected' = 'all';

  // Review state
  reviewingDormId: string | null = null;
  reviewDormDetail: any = null;
  isLoadingDetail = false;
  currentReviewStep: 1 | 2 = 1;
  currentImageIndex = 0;
  imageModalOpen = false;
  imageModalIndex = 0;

  // Admin Component ไม่ต้องจัดการแผนที่ เพราะ AdminEditDormComponent จะจัดการเอง

  setTab(tab: 'all' | 'pending' | 'review' | 'edit' | 'rejected') {
    this.selectedTab = tab;
    this.selectedDorms = []; // ล้างการเลือกเมื่อเปลี่ยนแท็บ
    if (tab === 'pending') {
      this.loadPendingDormitories();
    } else if (tab === 'rejected') {
      this.loadRejectedDormitories();
    } else if (tab === 'all') {
      this.loadDormitories(); // ใช้การโหลดเต็มรูปแบบสำหรับแท็บทั้งหมดเพื่อให้แน่ใจว่าข้อมูลเป็นปัจจุบัน
    }
  }

  loadDormitories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // โหลดข้อมูลทั้งหมด (approved + pending + rejected)
    this.adminService.getAllDormitories().subscribe({
      next: (allDormitories) => {
        // จัดรูปแบบวันที่จาก ISO format เป็น DD-MM-YYYY
        this.dorms = allDormitories.map((dorm) => ({
          ...dorm,
          main_image_url: dorm.main_image_url || 'assets/images/photo.png',
          submitted_date: this.formatDate(dorm.submitted_date),
        }));

        // กรองตาม tab ที่เลือก
        this.filterDorms();

        // อัปเดตสถิติ
        this.updateStatistics();

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก';
        this.isLoading = false;
        // ไม่มี fallback data
      },
    });
  }

  // Auto-refresh methods
  startAutoRefresh(): void {
    if (!this.refreshSubscription) {
      this.refreshSubscription = interval(this.refreshInterval).subscribe(
        () => {
          this.refreshData();
        },
      );
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
    // โหลดข้อมูลทั้งหมดเสมอเพื่อให้สถิติ (Approved, Pending, Rejected) เป็นปัจจุบันตลอดเวลา
    this.loadDormitoriesSilent();
  }

  // Silent refresh methods - no loading indicators
  loadDormitoriesSilent(): void {
    this.adminService.getAllDormitories().subscribe({
      next: (dormitories) => {
        // จัดรูปแบบข้อมูล
        this.dorms = dormitories.map((dorm) => ({
          ...dorm,
          main_image_url: dorm.main_image_url || 'assets/images/photo.png',
          submitted_date: this.formatDate(dorm.submitted_date),
        }));

        // อัปเดตสถิติทั้งหมด (Approved, Pending, Rejected)
        this.updateStatistics();

        // กรองข้อมูลตาม Tab ที่ใช้งานอยู่
        this.filterDorms();
      },
      error: (error) => {
        // Silent error handling
      },
    });
  }

  loadPendingDormitories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.adminService.getAllDormitories().subscribe({
      next: (allDormitories) => {
        this.dorms = allDormitories.map((dorm) => ({
          ...dorm,
          main_image_url: dorm.main_image_url || 'assets/images/photo.png',
          submitted_date: this.formatDate(dorm.submitted_date),
        }));

        this.filterDorms();
        this.updateStatistics();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพักรออนุมัติ';
        this.isLoading = false;
      },
    });
  }

  loadRejectedDormitories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // ดึงข้อมูลทั้งหมดเพื่อให้ stats ถูกต้อง แต่อาจจะช้ากว่า
    // หรือถ้าต้องการความเร็ว ให้ใช้ getRejectedDormitories() แต่ต้องยอมรับว่า stats อื่นอาจไม่อัปเดต
    // ในที่นี้เลือกใช้ getAll เพื่อความถูกต้องของ UI
    this.adminService.getAllDormitories().subscribe({
      next: (allDormitories) => {
        this.dorms = allDormitories.map((dorm) => ({
          ...dorm,
          main_image_url: dorm.main_image_url || 'assets/images/photo.png',
          submitted_date: this.formatDate(dorm.submitted_date),
        }));

        this.filterDorms();
        this.updateStatistics();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพักที่ปฏิเสธ';
        this.isLoading = false;
      },
    });
  }

  // loadMockData method removed - no more mock data

  filterDorms(): void {
    if (this.selectedTab === 'pending') {
      this.filteredDorms = this.dorms.filter(
        (dorm) =>
          dorm.approval_status === 'pending' ||
          dorm.approval_status === 'รออนุมัติ',
      );
    } else if (this.selectedTab === 'rejected') {
      this.filteredDorms = this.dorms.filter(
        (dorm) =>
          dorm.approval_status === 'rejected' ||
          dorm.approval_status === 'ไม่อนุมัติ',
      );
    } else {
      this.filteredDorms = this.dorms;
    }
  }

  getApprovedDorms(): any[] {
    return this.dorms.filter(
      (dorm) =>
        dorm.approval_status === 'approved' ||
        dorm.approval_status === 'อนุมัติ',
    );
  }

  getPendingDorms(): any[] {
    // ถ้าเป็นแท็บรออนุมัติ ให้ใช้ filteredDorms ที่โหลดมาจาก API
    if (this.selectedTab === 'pending') {
      return this.filteredDorms;
    }
    // ถ้าไม่ใช่ ให้กรองจาก dorms ตามเดิม
    return this.dorms.filter(
      (dorm) =>
        dorm.approval_status === 'pending' ||
        dorm.approval_status === 'รออนุมัติ',
    );
  }

  getRejectedDorms(): any[] {
    if (this.selectedTab === 'rejected') {
      return this.filteredDorms;
    }
    return this.dorms.filter(
      (dorm) =>
        dorm.approval_status === 'rejected' ||
        dorm.approval_status === 'ไม่อนุมัติ',
    );
  }

  editDormitory(dormId: string): void {
    // Show inline edit form
    this.reviewingDormId = dormId;
    this.selectedTab = 'edit';
    this.loadDormitoryDetail(dormId);
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

    this.adminService.getDormitoryDetail(dormId).subscribe({
      next: (detail) => {
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
        let errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก';

        if (error.status === 404) {
          errorMessage = `ไม่พบหอพัก ID: ${dormId} ในระบบ\n\nหอพักนี้อาจถูกลบไปแล้ว หรือยังไม่ได้รับการอนุมัติ`;
        } else if (error.status === 403) {
          errorMessage = 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลหอพักนี้';
        } else if (error.status === 500) {
          errorMessage = 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง';
        }

        this.showToastNotification(errorMessage, 'error');
        this.isLoadingDetail = false;
        this.cancelReview();
      },
    });
  }

  cancelReview(): void {
    const previousTab =
      this.reviewDormDetail?.status === 'rejected' ? 'rejected' : 'pending';
    this.reviewingDormId = null;
    this.reviewDormDetail = null;
    this.selectedTab = previousTab;
    this.currentReviewStep = 1;
  }

  goToReviewStep(step: 1 | 2): void {
    this.currentReviewStep = step;
  }

  reApproveDormFromReview(): void {
    if (!this.reviewingDormId) return;

    this.bulkConfirmTitle = 'ยืนยันการอนุมัติ';
    this.bulkConfirmMessage =
      'คุณแน่ใจหรือไม่ที่จะอนุมัติหอพักนี้ใหม่อีกครั้ง?';
    this.bulkConfirmType = 'approve';
    this.showBulkConfirmModal = true;
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
    return (
      Array.isArray(this.reviewDormDetail?.images) &&
      this.reviewDormDetail.images.length > 0
    );
  }

  onPrevImage(): void {
    if (
      !this.reviewDormDetail?.images ||
      this.reviewDormDetail.images.length === 0
    )
      return;

    this.currentImageIndex =
      this.currentImageIndex === 0
        ? this.reviewDormDetail.images.length - 1
        : this.currentImageIndex - 1;
  }

  onNextImage(): void {
    if (
      !this.reviewDormDetail?.images ||
      this.reviewDormDetail.images.length === 0
    )
      return;

    this.currentImageIndex =
      this.currentImageIndex === this.reviewDormDetail.images.length - 1
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
    this.imageModalIndex =
      this.imageModalIndex === 0
        ? this.reviewDormDetail.images.length - 1
        : this.imageModalIndex - 1;
    this.cdr.detectChanges();
  }

  nextModalImage(): void {
    if (!this.reviewDormDetail?.images) return;
    this.imageModalIndex =
      this.imageModalIndex === this.reviewDormDetail.images.length - 1
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
        (amenity: any) => amenity.location_type === locationType,
      );
    }

    // ถ้า amenities เป็น object ให้ใช้ key เป็น locationType
    return this.reviewDormDetail.amenities[locationType] || [];
  }

  getAllAmenitiesByLocation(locationType: string): any[] {
    // ใช้ AMENITIES array แทน API data เพื่อแสดงทุกสิ่ง
    const allAmenities = this.AMENITIES.filter(
      (amenity) => amenity.location_type === locationType,
    );

    if (!this.reviewDormDetail?.amenities) {
      // ถ้าไม่มีข้อมูล API ให้แสดงทุกสิ่งเป็น unavailable
      return allAmenities.map((amenity) => ({
        amenity_name: amenity.name,
        is_available: false,
        location_type: amenity.location_type,
      }));
    }

    // ถ้ามีข้อมูล API ให้เช็คว่ามีหรือไม่
    const apiAmenities = this.getAmenitiesByLocation(locationType);
    const apiAmenityNames = apiAmenities.map((api) => api.amenity_name);

    return allAmenities.map((amenity) => {
      const isAvailable = apiAmenityNames.includes(amenity.name);
      return {
        amenity_name: amenity.name,
        is_available: isAvailable,
        location_type: amenity.location_type,
      };
    });
  }

  // Method ใหม่: แสดงสิ่งอำนวยความสะดวกทั้งหมด 24 รายการ พร้อมสถานะ
  getAllAmenitiesWithStatus(): Array<{ name: string; has: boolean }> {
    // รายการ amenities ทั้งหมด 24 รายการ (ตาม database)
    const allAmenityNames = [
      'แอร์',
      'พัดลม',
      'TV',
      'ตู้เย็น',
      'เตียงนอน',
      'WIFI',
      'ตู้เสื้อผ้า',
      'โต๊ะทำงาน',
      'โต๊ะเครื่องแป้ง',
      'ไมโครเวฟ',
      'เครื่องทำน้ำอุ่น',
      'ซิงค์ล้างจาน',
      'กล้องวงจรปิด',
      'รปภ.',
      'ลิฟต์',
      'ที่จอดรถ',
      'ฟิตเนส',
      'Lobby',
      'ผู้ดำหยอดเหรียญ',
      'สระว่ายน้ำ',
      'ที่วางพัสดุ',
      'อนุญาตให้เลี้ยงสัตว์',
      'คีย์การ์ด',
      'เครื่องซักผ้า',
    ];

    // ดึงรายการที่หอนี้มี
    const dormAmenities = this.reviewDormDetail?.amenities || {};
    let dormAmenityNames: string[] = [];

    if (Array.isArray(dormAmenities)) {
      dormAmenityNames = dormAmenities.map((a: any) => a.amenity_name);
    } else {
      // ถ้าเป็น object ที่แบ่งตามประเภท (ภายใน, ภายนอก, common)
      const internal = dormAmenities['ภายใน'] || [];
      const external = dormAmenities['ภายนอก'] || [];
      const common = dormAmenities['common'] || [];

      dormAmenityNames = [
        ...internal
          .filter((a: any) => a.is_available)
          .map((a: any) => a.amenity_name),
        ...external
          .filter((a: any) => a.is_available)
          .map((a: any) => a.amenity_name),
        ...common
          .filter((a: any) => a.is_available)
          .map((a: any) => a.amenity_name),
      ];
    }

    // สร้าง array ที่มีทั้งหมด พร้อมสถานะว่ามีหรือไม่
    return allAmenityNames.map((name) => ({
      name: name,
      has: dormAmenityNames.some(
        (apiName) =>
          apiName && apiName.toLowerCase().includes(name.toLowerCase()),
      ),
    }));
  }

  getAmenityIcon(amenityName: string): string {
    const iconMap: { [key: string]: string } = {
      แอร์: 'fas fa-snowflake',
      พัดลม: 'fas fa-fan',
      TV: 'fas fa-tv',
      ตู้เย็น: 'fas fa-box',
      เตียงนอน: 'fas fa-bed',
      WIFI: 'fas fa-wifi',
      ตู้เสื้อผ้า: 'fas fa-tshirt',
      โต๊ะทำงาน: 'fas fa-desktop',
      ไมโครเวฟ: 'fas fa-microchip',
      เครื่องทำน้ำอุ่น: 'fas fa-shower',
      ซิงค์ล้างจาน: 'fas fa-sink',
      โต๊ะเครื่องแป้ง: 'fas fa-magic',
      กล้องวงจรปิด: 'fas fa-video',
      'รปภ.': 'fas fa-shield-alt',
      ลิฟต์: 'fas fa-elevator',
      ที่จอดรถ: 'fas fa-car',
      ฟิตเนส: 'fas fa-dumbbell',
      Lobby: 'fas fa-building',
      ตู้น้ำหยอดเหรียญ: 'fas fa-coins',
      สระว่ายน้ำ: 'fas fa-swimming-pool',
      ที่วางพัสดุ: 'fas fa-box-open',
      อนุญาตให้เลี้ยงสัตว์: 'fas fa-paw',
      คีย์การ์ด: 'fas fa-key',
      เครื่องซักผ้า: 'fas fa-tshirt',
    };
    return iconMap[amenityName] || 'fas fa-check';
  }

  isAmenityAvailable(amenityId: string): boolean {
    if (!this.reviewDormDetail?.amenities) return false;

    // Check all location types for the amenity
    for (const locationType of ['ภายใน', 'ภายนอก', 'common']) {
      const amenities = this.reviewDormDetail.amenities[locationType] || [];
      if (
        amenities.some(
          (amenity: any) =>
            amenity.amenity_name === amenityId && amenity.is_available,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  getSpecificAmenityIcon(amenityName: string): boolean {
    const specificAmenities = [
      'โต๊ะแป้ง',
      'แอร์',
      'เครื่องปรับอากาศ',
      'พัดลม',
      'ทีวี',
      'ตู้เย็น',
      'เตียง',
      'Wi-Fi',
      'wifi',
      'ตู้เสื้อผ้า',
      'โต๊ะทำงาน',
      'ไมโครเวฟ',
      'เครื่องทำน้ำอุ่น',
      'อ่างล้างหน้า',
      'กล้องวงจรปิด',
      'CCTV',
      'รักษาความปลอดภัย',
      'ลิฟต์',
      'ที่จอดรถ',
      'ฟิตเนส',
      'ห้องรับแขก',
      'ตู้น้ำดื่ม',
      'สระว่ายน้ำ',
      'ชั้นวางพัสดุ',
      'อนุญาตสัตว์เลี้ยง',
      'คีย์การ์ด',
      'เครื่องซักผ้า',
    ];

    return specificAmenities.some((amenity) =>
      amenityName.toLowerCase().includes(amenity.toLowerCase()),
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
        this.adminName =
          this.adminProfile?.displayName ||
          this.adminProfile?.username ||
          'Admin1';
        this.adminUid = this.adminProfile?.username || '23545';
      } catch (error) {
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
    // Log ค่าเพื่อตรวจสอบ
    console.log('Image Error - Original src:', event.target.src);
    console.log('Dorm data for debugging:', {
      main_image_url: event.target.getAttribute('data-main-image'),
      thumbnail_url: event.target.getAttribute('data-thumbnail'),
      fallback: event.target.getAttribute('data-fallback')
    });
    
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
      // Silent error handling
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
    return this.dorms.filter((dorm) => dorm.approval_status === 'pending')
      .length;
  }

  getRejectedCount(): number {
    return this.dorms.filter((dorm) => dorm.approval_status === 'rejected')
      .length;
  }

  getApprovedCount(): number {
    return this.dorms.filter(
      (dorm) =>
        dorm.approval_status === 'approved' ||
        dorm.approval_status === 'อนุมัติ',
    ).length;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved':
      case 'อนุมัติ':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'รออนุมัติ':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
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
      return dateString; // Return original string if formatting fails
    }
  }

  // Map initialization for review page
  private initPreviewMap(): void {
    if (
      !this.reviewDormDetail?.dormitory?.latitude ||
      !this.reviewDormDetail?.dormitory?.longitude
    ) {
      return;
    }

    // ตรวจสอบว่าแมปถูกสร้างแล้วหรือไม่
    if (this.mapService.isMapInitialized('preview-map')) {
      return;
    }

    try {
      const lat = this.reviewDormDetail.dormitory.latitude;
      const lng = this.reviewDormDetail.dormitory.longitude;
      const dormName = this.reviewDormDetail.dormitory.dorm_name;
      const address = this.reviewDormDetail.dormitory.address;

      this.mapService.initializeMap('preview-map', lat, lng, dormName, address);
    } catch (error) {
      // Silent error handling
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
        this.showToastNotification('เกิดข้อผิดพลาดในการอนุมัติหอพัก', 'error');
      },
    });
  }

  // ไม่อนุมัติหอพัก
  rejectDormitory(): void {
    if (!this.reviewDormDetail?.dormitory?.dorm_id) {
      return;
    }

    // เปิด popup modal แทน prompt
    this.showRejectionModal = true;
    this.rejectionReason = '';
  }

  confirmRejection(): void {
    if (!this.reviewDormDetail?.dormitory?.dorm_id) {
      return;
    }

    const dormId = this.reviewDormDetail.dormitory.dorm_id;
    const payload = {
      status: 'ไม่อนุมัติ',
      rejectionReason: this.rejectionReason || 'ไม่ระบุเหตุผล',
    };

    this.adminService.updateDormitoryApproval(dormId, payload).subscribe({
      next: (response) => {
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
        this.showToastNotification(
          'เกิดข้อผิดพลาดในการไม่อนุมัติหอพัก',
          'error',
        );
      },
    });
  }

  // ปิด modal ตรวจสอบ
  closeReviewModal(): void {
    this.cancelReview();
  }

  // ปิด rejection modal
  cancelRejection(): void {
    this.showRejectionModal = false;
    this.rejectionReason = '';
  }

  // ลบหอพักพร้อมตรวจสอบสมาชิก
  deleteDormitoryWithCheck(dormId: string | number, dormName: string): void {
    this.deleteDormId = dormId;
    this.deleteDormName = dormName;
    this.deleteMessage = `คุณแน่ใจหรือไม่ที่จะลบหอพัก "${dormName}"?`;
    this.showDeleteModal = true;
  }

  // ลบหอพักจริง
  private performDeleteDormitory(dormId: string | number): void {
    this.adminService.deleteDormitory(String(dormId), true).subscribe({
      next: (response) => {
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
        // ปิด loading
        this.isDeleting = false;

        if (error.status === 409) {
          this.retryCount++;
          if (this.retryCount < 3) {
            // ลองใหม่ด้วย confirm=true
            setTimeout(() => {
              this.performDeleteDormitory(dormId);
            }, 1000);
          } else {
            this.showToastNotification(
              'หอพักนี้มีสมาชิกอาศัยอยู่ กรุณายืนยันการลบอีกครั้ง',
              'error',
            );
            this.retryCount = 0;
          }
        } else {
          this.showToastNotification('เกิดข้อผิดพลาดในการลบหอพัก', 'error');
        }
      },
    });
  }

  // อัปเดตสถิติ
  private updateStatistics(): void {
    if (!this.dorms) return;

    this.totalDorms = this.dorms.length;
    this.pendingDorms = this.dorms.filter(
      (dorm) =>
        dorm.approval_status === 'pending' ||
        dorm.approval_status === 'รออนุมัติ',
    ).length;
    this.approvedDorms = this.dorms.filter(
      (dorm) =>
        dorm.approval_status === 'approved' ||
        dorm.approval_status === 'อนุมัติ',
    ).length;
    this.rejectedCount = this.dorms.filter(
      (dorm) =>
        dorm.approval_status === 'rejected' ||
        dorm.approval_status === 'ไม่อนุมัติ',
    ).length;
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

  // Bulk operations for selected dormitories
  approveSelectedDorms(): void {
    if (this.selectedDorms.length === 0) return;

    this.bulkConfirmTitle = 'ยืนยันการอนุมัติ';
    this.bulkConfirmMessage = `คุณแน่ใจหรือไม่ที่จะอนุมัติหอพัก ${this.selectedDorms.length} แห่งที่เลือก?`;
    this.bulkConfirmType = 'approve';
    this.showBulkConfirmModal = true;
  }

  rejectSelectedDorms(): void {
    if (this.selectedDorms.length === 0) return;

    this.bulkConfirmTitle = 'ยืนยันการไม่อนุมัติ';
    this.bulkConfirmMessage = `คุณแน่ใจหรือไม่ที่จะปฏิเสธการอนุมัติหอพัก ${this.selectedDorms.length} แห่งที่เลือก?`;
    this.bulkConfirmType = 'reject';
    this.showBulkConfirmModal = true;
  }

  deleteSelectedDorms(): void {
    if (this.selectedDorms.length === 0) return;

    this.bulkConfirmTitle = 'ยืนยันการลบ';
    this.bulkConfirmMessage = `คุณแน่ใจหรือไม่ที่จะลบหอพักทั้ง ${this.selectedDorms.length} แห่งที่เลือก?`;
    this.bulkConfirmType = 'delete';
    this.showBulkConfirmModal = true;
  }

  confirmBulkAction(): void {
    if (!this.bulkConfirmType || this.selectedDorms.length === 0) return;

    this.isProcessingBulk = true;

    if (this.bulkConfirmType === 'approve') {
      this.executeBulkApproval();
    } else if (this.bulkConfirmType === 'reject') {
      this.executeBulkRejection();
    } else if (this.bulkConfirmType === 'delete') {
      this.executeBulkDelete();
    }
  }

  private executeBulkApproval(): void {
    const approvePromises = this.selectedDorms.map((dormId) =>
      this.adminService
        .updateDormitoryApproval(dormId, { status: 'อนุมัติ' })
        .toPromise(),
    );

    Promise.all(approvePromises)
      .then(() => {
        this.showToastNotification(
          `อนุมัติหอพัก ${this.selectedDorms.length} แห่งเรียบร้อยแล้ว`,
          'success',
        );
        this.finalizeBulkAction();
      })
      .catch((error) => {
        this.handleBulkError('อนุมัติ', error);
      });
  }

  private executeBulkRejection(): void {
    const rejectPromises = this.selectedDorms.map((dormId) =>
      this.adminService
        .updateDormitoryApproval(dormId, {
          status: 'ไม่อนุมัติ',
          rejectionReason: this.rejectionReason || 'ไม่ระบุเหตุผล',
        })
        .toPromise(),
    );

    Promise.all(rejectPromises)
      .then(() => {
        this.showToastNotification(
          `ไม่อนุมัติหอพัก ${this.selectedDorms.length} แห่งเรียบร้อยแล้ว`,
          'success',
        );
        this.finalizeBulkAction();
      })
      .catch((error) => {
        this.handleBulkError('ไม่อนุมัติ', error);
      });
  }

  private executeBulkDelete(): void {
    const deletePromises = this.selectedDorms.map((dormId) =>
      this.adminService.deleteDormitory(dormId).toPromise(),
    );

    Promise.all(deletePromises)
      .then(() => {
        this.showToastNotification(
          `ลบหอพัก ${this.selectedDorms.length} แห่งเรียบร้อยแล้ว`,
          'success',
        );
        this.finalizeBulkAction();
      })
      .catch((error) => {
        this.handleBulkError('ลบ', error);
      });
  }

  private finalizeBulkAction(): void {
    this.selectedDorms = [];
    this.showBulkConfirmModal = false;
    this.isProcessingBulk = false;
    this.bulkConfirmType = null;
    this.loadDormitories();
  }

  private handleBulkError(action: string, error: any): void {
    console.error(`Error during bulk ${action}:`, error);
    this.showToastNotification(
      `เกิดข้อผิดพลาดในการ${action}หอพัก: ` +
        (error.error?.message || 'ไม่ทราบสาเหตุ'),
      'error',
    );
    this.isProcessingBulk = false;
    this.showBulkConfirmModal = false;
  }

  cancelBulkAction(): void {
    this.showBulkConfirmModal = false;
    this.bulkConfirmType = null;
    this.bulkConfirmTitle = '';
    this.bulkConfirmMessage = '';
  }

  // Helper method to toggle dormitory selection
  toggleDormSelection(dormId: string): void {
    const index = this.selectedDorms.indexOf(dormId);
    if (index > -1) {
      this.selectedDorms.splice(index, 1); // Remove if already selected
    } else {
      this.selectedDorms.push(dormId); // Add if not selected
    }
  }

  // Helper method to check if dormitory is selected
  isDormSelected(dormId: string): boolean {
    return this.selectedDorms.includes(dormId);
  }

  // Getter to check if all current dorms are selected
  get areAllCurrentDormsSelected(): boolean {
    const currentDorms =
      this.selectedTab === 'pending'
        ? this.getPendingDorms()
        : this.selectedTab === 'rejected'
          ? this.getRejectedDorms()
          : this.getApprovedDorms();
    if (currentDorms.length === 0) return false;

    return currentDorms.every((dorm) =>
      this.selectedDorms.includes(dorm.dorm_id),
    );
  }

  // Helper method to select/deselect all dormitories
  toggleSelectAll(): void {
    const currentDorms =
      this.selectedTab === 'pending'
        ? this.getPendingDorms()
        : this.selectedTab === 'rejected'
          ? this.getRejectedDorms()
          : this.getApprovedDorms();
    const currentDormIds = currentDorms.map((dorm) => dorm.dorm_id);

    if (currentDormIds.every((id) => this.selectedDorms.includes(id))) {
      // If all current dorms are selected, deselect them
      this.selectedDorms = this.selectedDorms.filter(
        (id) => !currentDormIds.includes(id),
      );
    } else {
      // Select all current dormitories
      this.selectedDorms = [
        ...new Set([...this.selectedDorms, ...currentDormIds]),
      ];
    }
  }

  // Methods for pending dorms selection
  toggleSelectAllPending(): void {
    const pendingDorms = this.getPendingDorms();
    const pendingDormIds = pendingDorms.map((dorm) => dorm.dorm_id);

    if (pendingDormIds.every((id) => this.selectedDorms.includes(id))) {
      // If all pending dorms are selected, deselect them
      this.selectedDorms = this.selectedDorms.filter(
        (id) => !pendingDormIds.includes(id),
      );
      this.areAllPendingDormsSelected = false;
    } else {
      // Select all pending dormitories
      this.selectedDorms = [
        ...new Set([...this.selectedDorms, ...pendingDormIds]),
      ];
      this.areAllPendingDormsSelected = true;
    }
  }

  approveSelectedPendingDorms(): void {
    if (this.selectedPendingDorms.length === 0) return;

    this.bulkConfirmTitle = 'ยืนยันการอนุมัติ';
    this.bulkConfirmMessage = `คุณแน่ใจหรือไม่ที่จะอนุมัติหอพัก ${this.selectedPendingDorms.length} แห่งที่เลือก?`;
    this.bulkConfirmType = 'approve';
    this.showBulkConfirmModal = true;
  }

  rejectSelectedPendingDorms(): void {
    if (this.selectedPendingDorms.length === 0) return;

    this.bulkConfirmTitle = 'ยืนยันการไม่อนุมัติ';
    this.bulkConfirmMessage = `คุณแน่ใจหรือไม่ที่จะปฏิเสธการอนุมัติหอพัก ${this.selectedPendingDorms.length} แห่งที่เลือก?`;
    this.bulkConfirmType = 'reject';
    this.rejectionReason = ''; // Reset reason
    this.showBulkConfirmModal = true;
  }

  // Getter for selected pending dorms count
  get selectedPendingDorms(): any[] {
    return this.getPendingDorms().filter((dorm) =>
      this.selectedDorms.includes(dorm.dorm_id),
    );
  }
}
