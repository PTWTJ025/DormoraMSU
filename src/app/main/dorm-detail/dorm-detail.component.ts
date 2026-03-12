import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from "../navbar/navbar.component";
import { DormitoryService, DormDetail, Dorm, Amenity } from '../../services/dormitory.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MapService } from '../../services/map.service';
import { AuthService } from '../../services/auth.service';
import { SentimentService } from '../../services/sentiment.service';
import { DormCompareService, CompareDormItem } from '../../services/dorm-compare.service';
import { ComparePopupComponent } from '../shared/compare-popup/compare-popup.component';
import { AmenityIconComponent } from '../../components/amenity-icon/amenity-icon.component';
import { DistanceService, RoadDistancesResult, NearbyPlaceCategory } from '../../services/distance.service';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  RestaurantIcon,
  Store01Icon,
  ShoppingBasket01Icon,
  FuelIcon,
  CreativeMarketIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgObject } from '@hugeicons/angular';

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
  similarity_score?: number; // เพิ่มคะแนนความคล้ายกัน
}

type SentimentType = 'positive' | 'negative' | 'neutral';

/** กลุ่มสถานที่ใกล้เคียงต่อหมวด (สำหรับแสดงกับ HugeIcons) */
export interface NearbyPlaceGroup {
  category: NearbyPlaceCategory;
  categoryName: string;
  icon: IconSvgObject;
  places: { name: string }[];
  /** ถ้าไม่มีสถานที่ในรัศมี ให้แสดงข้อความนี้แทน */
  emptyMessage?: string;
}

@Component({
  selector: 'app-dorm-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    ComparePopupComponent,
    AmenityIconComponent,
    HugeiconsIconComponent,
  ],
  templateUrl: './dorm-detail.component.html',
  styleUrls: ['./dorm-detail.component.css']
})
export class DormDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('map') mapContainer!: ElementRef;

  /** ไอคอน HugeIcons ต่อหมวด – ต้อง assign เป็น property ของ component เพื่อให้ template bind ได้ (ตาม Full Code Example) */
  readonly categoryIcons: Record<NearbyPlaceCategory, IconSvgObject> = {
    convenience: Store01Icon,
    gasStation: FuelIcon,
    restaurant: RestaurantIcon,
    market: CreativeMarketIcon,
  };

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

  // Owner contact information from API
  ownerContact = {
    name: '',
    phone: '',
    secondaryPhone: '',
    lineId: '',
    email: '',
    image: '../../../assets/icon/home-owner.png'
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

  // Road distance (ORS) state
  roadDistanceLoading: boolean = false;
  roadDistanceMsuKm: number | null = null;
  roadDistanceFallback: boolean = false;
  roadNearbyPlacesHtml: string = '';
  /** กลุ่มสถานที่ใกล้เคียงต่อหมวด (ใช้แสดงกับ HugeIcons) */
  roadNearbyPlacesByCategory: NearbyPlaceGroup[] = [];
  roadNearbySummaryText: string = '';
  private roadDistanceReqSeq = 0;

  /** ไอคอน HugeIcons ต่อหมวด (ใช้ใน buildNearbyPlacesGroupsFromRoad) */
  private readonly nearbyCategoryIcons: Record<NearbyPlaceCategory, IconSvgObject> = {
    convenience: Store01Icon,
    gasStation: FuelIcon,
    restaurant: RestaurantIcon,
    market: CreativeMarketIcon,
  };

  /** หมวดสถานที่ที่อนุญาตให้แสดง (ยกเว้นร้านอาหารตาม requirement ล่าสุด) */
  private readonly displayedNearbyCategories: Exclude<NearbyPlaceCategory, 'restaurant'>[] = [
    'convenience',
    'gasStation',
    'market',
  ];

  /** คืนค่า icon สำหรับ template – อ้างอิงจาก property categoryIcons */
  getCategoryIcon(cat: NearbyPlaceCategory): IconSvgObject {
    return this.categoryIcons[cat];
  }

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
    public dormCompareService: DormCompareService,
    private distanceService: DistanceService
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
            // this.checkReviewEligibility(); // ลบออกเพราะ Backend ไม่มี review API
            // this.loadReviews(); // ลบออกเพราะ Backend ไม่มี review API
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

      // ตรวจสอบสถานะการอนุมัติ
      if (detail.approval_status === 'pending') {
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

      // จัดการราคา - ใช้ฟิลด์ที่ API ส่งมาจริง
      if (detail.min_price != null && detail.max_price != null) {
        const minVal = Number(detail.min_price);
        const maxVal = Number(detail.max_price);
        this.priceRange = (minVal === maxVal)
          ? `${minVal.toLocaleString()} บาท/เดือน`
          : `${minVal.toLocaleString()} - ${maxVal.toLocaleString()} บาท/เดือน`;
      } else if (detail.monthly_price != null) {
        this.dormPrice = `${Number(detail.monthly_price).toLocaleString()} บาท/เดือน`;
      } else {
        this.dormPrice = 'ติดต่อสอบถาม';
      }

      // จัดการสถานะห้อง (ว่าง/เต็ม) ให้เทมเพลตใช้งานได้สะดวก
      this.statusDorm = ((detail as any).status_dorm || (detail as any).status || '').toString();

      // จัดการ amenities
      if (allAmenities && detail.amenities) {
        this.amenities = this.processAmenities(allAmenities, detail.amenities);
      }

      // จัดการข้อมูล contact เจ้าของหอ
      this.ownerContact = {
        name: (detail as any).contact_name || detail.owner_manager_name || detail.owner_name || 'เจ้าของหอพัก',
        phone: (detail as any).contact_phone || detail.owner_phone || '',
        secondaryPhone: detail.owner_secondary_phone || '',
        lineId: (detail as any).line_id || detail.owner_line_id || '',
        email: (detail as any).contact_email || detail.owner_email || '',
        image: detail.owner_photo_url || '../../../assets/icon/home-owner.png'
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
    console.log('🔍 Processing Amenities:');
    console.log('📋 All Amenities:', allAmenities);
    console.log('🏠 Dorm Amenities:', dormAmenities);

    // สร้าง amenity mapping พร้อมจัดกลุ่ม
    const amenityMapping: { [key: number]: { name: string } } = {
      // สิ่งอำนวยความสะดวกทั้งหมด (ไม่แบ่งภายใน/ภายนอกแล้ว)
      7: { name: 'แอร์' },
      8: { name: 'พัดลม' },
      9: { name: 'TV' },
      10: { name: 'ตู้เย็น' },
      11: { name: 'เตียงนอน' },
      12: { name: 'WIFI' },
      13: { name: 'ตู้เสื้อผ้า' },
      14: { name: 'โต๊ะทำงาน' },
      15: { name: 'ไมโครเวฟ' },
      16: { name: 'เครื่องทำน้ำอุ่น' },
      17: { name: 'ซิงค์ล้างจาน' },
      18: { name: 'โต๊ะเครื่องแป้ง' },
      19: { name: 'กล้องวงจรปิด' },
      20: { name: 'รปภ.' },
      21: { name: 'ลิฟต์' },
      22: { name: 'ที่จอดรถ' },
      23: { name: 'ฟิตเนส' },
      24: { name: 'Lobby' },
      25: { name: 'ตู้กดน้ำหยอดเหรียญ' },
      26: { name: 'สระว่ายน้ำ' },
      27: { name: 'ที่วางพัสดุ' },
      28: { name: 'อนุญาตให้เลี้ยงสัตว์' },
      29: { name: 'คีย์การ์ด' },
      30: { name: 'เครื่องซักผ้า' }
    };

    // ถ้าไม่มี allAmenities หรือมีแต่ว่าง ให้ใช้ข้อมูลจาก dormAmenities โดยตรง
    if (!allAmenities || allAmenities.length === 0) {
      console.log('⚠️ No allAmenities data, using dormAmenities directly');

      // สร้าง Set ของ amenity_id ที่หอพักมี
      const dormAmenityIds = new Set(dormAmenities.map(da => {
        const id = da.amenity_id || da.id;

        return id;
      }));



      // สร้างรายการทั้งหมดจาก mapping
      const result = Object.entries(amenityMapping).map(([idStr, amenityInfo]) => {
        const id = parseInt(idStr);
        return {
          amenity_id: id,
          name: amenityInfo.name,
          available: dormAmenityIds.has(id)
        };
      });

      console.log('🎉 Final Amenities Result (from mapping):', result);
      return result;
    }

    // กรณีปกติ - มี allAmenities
    const dormAmenityIds = new Set(dormAmenities.map(da => {
      const id = da.amenity_id || da.id;

      return id;
    }));



    const result = allAmenities.map(amenity => ({
      amenity_id: amenity.amenity_id,
      name: amenity.name,
      available: dormAmenityIds.has(amenity.amenity_id)
    }));

    console.log('🎉 Final Amenities Result:', result);
    return result;
  }

  private async loadSimilarDormitories() {
    this.loadingState.similar = true;
    try {
      console.log('[DormDetail] Loading similar dormitories...');
      // ใช้ API หอพักที่คล้ายกันจาก backend
      const dorms = await this.dormService.getSimilarDormitories(this.dormId, 6).toPromise();
      if (dorms && Array.isArray(dorms)) {
        console.log('[DormDetail] Received similar dorms:', dorms.length);

        // แปลงข้อมูลให้ตรงกับ interface SimilarProperty
        this.similarProperties = dorms.slice(0, 4).map(d => this.mapDormToSimilarProperty(d));
        console.log('[DormDetail] Similar properties loaded:', this.similarProperties.length);
      } else {
        console.warn('[DormDetail] No similar dorms received or invalid format');
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
      similarity_score: (dorm as any).similarity_score || 0, // เพิ่มคะแนนความคล้ายกัน
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
          this.refreshRoadDistances(lat, lng);
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

        // ทำลาย map เก่าเมื่อสร้างใหม่เสมอ เพื่อป้องกัน WebGL context issues
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
    if (!this.dormDetail) return 'ไม่ระบุ';

    // รองรับทั้ง water_price และ water_rate (backward compatibility)
    const waterPrice = (this.dormDetail as any).water_price || this.dormDetail.water_rate;
    const waterType = (this.dormDetail as any).water_price_type || this.dormDetail.water_type;

    if (!waterPrice) return 'ไม่ระบุ';

    // ถ้าเป็นตามมิเตอร์ ให้แสดงเป็นตามอัตราการประปา
    if (waterType === 'ตามมิเตอร์') {
      return 'ตามอัตราการประปา';
    }

    // กรณีอื่นๆ แสดงตามปกติ
    return waterType === 'per_unit'
      ? `${waterPrice} บาท/หน่วย`
      : `${waterPrice} บาท/เดือน (เหมาจ่าย)`;
  }

  getElectricityRateDisplay(): string {
    if (!this.dormDetail) return 'ไม่ระบุ';

    // รองรับทั้ง electricity_price และ electricity_rate (backward compatibility)
    const electricityPrice = (this.dormDetail as any).electricity_price || this.dormDetail.electricity_rate;
    const electricityType = (this.dormDetail as any).electricity_type || this.dormDetail.electricity_type;

    if (!electricityPrice) return 'ไม่ระบุ';

    // ถ้าเป็นตามมิเตอร์ ให้แสดงเป็นตามอัตราการไฟฟ้า
    if (electricityType === 'ตามมิเตอร์') {
      return 'ตามอัตราการไฟฟ้า';
    }

    // ค่าไฟมักเป็นบาท/หน่วยเสมอ
    return `${electricityPrice} บาท/หน่วย`;
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

  // แสดงราคาแต่ละประเภทในรูปแบบที่อ่านง่าย
  getMonthlyPriceDisplay(): string {
    if (!this.dormDetail) return 'ติดต่อสอบถาม';

    const detail: any = this.dormDetail;
    const monthly =
      detail.monthly_price ??
      detail.min_price ??
      detail.max_price ??
      null;

    if (monthly == null) {
      return 'ติดต่อสอบถาม';
    }

    return `${Number(monthly).toLocaleString()} บาท`;
  }

  getDailyPriceDisplay(): string {
    if (!this.dormDetail) return 'ติดต่อสอบถาม';

    const detail: any = this.dormDetail;
    const daily = detail.daily_price ?? null;

    if (daily == null) {
      return 'ติดต่อสอบถาม';
    }

    return `${Number(daily).toLocaleString()} บาท`;
  }

  getTermPriceDisplay(): string {
    if (!this.dormDetail) return 'ติดต่อสอบถาม';

    const detail: any = this.dormDetail;
    const term = detail.term_price ?? null;

    if (term == null) {
      return 'ติดต่อสอบถาม';
    }

    return `${Number(term).toLocaleString()} บาท`;
  }

  getSummerPriceDisplay(): string {
    if (!this.dormDetail) return 'ติดต่อสอบถาม';

    const detail: any = this.dormDetail;
    const summer = detail.summer_price ?? null;

    if (summer == null) {
      return 'ติดต่อสอบถาม';
    }

    return `${Number(summer).toLocaleString()} บาท`;
  }

  // Helper methods for avatars
  getUserAvatarUrl(): string {
    // ถ้ามีรูปโปรไฟล์ ให้ใช้รูปนั้น
    if (this.userAvatar && this.userAvatar !== '../../../assets/icon/Rectangle 6.png') {
      return this.userAvatar;
    }

    // ถ้าไม่มีรูป ให้ใช้ cat avatar.jpg เป็นค่าเริ่มต้นสำหรับสมาชิก
    return 'assets/icon/cat avatar.jpg';
  }

  getReviewerAvatarUrl(review: Review): string {
    // ถ้ามีรูปโปรไฟล์ ให้ใช้รูปนั้น
    if (review.avatar && review.avatar !== '../../../assets/icon/Rectangle 6.png') {
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

  // ลบออกเพราะ Backend ไม่มี review API
  // private checkReviewEligibility(): void {
  //   // ถ้าไม่มี currentUserId แสดงว่าไม่ได้ล็อกอิน ไม่ต้องเช็ค API
  //   if (!this.currentUserId) {
  //     this.canReview = false;
  //     this.reviewEligibilityMessage = 'กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น';
  //     return;
  //   }
  //   // ... rest of method
  // }

  navigateToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
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
      this.triggerPopup('ลบหอพักออกจากรายการเปรียบเทียบแล้ว', 'success');
    } else {
      // ถ้ายังไม่อยู่ ให้เพิ่มเข้า
      const success = this.dormCompareService.addToCompare(compareItem);

      if (success) {
        this.isInCompareList = true;
        this.triggerPopup('เพิ่มหอพักเข้ารายการเปรียบเทียบแล้ว', 'success');
      } else {
        this.triggerPopup('ไม่สามารถเพิ่มหอพักได้ (สูงสุด 5 หอพัก)', 'error');
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

  // Helper methods for star ratings
  getStars(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }

  // คำนวณระยะทางระหว่าง 2 จุด (Haversine formula)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // ใช้ DistanceService เพื่อให้การคำนวณระยะทางสอดคล้องกันทุกที่
    return this.distanceService.calculateDistance(lat1, lng1, lat2, lng2);
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // แยกระยะทางจาก description และเพิ่มสถานที่ใกล้เคียง
  calculateDistanceDescription(): string {
    if (this.roadDistanceMsuKm == null) return '';
    const rounded = Math.round(this.roadDistanceMsuKm * 10) / 10;
    const mode = this.roadDistanceFallback ? 'โดยประมาณ' : 'ตามถนน';
    return `ห่างจากมหาวิทยาลัยมหาสารคาม (${mode}) ประมาณ ${rounded} กิโลเมตร`;
  }

  // แยกเฉพาะข้อความระยะทาง
  getDistanceText(): string {
    return this.calculateDistanceDescription();
  }

  // แยกเฉพาะ HTML สถานที่ใกล้เคียง (fallback เมื่อไม่มีข้อมูล ORS)
  getNearbyPlacesHTML(): string {
    return this.roadNearbyPlacesHtml || '';
  }

  // กลุ่มสถานที่ใกล้เคียงสำหรับแสดงกับ HugeIcons (ร้านอาหารสุ่มภายใน 3 กม.)
  getNearbyPlacesGroups(): NearbyPlaceGroup[] {
    return this.roadNearbyPlacesByCategory || [];
  }

  private refreshRoadDistances(lat: number, lng: number) {
    const reqSeq = ++this.roadDistanceReqSeq;
    this.roadDistanceLoading = true;
    this.distanceService.getRoadDistancesFromDorm(lat, lng).subscribe({
      next: (res: RoadDistancesResult) => {
        if (reqSeq !== this.roadDistanceReqSeq) return;
        this.roadDistanceMsuKm = res.msuKm;
        this.roadDistanceFallback = res.fallback;
        this.roadNearbySummaryText = this.distanceService.buildNearbySummaryTextFromRoad(res.places, res.fallback);
        this.roadNearbyPlacesByCategory = this.buildNearbyPlacesGroupsFromRoad(res.places);
        this.roadNearbyPlacesHtml = ''; // ใช้โครงสร้าง ByCategory + HugeIcons แทน
      },
      error: () => {
        if (reqSeq !== this.roadDistanceReqSeq) return;
        // fallback: ใช้เส้นตรง + ใช้ HTML ใกล้เคียงแบบเดิม
        this.roadDistanceMsuKm = this.distanceService.calculateDistance(lat, lng);
        this.roadDistanceFallback = true;
        this.roadNearbySummaryText = '';
        this.roadNearbyPlacesHtml = this.distanceService.getNearbyPlacesText(lat, lng);
      },
      complete: () => {
        if (reqSeq !== this.roadDistanceReqSeq) return;
        this.roadDistanceLoading = false;
      },
    });
  }

  private buildNearbyPlacesGroupsFromRoad(
    places: { name: string; distanceKm: number; category: NearbyPlaceCategory }[],
  ): NearbyPlaceGroup[] {
    // ใช้รัศมีคงที่ 0.5 กม. สำหรับทุกหมวด (ร้านอาหารยังไม่ใช้)
    const maxDistances: Record<Exclude<NearbyPlaceCategory, 'restaurant'>, number> = {
      convenience: 0.5,
      gasStation: 0.5,
      market: 0.5,
    };

    const categoryNames: Record<Exclude<NearbyPlaceCategory, 'restaurant'>, string> = {
      convenience: 'ร้านสะดวกซื้อ',
      gasStation: 'สถานีน้ำมัน',
      market: 'ตลาด',
    };

    const groupedAll = this.displayedNearbyCategories.reduce(
      (acc, cat) => {
        acc[cat] = [];
        return acc;
      },
      {} as Record<Exclude<NearbyPlaceCategory, 'restaurant'>, { name: string; distanceKm: number }[]>,
    );

    const isDisplayedCategory = (
      category: NearbyPlaceCategory,
    ): category is Exclude<NearbyPlaceCategory, 'restaurant'> =>
      (this.displayedNearbyCategories as NearbyPlaceCategory[]).includes(category);

    places.forEach((p) => {
      if (!isDisplayedCategory(p.category)) return;
      groupedAll[p.category].push({ name: p.name, distanceKm: p.distanceKm });
    });

    return this.displayedNearbyCategories.map((cat) => {
      const sorted = groupedAll[cat].sort((a, b) => a.distanceKm - b.distanceKm);
      const withinRadius = sorted.filter((p) => p.distanceKm <= maxDistances[cat]);
      const list = (withinRadius.length > 0 ? withinRadius : sorted).slice(0, 3);

      return {
        category: cat,
        categoryName: categoryNames[cat],
        icon: this.nearbyCategoryIcons[cat],
        places: list.map((p) => ({ name: p.name })),
        emptyMessage: list.length === 0 ? 'ยังไม่มีข้อมูลสถานที่ประเภทนี้' : undefined,
      };
    });
  }

  // คำนวณระยะทางจากพิกัด (fallback)
  private calculateDistanceFromCoordinates(): string {
    const dormLat = this.mapLatitude;
    const dormLng = this.mapLongitude;

    // จุดสำคัญใน มหาสารคาม
    const landmarks = [
      { name: 'มหาวิทยาลัยมหาสารคาม', lat: 16.2451532, lng: 103.2499106 },
      { name: 'ตัวเมืองมหาสารคาม', lat: 16.1845, lng: 103.3018 },
      { name: 'โลตัสมหาสารคาม', lat: 16.1956, lng: 103.2889 },
      { name: 'บิ๊กซีมหาสารคาม', lat: 16.1889, lng: 103.2945 }
    ];

    const distances = landmarks.map(landmark => {
      const distance = this.calculateDistance(dormLat!, dormLng!, landmark.lat, landmark.lng);
      return { name: landmark.name, distance: Math.round(distance * 10) / 10 };
    });

    // หาจุดที่ใกล้ที่สุด
    const nearest = distances.reduce((prev, current) =>
      prev.distance < current.distance ? prev : current
    );

    return `ห่างจาก${nearest.name} ประมาณ ${nearest.distance} กิโลเมตร`;
  }

  // คืนค่ารายละเอียดหอพัก โดยตัดข้อความระยะทางที่เคยฝังไว้ใน description ออก
  getCleanDescription(): string {
    if (!this.dormDetail?.description) {
      return '';
    }

    // ตัดบรรทัดขึ้นต้นที่เป็นประโยคระยะทางออก เช่น
    // "หอพัก xxx ห่างจาก ... ประมาณ 1.1 กิโลเมตร"
    const distanceRegex =
      /^หอพัก.*?ห่างจาก.*?ประมาณ.*?(กิโลเมตร|เมตร)\s*(\r?\n\r?\n|\r?\n)?/m;

    return this.dormDetail.description.replace(distanceRegex, '').trim();
  }

  viewMoreSimilarDorms(): void {
    // Navigate to dorm list or show more similar dorms
    this.router.navigate(['/dorm-list']);
  }

}
