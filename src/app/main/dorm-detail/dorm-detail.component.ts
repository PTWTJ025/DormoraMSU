import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from "../navbar/navbar.component";
import { DormitoryService, DormDetail, Dorm, Amenity, RoomType } from '../../services/dormitory.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MapService } from '../../services/map.service';
import { AuthService } from '../../services/auth.service';
import { SentimentService } from '../../services/sentiment.service';
import { DormCompareService, CompareDormItem } from '../../services/dorm-compare.service';
import { ComparePopupComponent } from '../shared/compare-popup/compare-popup.component';

interface AmenityDisplay {
  amenity_id: number;
  name: string;
  available: boolean;
}

interface Review {
  id?: number; // ID ของรีวิวจาก API
  username: string;
  avatar: string;
  comment: string;
  rating: number;
  isPositive: boolean;
  date: Date;
  isResident?: boolean; // เป็นสมาชิกหอพักหรือไม่
  isCurrentUser?: boolean; // เป็นรีวิวของผู้ใช้ปัจจุบันหรือไม่
  isEditing?: boolean; // กำลังแก้ไขหรือไม่
  editComment?: string; // ข้อความที่กำลังแก้ไข
  saving?: boolean; // กำลังบันทึกอยู่เพื่อกันการกดซ้ำ
}

interface SimilarProperty {
  id: number;
  name: string;
  dailyPrice?: string;
  monthlyPrice?: string;
  price: string;
  location: string;
  zone?: string;
  image: string;
  rating: number;
  date: string;
}

type SentimentType = 'positive' | 'negative' | 'neutral';

@Component({
  selector: 'app-dorm-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ComparePopupComponent],
  templateUrl: './dorm-detail.component.html',
  styleUrls: ['./dorm-detail.component.css']
})
export class DormDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('map') mapContainer!: ElementRef;

  dormId: number = 0;
  dormDetail: DormDetail | null = null;
  // สถานะห้อง (normalize) สำหรับใช้ในเทมเพลต
  statusDorm: string = '';

  // UI state
  currentImageIndex: number = 0;
  images: string[] = [];
  newComment: string = '';
  isLoading: boolean = true;
  error: string | null = null;
  
  // Image modal state
  showImageModal: boolean = false;
  modalImageIndex: number = 0;

  // Mock data (จะถูกแทนที่ด้วยข้อมูลจริง)
  dormName: string = '';
  dormPrice: string = '';
  priceRange: string = '';
  location: string = '';
  owner: string = '';
  description: string = '';
  amenities: AmenityDisplay[] = [];
  roomTypes: RoomType[] = [];

  // Owner contact information from API
  ownerContact = {
    name: '',
    phone: '',
    secondaryPhone: '',
    lineId: '',
    email: '',
    image: '../../../assets/images/image-removebg-preview.png'
  };

  // Map properties - ป้องกัน race conditions
  showMap: boolean = false;
  mapLatitude: number | null = null;
  mapLongitude: number | null = null;
  private mapState = {
    initialized: false,
    initializing: false,
    initPromise: null as Promise<void> | null
  };

  // Auth related
  isLoggedIn: boolean = false;
  userAvatar: string = '';
  isOwner: boolean = false;
  currentUserId: number | null = null;
  canReview: boolean = false;
  reviewEligibilityMessage: string = '';
  isResident: boolean = false; // เป็นสมาชิกหอพักนี้หรือไม่
  isPendingApproval: boolean = false; // แยกสถานะรออนุมัติออกจากเหตุผลอื่น
  
  // Review related
  sentimentResult: SentimentType | null = null;
  selectedRating: number = 5; // คะแนนที่ผู้ใช้เลือก (เริ่มต้น 5 ดาว)
  
  // Reviews data
  overallRating: number = 5.0;
  reviews: Review[] = [];

  // Auto-grow textarea on input
  autoGrow(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  }

  // Loading states to prevent duplicate actions
  isSubmittingComment: boolean = false;
  
  // Compare state
  isInCompareList: boolean = false;
  
  // Compare state
  isInCompare: boolean = false;

  // Similar properties (using real data)
  similarProperties: SimilarProperty[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dormitoryService: DormitoryService,
    private dormService: DormitoryService,
    private mapService: MapService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private sentimentService: SentimentService,
    public dormCompareService: DormCompareService
  ) { }

  // Popup state
  isPopupVisible = false;
  popupMessage = '';
  popupType: 'success' | 'error' | 'warning' | 'info' = 'info';
  private popupTimeoutHandle: any = null;

  private triggerPopup(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', durationMs: number = 2500) {
    this.popupMessage = message;
    this.popupType = type;
    this.isPopupVisible = true;
    if (this.popupTimeoutHandle) {
      clearTimeout(this.popupTimeoutHandle);
    }
    this.popupTimeoutHandle = setTimeout(() => {
      this.isPopupVisible = false;
    }, durationMs);
  }

  hidePopup() {
    if (this.popupTimeoutHandle) {
      clearTimeout(this.popupTimeoutHandle);
      this.popupTimeoutHandle = null;
    }
    this.isPopupVisible = false;
  }

  ngOnInit(): void {
    // Check login status
    this.checkLoginStatus();
    
    // Subscribe to compare list changes
    this.dormCompareService.compareIds$.subscribe(ids => {
      this.isInCompareList = ids.includes(this.dormId);
    });
    
    // รับ dormId จาก URL และโหลดข้อมูล
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id && !isNaN(+id) && +id > 0) {
        this.dormId = +id;
        // ตรวจสอบสถานะเปรียบเทียบ
        this.isInCompareList = this.dormCompareService.isInCompare(this.dormId);
        // ทำลายแมพเก่าเมื่อเปลี่ยน dormId
        this.resetMapState();
        
        // ตรวจสอบสิทธิ์/โหลดข้อมูล หลัง token พร้อม แล้วรันพร้อมกัน
        // removed verbose log
        this.authService.refreshToken(false)
          .catch(err => {
            console.warn('[DormDetail] Token not ready, continue anyway:', err);
          })
          .finally(() => {
            this.checkReviewEligibility();
            this.loadReviews();
            this.loadDormitoryDetail();
            this.loadSimilarDormitories();
          });
      } else {
        this.error = 'ไม่พบรหัสหอพัก หรือรหัสหอพักไม่ถูกต้อง';
        this.isLoading = false;
        setTimeout(() => {
          this.router.navigate(['/main']);
        }, 2000);
      }
    });
  }

  ngAfterViewInit(): void {
    // ลองโหลดแผนที่หลังจาก View พร้อม
    this.tryInitializeMap();
  }

  // Method สำหรับรีเซ็ต map state
  private resetMapState(): void {
    try {
      this.mapService.destroyMap();
    } catch (error) {
      console.warn('[DormDetail] Error destroying map:', error);
    }
    this.mapState.initialized = false;
    this.mapState.initializing = false;
    this.mapState.initPromise = null;
  }

  ngOnDestroy(): void {
    // ใช้ MapService ในการ destroy map - ปรับปรุงให้ใช้ container-specific destroy
    if (this.mapContainer) {
      this.mapService.destroyMapByContainer('dorm-detail-map');
    } else {
      this.mapService.destroyMap();
    }
    this.mapState.initialized = false;
    this.mapState.initializing = false;
    this.mapState.initPromise = null;
  }

  // Public method for retry loading
  retryLoad(): void {
    this.loadDormitoryDetail();
  }

  // Public method for going back
  goBack(): void {
    this.router.navigate(['/main']);
  }

  // *** Loading state management - ป้องกัน race conditions ***
  public loadingState = {
    detail: false,
    amenities: false,
    similar: false,
    loadDetailPromise: null as Promise<void> | null
  };

  private async loadDormitoryDetail() {
    // Return existing promise if already loading
    if (this.loadingState.loadDetailPromise) {
      return this.loadingState.loadDetailPromise;
    }

    this.loadingState.loadDetailPromise = this.loadDormitoryDetailSafely();
    return this.loadingState.loadDetailPromise;
  }

  private async loadDormitoryDetailSafely(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;
      this.loadingState.detail = true;
      this.loadingState.amenities = true;

      // โหลด amenities และ detail พร้อมกัน แต่รอทั้งคู่เสร็จ
      const [allAmenities, detail] = await Promise.all([
        this.dormService.getAllAmenities().toPromise(),
        this.dormService.getDormitoryById(this.dormId).toPromise()
      ]);

      if (!detail) {
        throw new Error('ไม่พบข้อมูลหอพัก');
      }

      // remove verbose debug logs
      
      
      
      
      
      

      // ตรวจสอบสถานะการอนุมัติ
      if (detail.approval_status === 'รออนุมัติ') {
        this.error = 'หอพักนี้ยังรออนุมัติ ไม่สามารถเข้าถึงได้';
        this.isLoading = false;
        this.loadingState.detail = false;
        this.loadingState.amenities = false;
        return;
      }

      // จัดการข้อมูลหอพัก
      this.dormDetail = detail;
      this.dormName = detail.dorm_name;
      this.location = detail.address;

      // จัดการรูปภาพ
      if (detail.images && detail.images.length > 0) {
        this.images = detail.images.map(img => img.image_url);
      }

      // จัดการราคา
      if (detail.min_price != null && detail.max_price != null) {
        const minVal = Number(detail.min_price);
        const maxVal = Number(detail.max_price);
        this.priceRange = (minVal === maxVal)
          ? `${minVal.toLocaleString()} บาท/เดือน`
          : `${minVal.toLocaleString()} - ${maxVal.toLocaleString()} บาท/เดือน`;
      } else if (detail.monthly_price != null) {
        this.dormPrice = `${detail.monthly_price.toLocaleString()} บาท/เดือน`;
      }

      // จัดการสถานะห้อง (ว่าง/เต็ม) ให้เทมเพลตใช้งานได้สะดวก
      this.statusDorm = ((detail as any).status_dorm || (detail as any).status || '').toString();

      // โหลด room types
      try {
        const rts = await this.dormService.getRoomTypes(this.dormId).toPromise();
        
        this.roomTypes = Array.isArray(rts) ? rts : [];
        
      } catch (e) {
        console.error('Error loading room types:', e);
        this.roomTypes = [];
      }

      // จัดการ amenities
      if (allAmenities && detail.amenities) {
        this.amenities = this.processAmenities(allAmenities, detail.amenities);
      }

      // จัดการข้อมูล contact เจ้าของหอ
      this.ownerContact = {
        name: detail.owner_manager_name || detail.owner_name || 'เจ้าของหอพัก',
        phone: detail.owner_phone || '',
        secondaryPhone: detail.owner_secondary_phone || '',
        lineId: detail.owner_line_id || '',
        email: detail.owner_email || '',
        image: detail.owner_photo_url || '../../../assets/images/image-removebg-preview.png'
      };
      

      // ตั้งค่าแผนที่
      this.setupMapData(detail);

      // ลองโหลดแผนที่อีกครั้งหลังจากข้อมูลโหลดเสร็จ
      setTimeout(() => {
        this.tryInitializeMap();
      }, 100);

    } catch (error: any) {
      console.error('Error loading dormitory detail:', error);
      this.error = error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก';

      // ถ้าไม่พบข้อมูล (404) ให้นำทางกลับหน้าหลัก
      if (error.status === 404) {
        setTimeout(() => {
          this.router.navigate(['/main']);
        }, 2000);
      }
    } finally {
      this.isLoading = false;
      this.loadingState.detail = false;
      this.loadingState.amenities = false;
      this.loadingState.loadDetailPromise = null;
    }
  }

  private processAmenities(allAmenities: Amenity[], dormAmenities: any[]): AmenityDisplay[] {
    // สร้าง Set ของ amenity_id ที่หอพักมี
    const dormAmenityIds = new Set(dormAmenities.map(da =>
      // ตรวจสอบว่ามี amenity_id หรือไม่ ถ้าไม่มีให้ใช้ id แทน
      da.amenity_id || da.id
    ));

    // สร้างรายการสิ่งอำนวยความสะดวกทั้งหมดพร้อมสถานะ
    return allAmenities.map(amenity => ({
      amenity_id: amenity.amenity_id,
      name: amenity.name,
      available: dormAmenityIds.has(amenity.amenity_id)
    }));
  }

  private async loadSimilarDormitories() {
    this.loadingState.similar = true;
    try {
      console.log('[DormDetail] Loading similar dormitories...');
      // ใช้ getRecommended เพื่อดึงหอพักแนะนำมาแสดงเป็นหอพักที่คล้ายกัน
      const dorms = await this.dormService.getRecommended(5).toPromise();
      if (dorms && Array.isArray(dorms)) {
        console.log('[DormDetail] Received dorms:', dorms.length);
        // กรองออกหอพักปัจจุบัน
        const filteredDorms = dorms.filter(d => d.dorm_id !== this.dormId);
        console.log('[DormDetail] Filtered dorms (excluding current):', filteredDorms.length);

        // แปลงข้อมูลให้ตรงกับ interface SimilarProperty
        this.similarProperties = filteredDorms.slice(0, 4).map(d => this.mapDormToSimilarProperty(d));
        console.log('[DormDetail] Similar properties loaded:', this.similarProperties.length);
      } else {
        console.warn('[DormDetail] No dorms received or invalid format');
        this.similarProperties = [];
      }
    } catch (error) {
      console.error('[DormDetail] Error loading similar dormitories:', error);
      this.similarProperties = [];
    } finally {
      this.loadingState.similar = false;
    }
  }

  private mapDormToSimilarProperty(dorm: Dorm): SimilarProperty {
    

    let priceDisplay = '';
    let dailyPrice: string | undefined;
    let monthlyPrice: string | undefined;

    // จัดการแสดงราคา
    if (dorm.daily_price) {
      dailyPrice = `${dorm.daily_price} บาท/วัน`;
      priceDisplay = dailyPrice;
    }

    if (dorm.monthly_price) {
      monthlyPrice = `${dorm.monthly_price} บาท/เดือน`;
      if (!priceDisplay) {
        priceDisplay = monthlyPrice;
      }
    }

    if (dorm.min_price != null && dorm.max_price != null) {
      const minVal = Number(dorm.min_price);
      const maxVal = Number(dorm.max_price);
      monthlyPrice = (minVal === maxVal)
        ? `${minVal.toLocaleString()} บาท/เดือน`
        : `${minVal.toLocaleString()} - ${maxVal.toLocaleString()} บาท/เดือน`;
      if (!priceDisplay) {
        priceDisplay = monthlyPrice;
      }
    } else if (dorm.price_display && !dailyPrice && !monthlyPrice) {
      priceDisplay = dorm.price_display;
    }

    // จัดการแสดงที่ตั้ง - แยกโซนออกมา
    let locationDisplay = dorm.location_display || dorm.address || '';
    let zoneDisplay = dorm.zone_name || '';

    // ใช้ avg_rating จาก API ใหม่ หรือ fallback ไป rating เก่า
    // แปลง string เป็น number ก่อน
    const avgRating = (dorm as any).avg_rating;
    const finalRating = avgRating ? Number(avgRating) : (dorm.rating || 0.0);

    return {
      id: dorm.dorm_id,
      name: dorm.dorm_name,
      dailyPrice: dailyPrice,
      monthlyPrice: monthlyPrice,
      price: priceDisplay,
      location: locationDisplay,
      zone: zoneDisplay,
      image: dorm.main_image_url || dorm.thumbnail_url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      rating: finalRating,
      date: dorm.updated_date ? this.formatThaiDate(dorm.updated_date) : '',
    };
  }

  // เพิ่ม method สำหรับการนำทางไปยังหอพักที่คล้ายกัน
  viewSimilarDorm(id: number) {
    this.router.navigate(['/dorm-detail', id.toString()]).then(() => {
      // Scroll ไปด้านบนของหน้าเมื่อเปลี่ยนหน้าเสร็จ
      window.scrollTo(0, 0);
    });
  }

  private setupMapData(detail: DormDetail): void {
    if (detail.latitude && detail.longitude) {
      try {
        let lat = typeof detail.latitude === 'string' ? parseFloat(detail.latitude) : detail.latitude;
        let lng = typeof detail.longitude === 'string' ? parseFloat(detail.longitude) : detail.longitude;

        if (!isNaN(lat) && !isNaN(lng)) {
          
          this.mapLatitude = lat;
          this.mapLongitude = lng;
          this.showMap = true;
        } else {
          console.error('Invalid coordinates after parsing:', { lat, lng });
        }
      } catch (error) {
        console.error('Error in setupMapData:', error);
      }
    } else {
      console.error('No coordinates in detail:', detail);
    }
  }

  // ฟังก์ชันใหม่สำหรับการลองโหลดแผนที่ - ป้องกัน race conditions
  private tryInitializeMap(): void {
    // Return existing promise if already initializing
    if (this.mapState.initPromise) {
      return;
    }

    if (this.mapState.initialized || !this.showMap || !this.mapLatitude || !this.mapLongitude) {
      return;
    }

    if (this.mapState.initializing) {
      return;
    }

    this.mapState.initializing = true;
    this.mapState.initPromise = this.initializeMapSafely();
  }

  private async initializeMapSafely(): Promise<void> {
    try {
    const mapContainer = document.getElementById('map');
    if (mapContainer && this.dormDetail) {
      
        
        // ตรวจสอบว่า map container มีขนาดที่เหมาะสม
        if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // ทำลาย map เก่าก่อนสร้างใหม่เสมอ เพื่อป้องกัน WebGL context issues
        this.mapService.destroyMap();
        
        // รอสักครู่เพื่อให้ DOM มีเวลา update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        this.mapService.initializeMap(
          'map', 
          this.mapLatitude!, 
          this.mapLongitude!, 
          this.dormName, 
          this.location, 
          this.dormDetail
        );
        
        this.mapState.initialized = true;
        
    } else {
      
      // ลองอีกครั้งหลังจาก 200ms
        await new Promise(resolve => setTimeout(resolve, 200));
        if (!this.mapState.initialized) {
          this.mapState.initializing = false;
          this.mapState.initPromise = null;
          this.tryInitializeMap();
        }
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      // ลองอีกครั้งหลังจาก 1 วินาที
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!this.mapState.initialized) {
        this.mapState.initializing = false;
        this.mapState.initPromise = null;
        this.tryInitializeMap();
      }
    } finally {
      this.mapState.initializing = false;
      this.mapState.initPromise = null;
    }
  }

  // Image gallery methods
  prevImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    } else {
      this.currentImageIndex = this.images.length - 1;
    }
  }

  nextImage(): void {
    if (this.currentImageIndex < this.images.length - 1) {
      this.currentImageIndex++;
    } else {
      this.currentImageIndex = 0;
    }
  }

  setCurrentImage(index: number): void {
    this.currentImageIndex = index;
  }

  // Image modal methods
  openImageModal(index: number = this.currentImageIndex): void {
    this.modalImageIndex = index;
    this.showImageModal = true;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeImageModal(): void {
    this.showImageModal = false;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  prevModalImage(): void {
    if (this.modalImageIndex > 0) {
      this.modalImageIndex--;
    } else {
      this.modalImageIndex = this.images.length - 1;
    }
  }

  nextModalImage(): void {
    if (this.modalImageIndex < this.images.length - 1) {
      this.modalImageIndex++;
    } else {
      this.modalImageIndex = 0;
    }
  }

  onModalKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.closeImageModal();
        break;
      case 'ArrowLeft':
        this.prevModalImage();
        break;
      case 'ArrowRight':
        this.nextModalImage();
        break;
    }
  }

  // Add to favorites method
  addToFavorites(): void {
    this.triggerPopup('เพิ่มในรายการโปรดแล้ว!', 'success');
  }

  // Contact owner method
  contactOwner(): void {
    if (this.ownerContact.phone) {
      window.location.href = `tel:${this.ownerContact.phone}`;
    } else {
      this.triggerPopup('ไม่พบข้อมูลการติดต่อ', 'error');
    }
  }

  // Contact owner via secondary phone
  contactOwnerSecondary(): void {
    if (this.ownerContact.secondaryPhone) {
      window.location.href = `tel:${this.ownerContact.secondaryPhone}`;
    } else {
      this.triggerPopup('ไม่พบเบอร์โทรสำรอง', 'error');
    }
  }

  // Contact owner via email
  contactOwnerEmail(): void {
    if (this.ownerContact.email) {
      window.location.href = `mailto:${this.ownerContact.email}`;
    } else {
      this.triggerPopup('ไม่พบอีเมล', 'error');
    }
  }

  // Utility rate display methods
  getWaterRateDisplay(): string {
    if (!this.dormDetail?.water_type) return '';
    
    // ถ้าเป็นตามมิเตอร์ ให้แสดงเป็นตามอัตราการประปา
    if (this.dormDetail.water_type === 'ตามมิเตอร์') {
      return 'ตามอัตราการประปา';
    }
    
    // กรณีอื่นๆ แสดงตามปกติ
    return `${this.dormDetail.water_rate} บาท/ยูนิต`;
  }

  getElectricityRateDisplay(): string {
    if (!this.dormDetail?.electricity_type) return '';
    
    // ถ้าเป็นตามมิเตอร์ ให้แสดงเป็นตามอัตราการไฟฟ้า
    if (this.dormDetail.electricity_type === 'ตามมิเตอร์') {
      return 'ตามอัตราการไฟฟ้า';
    }
    
    // กรณีอื่นๆ แสดงตามปกติ
    return `${this.dormDetail.electricity_rate} บาท/ยูนิต`;
  }

  getWaterTypeDisplay(): string {
    if (!this.dormDetail?.water_type) return '';
    
    // ถ้าเป็นตามมิเตอร์ ให้แสดงเป็นตามอัตราการประปา
    if (this.dormDetail.water_type === 'ตามมิเตอร์') {
      return 'ตามอัตราการประปา';
    }
    
    return this.dormDetail.water_type;
  }

  getElectricityTypeDisplay(): string {
    if (!this.dormDetail?.electricity_type) return '';
    
    // ถ้าเป็นตามมิเตอร์ ให้แสดงเป็นตามอัตราการไฟฟ้า
    if (this.dormDetail.electricity_type === 'ตามมิเตอร์') {
      return 'ตามอัตราการไฟฟ้า';
    }
    
    return this.dormDetail.electricity_type;
  }

  // Helper methods for avatars
  getUserAvatarUrl(): string {
    // ถ้ามีรูปโปรไฟล์ ให้ใช้รูปนั้น
    if (this.userAvatar && this.userAvatar !== '../../../assets/images/image-removebg-preview.png') {
      return this.userAvatar;
    }
    
    // ถ้าไม่มีรูป ให้ใช้ cat avatar.jpg เป็นค่าเริ่มต้นสำหรับสมาชิก
    return 'assets/icon/cat avatar.jpg';
  }

  getReviewerAvatarUrl(review: Review): string {
    // ถ้ามีรูปโปรไฟล์ ให้ใช้รูปนั้น
    if (review.avatar && review.avatar !== '../../../assets/images/image-removebg-preview.png') {
      return review.avatar;
    }
    
    // ถ้าไม่มีรูป ให้ใช้ cat avatar.jpg เป็นค่าเริ่มต้นสำหรับผู้รีวิว
    return 'assets/icon/cat avatar.jpg';
  }

  getOwnerContactAvatarUrl(): string {
    // ถ้ามีรูปโปรไฟล์เจ้าของหอพัก ให้ใช้รูปนั้น
    if (this.ownerContact?.image) {
      return this.ownerContact.image;
    }
    
    // ถ้าไม่มีรูป ให้ใช้ home-owner.png เป็นค่าเริ่มต้นสำหรับเจ้าของหอพัก
    return 'assets/icon/home-owner.png';
  }

  // Rating selection methods
  selectRating(rating: number): void {
    this.selectedRating = rating;
  }

  getRatingStars(): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }

  // Reviews methods
  private checkLoginStatus(): void {
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      
      if (user) {
        this.userAvatar = user.photoURL || '';
        this.currentUserId = user.id;
        
      } else {
        this.currentUserId = null;
        
      }
    });
  }

  private checkReviewEligibility(): void {
    // ถ้าไม่มี currentUserId แสดงว่าไม่ได้ล็อกอิน ไม่ต้องเช็ค API
    if (!this.currentUserId) {
      this.canReview = false;
      this.reviewEligibilityMessage = 'กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น';
      return;
    }

    // ตรวจสอบสิทธิ์การรีวิวผ่าน API (เฉพาะผู้ใช้ที่ล็อกอินแล้ว)
    const uid = this.currentUserId;
    this.dormitoryService.checkReviewEligibility(this.dormId, uid).subscribe({
      next: (response) => {
        // Debug: แสดง raw response ที่ได้รับ
        
        
        // ใช้ field names ที่ตรงกับ API response จาก backend
        // ตรวจสอบ field can_review ก่อน (ตาม API spec ที่ Backend ส่งมา)
        if ((response as any).can_review !== undefined) {
          this.canReview = (response as any).can_review;
          
        } else if (response.canReview !== undefined) {
          this.canReview = response.canReview;
          
        } else if ((response as any).isEligible !== undefined) {
          this.canReview = (response as any).isEligible;
          
        } else {
          this.canReview = false;
          
        }
        
        // จัดการเหตุผลจาก backend และเคสพิเศษ (เคยรีวิวแล้ว / ไม่ใช่ผู้พักอาศัย)
        const backendReason = (response as any).reason || response.message || '';
        this.isPendingApproval = (response as any).status === 'pending_approval';

        const hasReviewed = (response as any).has_reviewed === true || (response as any).hasReviewed === true;
        if (hasReviewed) {
          this.canReview = false;
          this.reviewEligibilityMessage = 'คุณได้แสดงความคิดเห็นสำหรับหอนี้ไปแล้ว';
        } else if ((response as any).status === 'not_resident' || (response as any).is_resident === false) {
          this.canReview = false;
          this.reviewEligibilityMessage = 'เฉพาะสมาชิกที่อยู่อาศัยในหอพักนี้เท่านั้นที่สามารถแสดงความคิดเห็นได้';
        } else if (!this.canReview && !this.isPendingApproval) {
          // เคสอื่นๆที่ backend ไม่อนุญาต
          this.reviewEligibilityMessage = backendReason || 'ไม่สามารถแสดงความคิดเห็นได้';
        } else {
          this.reviewEligibilityMessage = backendReason;
        }
        
        // Debug: แสดง field values ที่ตรวจสอบ
        
        
        // Debug: แสดง reason/message
        
        
        // Debug: แสดง has_reviewed field
        
      },
      error: (error) => {
        console.error('[DormDetail] Error checking review eligibility:', error);
        this.canReview = false;
        this.reviewEligibilityMessage = 'ไม่สามารถตรวจสอบสิทธิ์การรีวิวได้';
      }
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login'], { 
      queryParams: { returnUrl: this.router.url } 
    });
  }

  addComment(comment: string): void {
    if (!comment?.trim()) return;
    
    // ป้องกันการส่งข้อความว่าง
    const trimmedComment = comment.trim();
    if (trimmedComment.length === 0) {
      return;
    }

    // ตรวจสอบสถานะการล็อกอิน
    if (!this.isLoggedIn) {
      this.navigateToLogin();
      return;
    }

    if (this.isSubmittingComment) return; // กันการกดซ้ำ
    this.isSubmittingComment = true;

    // ส่งรีวิวไปยัง API - ส่งเฉพาะ comment (AI จะทำการ auto-rating)
    this.dormitoryService.createReview(this.dormId, {
      comment: trimmedComment
    }).subscribe({
      next: (response) => {
        
        
        // ให้ผู้ใช้เลือกคะแนนเอง แต่ใช้ AI เป็นคำแนะนำ
        const userRating = this.selectedRating || 5; // ใช้คะแนนที่ผู้ใช้เลือก
        const aiSuggestedRating = response.predicted_rating || userRating; // AI แนะนำ
        
        // แสดงการเปรียบเทียบถ้าต่างกันมาก
        if (Math.abs(userRating - aiSuggestedRating) >= 2) {
          console.log(`[Review] คะแนนที่เลือก: ${userRating}, AI แนะนำ: ${aiSuggestedRating}`);
        }
        
        // เพิ่มความคิดเห็นใหม่ในรายการ
        const newReview: Review = {
          username: 'ผู้ใช้งาน',
          avatar: this.getUserAvatarUrl(),
          comment: trimmedComment,
          rating: userRating, // ใช้คะแนนที่ผู้ใช้เลือก
          isPositive: userRating >= 3,
          date: new Date(),
          isResident: true, // เนื่องจากผ่านการตรวจสอบสิทธิ์แล้ว
          isCurrentUser: true // เป็นรีวิวของผู้ใช้ปัจจุบัน
        };
        
        this.reviews.unshift(newReview);
        this.newComment = '';
        this.isSubmittingComment = false;
        
        // โหลดรีวิวใหม่จาก API เพื่อให้ได้ข้อมูลล่าสุด
        this.loadReviews();
        
        // ตรวจสอบสิทธิ์การรีวิวใหม่หลังจากส่งรีวิวเสร็จ
        this.checkReviewEligibility();
      },
      error: (error) => {
        console.error('[DormDetail] Error creating review:', error);
        
        // จัดการ error message ใหม่ตามที่ backend แจ้งมา
        let errorMessage = 'ไม่สามารถส่งรีวิวได้';
        
        if (error.error?.message) {
          if (error.error.message.includes('รอการอนุมัติ')) {
            errorMessage = 'ต้องรอการอนุมัติจากเจ้าของหอพักก่อน';
            // อัปเดตสถานะการรีวิว
            this.canReview = false;
            this.reviewEligibilityMessage = errorMessage;
          } else {
            errorMessage = error.error.message;
          }
        } else if (error.status === 403) {
          errorMessage = 'คุณไม่มีสิทธิ์รีวิวหอพักนี้';
        } else if (error.status === 401) {
          errorMessage = 'กรุณาเข้าสู่ระบบก่อนรีวิว';
          this.navigateToLogin();
          return;
        }
        
        this.triggerPopup(errorMessage, 'warning');
        this.isSubmittingComment = false;
      }
    });
  }

  private loadReviews(): void {
    // โหลดรีวิวจาก API จริงเท่านั้น
    this.dormitoryService.getDormitoryReviews(this.dormId).subscribe({
      next: (response) => {
        
        
        // จัดการ API response ที่มี structure {reviews: Array} หรือ array โดยตรง
        let reviews = response;
        if (response && typeof response === 'object' && (response as any).reviews) {
          reviews = (response as any).reviews;
        }
        
        // ตรวจสอบว่า reviews เป็น array หรือไม่
        if (!Array.isArray(reviews)) {
          console.warn('[DormDetail] Reviews is not an array:', reviews);
          this.reviews = [];
          this.overallRating = 0;
          return;
        }
        
        this.reviews = reviews.map(review => ({
          id: review.review_id || review.id, // ID ของรีวิวจาก API
          username: review.username || 'ผู้ใช้งาน',
          avatar: review.avatar || '',
          comment: review.comment,
          rating: review.predicted_rating || review.rating, // ใช้ predicted_rating จาก AI
          isPositive: (review.predicted_rating || review.rating) >= 3,
          date: new Date(review.review_date || review.created_at),
          isResident: review.is_resident || false,
          isCurrentUser: review.user_id === this.currentUserId // ตรวจสอบว่าเป็นรีวิวของผู้ใช้ปัจจุบัน
        }));
        
        // คำนวณ overall rating จากรีวิวจริง (ค่าเฉลี่ย)
        if (this.reviews.length > 0) {
          const sum = this.reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
          this.overallRating = Math.round((sum / this.reviews.length) * 10) / 10;
        } else {
          this.overallRating = 0;
        }
        
        
      },
      error: (error) => {
        console.error('[DormDetail] Error loading reviews:', error);
        // ถ้าโหลดไม่สำเร็จ ให้แสดงข้อความว่างแทนการใช้ mockup
        this.reviews = [];
        this.overallRating = 0;
        
      }
    });
  }

  // private analyzeSentiment(comment: string): void {
  //   this.sentimentService.analyzeSentiment(comment).subscribe({
  //     next: (response) => {
  //       this.sentimentResult = response.sentiment_text;
  //       // เพิ่มความคิดเห็นหลังจากวิเคราะห์เสร็จ
  //       this.addCommentToList(comment, response.sentiment_text);
  //     },
  //     error: (error) => {
  //       console.error('Error analyzing sentiment:', error);
  //       // กรณีมีข้อผิดพลาด ให้เพิ่มความคิดเห็นโดยไม่มีผลวิเคราะห์
  //       this.addCommentToList(comment, 'neutral');
  //     }
  //   });
  // }

  // เพิ่มฟังก์ชันใหม่สำหรับเพิ่มความคิดเห็นลงในลิสต์
  private addCommentToList(comment: string, sentiment: string): void {
    const newReview: Review = {
      username: 'ผู้ใช้งาน',
      avatar: this.getUserAvatarUrl(),
      comment: comment,
      rating: 5, // ค่าเริ่มต้น หรือให้ผู้ใช้กำหนด
      isPositive: sentiment === 'positive',
      date: new Date()
    };
    
    this.reviews.unshift(newReview);
    this.newComment = '';
  }

  viewAllComments(): void {
    // 实现查看所有评论的逻辑
    
  }

  // ฟังก์ชันการแก้ไขรีวิว
  editReview(index: number): void {
    // ตรวจสอบว่าเป็นรีวิวของผู้ใช้ปัจจุบันหรือไม่
    if (!this.reviews[index]?.isCurrentUser) {
      console.warn('[DormDetail] ไม่สามารถแก้ไขรีวิวของผู้อื่นได้');
      return;
    }
    
    this.reviews[index].isEditing = true;
    this.reviews[index].editComment = this.reviews[index].comment;
  }

  saveReview(index: number): void {
    const review = this.reviews[index];
    if (!review.editComment || !review.editComment.trim()) {
      return;
    }

    // ป้องกันการกดซ้ำด้วย flag ภายในตัวรีวิว
    review.saving = true;

    // ส่งการแก้ไขไปยัง API
    this.dormitoryService.updateReview(review.id || index, {
      comment: review.editComment.trim()
    }).subscribe({
      next: (response) => {
        
        
        // อัปเดตข้อมูลรีวิวในรายการ
        review.comment = review.editComment!.trim();
        review.rating = response.predicted_rating || review.rating; // อัปเดต rating จาก AI
        review.isPositive = (response.predicted_rating || review.rating) >= 3;
        review.isEditing = false;
        review.editComment = '';
        review.saving = false;
        
        // โหลดรีวิวใหม่จาก API เพื่อให้ได้ข้อมูลล่าสุด
        this.loadReviews();
      },
      error: (error) => {
        console.error('[DormDetail] Error updating review:', error);
        this.triggerPopup('ไม่สามารถแก้ไขรีวิวได้: ' + (error.error?.message || 'เกิดข้อผิดพลาด'), 'error');
        review.saving = false;
      }
    });
  }

  cancelEdit(index: number): void {
    this.reviews[index].isEditing = false;
    this.reviews[index].editComment = '';
  }

  // ฟังก์ชันลบรีวิว
  deleteReview(index: number): void {
    const review = this.reviews[index];
    
    // ตรวจสอบว่าเป็นรีวิวของผู้ใช้ปัจจุบันหรือไม่
    if (!review.isCurrentUser) {
      console.warn('[DormDetail] ไม่สามารถลบรีวิวของผู้อื่นได้');
      return;
    }

    // ยืนยันการลบ
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรีวิวนี้?')) {
      return;
    }

    // ส่งคำขอลบไปยัง API
    this.dormitoryService.deleteReview(review.id || index).subscribe({
      next: (response) => {
        
        
        // ลบรีวิวออกจากรายการ
        this.reviews.splice(index, 1);
        
        // โหลดรีวิวใหม่จาก API เพื่อให้ได้ข้อมูลล่าสุด
        this.loadReviews();
      },
      error: (error) => {
      console.error('[DormDetail] Error deleting review:', error);
        this.triggerPopup('ไม่สามารถลบรีวิวได้: ' + (error.error?.message || 'เกิดข้อผิดพลาด'), 'error');
      }
    });
  }

  // ฟังก์ชันสำหรับแสดงดาวว่าง
  getEmptyStars(rating: number): number[] {
    // ตรวจสอบและทำให้ rating อยู่ในช่วง 0-5
    const validRating = Math.max(0, Math.min(5, rating || 0));
    const emptyCount = 5 - Math.floor(validRating);
    return Array(Math.max(0, emptyCount)).fill(0);
  }

  getStars(rating: number): number[] {
    // ตรวจสอบและทำให้ rating อยู่ในช่วง 0-5
    const validRating = Math.max(0, Math.min(5, rating || 0));
    const fullStars = Math.floor(validRating);
    return Array(Math.max(0, fullStars)).fill(0);
  }

  // เพิ่ม method สำหรับปุ่มดูเพิ่มเติม
  viewMoreSimilarDorms() {
    // ส่งข้อมูลหอพักปัจจุบันไปยังหน้า dorm-list เพื่อคำนวณความคล้าย
    this.router.navigate(['/dorm-list'], {
      queryParams: {
        type: 'similar',                    // เปลี่ยนเป็น 'similar'
        from: 'dorm-detail',
        currentDormId: this.dormId,
        similarName: this.dormName,          // ชื่อหอพักปัจจุบัน
        zone: this.dormDetail?.zone_name,    // โซน
        minPrice: this.dormDetail?.min_price, // ราคาต่ำสุด
        maxPrice: this.dormDetail?.max_price, // ราคาสูงสุด
        amenities: this.getCurrentAmenities() // สิ่งอำนวยความสะดวก
      }
    }).then(() => {
      // Scroll ไปด้านบนของหน้าเมื่อเปลี่ยนหน้าเสร็จ
      window.scrollTo(0, 0);
    });
  }

  // เพิ่ม method สำหรับดึงสิ่งอำนวยความสะดวกปัจจุบัน
  private getCurrentAmenities(): string {
    if (!this.amenities || this.amenities.length === 0) return '';
    
    const availableAmenities = this.amenities
      .filter(amenity => amenity.available)
      .map(amenity => amenity.name);
    
    return availableAmenities.join(',');
  }

  // เพิ่ม method สำหรับปุ่มเปรียบเทียบหอพัก
  compareDormitory() {
    if (!this.dormDetail) {
      console.error('[DormDetail] ไม่มีข้อมูลหอพักสำหรับเปรียบเทียบ');
      return;
    }

    // สร้าง CompareDormItem จากข้อมูลหอพักปัจจุบัน
    const compareItem: CompareDormItem = {
      id: this.dormId,
      name: this.dormName,
      image: this.images.length > 0 ? this.images[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      price: this.priceRange || this.dormPrice || 'ไม่ระบุราคา',
      location: this.location,
      zone: this.dormDetail.zone_name || 'ไม่ระบุโซน'
    };

    // ตรวจสอบว่าหอพักอยู่ในรายการเปรียบเทียบแล้วหรือไม่
    if (this.dormCompareService.isInCompare(this.dormId)) {
      // ถ้าอยู่แล้ว ให้ลบออก
      this.dormCompareService.removeFromCompare(this.dormId);
      this.isInCompareList = false;
    } else {
      // ถ้ายังไม่อยู่ ให้เพิ่มเข้า
      const success = this.dormCompareService.addToCompare(compareItem);
      
      if (success) {
        this.isInCompareList = true;
      } else {
      }
    }
  }

  // Format date to Thai format
  formatThaiDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist Era
    
    return `อัพเดทล่าสุด: ${day} ${month} ${year}`;
  }

  // Handle thumbnail click
  selectThumbnail(index: number): void {
    this.currentImageIndex = index;
  }

  // Thumbnail navigation
  thumbnailStartIndex: number = 0;
  maxVisibleThumbnails: number = 10;
  Math = Math; // Make Math available in template

  getVisibleThumbnails(): string[] {
    return this.images.slice(this.thumbnailStartIndex, this.thumbnailStartIndex + this.maxVisibleThumbnails);
  }

  getVisibleThumbnailIndices(): number[] {
    const indices: number[] = [];
    for (let i = this.thumbnailStartIndex; i < Math.min(this.thumbnailStartIndex + this.maxVisibleThumbnails, this.images.length); i++) {
      indices.push(i);
    }
    return indices;
  }

  canScrollThumbnailsLeft(): boolean {
    return this.thumbnailStartIndex > 0;
  }

  canScrollThumbnailsRight(): boolean {
    return this.thumbnailStartIndex + this.maxVisibleThumbnails < this.images.length;
  }

  scrollThumbnailsLeft(): void {
    if (this.canScrollThumbnailsLeft()) {
      this.thumbnailStartIndex = Math.max(0, this.thumbnailStartIndex - this.maxVisibleThumbnails);
    }
  }

  scrollThumbnailsRight(): void {
    if (this.canScrollThumbnailsRight()) {
      this.thumbnailStartIndex = Math.min(
        this.images.length - this.maxVisibleThumbnails,
        this.thumbnailStartIndex + this.maxVisibleThumbnails
      );
    }
  }

  onThumbnailClick(index: number): void {
    this.currentImageIndex = index;
    // Auto-scroll thumbnail strip to show current image
    if (index < this.thumbnailStartIndex) {
      this.thumbnailStartIndex = Math.max(0, index);
    } else if (index >= this.thumbnailStartIndex + this.maxVisibleThumbnails) {
      this.thumbnailStartIndex = Math.min(
        this.images.length - this.maxVisibleThumbnails,
        index - this.maxVisibleThumbnails + 1
      );
    }
  }

  // Get thumbnail classes
  getThumbnailClasses(index: number): string {
    const baseClasses = 'thumbnail-item';
    const activeClass = index === this.currentImageIndex ? ' active' : '';
    return baseClasses + activeClass;
  }

  // Open Line chat with owner
  openLineChat(): void {
    if (!this.ownerContact.lineId || this.ownerContact.lineId === 'ไม่มี') {
      return;
    }

    // Create Line URL for adding friend
    const lineUrl = `https://line.me/ti/p/${this.ownerContact.lineId}`;
    
    // Open in new tab
    window.open(lineUrl, '_blank');
    
    // Optional: Show success message
    console.log(`Opening Line chat with ${this.ownerContact.lineId}`);
  }

}