import {
  Component,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ValidationErrors,
  AbstractControl,
  ValidatorFn,
} from '@angular/forms';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import {
  animate,
  keyframes,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { MapService } from '../../../services/map.service';
import {
  DormitoryService,
  RoomType,
} from '../../../services/dormitory.service';
import { AuthService } from '../../../services/auth.service';
import { DistanceService } from '../../../services/distance.service';
import { AdminService } from '../../../services/admin.service';

interface Amenity {
  id: string;
  name: string;
  location_type: string;
}
interface ZoneOption {
  zone_id: number;
  zone_name: string;
}
@Component({
  selector: 'app-admin-edit-dorm',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './admin-edit-dorm.component.html',
  styleUrls: ['./admin-edit-dorm.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideCenter', [
      // next -> slide from right to center
      transition(':increment', [
        animate(
          '420ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          keyframes([
            style({
              transform: 'translate(calc(-40% - 0px), -50%)',
              opacity: 0.8,
              offset: 0,
            }),
            style({
              transform: 'translate(calc(-48% - 0px), -50%)',
              opacity: 0.95,
              offset: 0.6,
            }),
            style({
              transform: 'translate(-50%, -50%)',
              opacity: 1,
              offset: 1,
            }),
          ])
        ),
      ]),
      // prev -> slide from left to center
      transition(':decrement', [
        animate(
          '420ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          keyframes([
            style({
              transform: 'translate(calc(-60% - 0px), -50%)',
              opacity: 0.8,
              offset: 0,
            }),
            style({
              transform: 'translate(calc(-52% - 0px), -50%)',
              opacity: 0.95,
              offset: 0.6,
            }),
            style({
              transform: 'translate(-50%, -50%)',
              opacity: 1,
              offset: 1,
            }),
          ])
        ),
      ]),
    ]),
  ],
})
export class AdminEditDormComponent implements AfterViewInit, OnDestroy {
  @Input() dormId: string | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSaveSuccess = new EventEmitter<void>();

  dormForm!: FormGroup;

  // stepper
  currentStep = 1;
  totalSteps = 3;
  maxReachedStep = 1;

  // submit
  imageError = false;
  isSubmitting = false;
  showErrorModal = false;
  submitErrorMessage: string | null = null;

  // tailwind heights
  mapHeightClass = 'h-80';

  // images
  selectedImages: File[] = [];
  imagePreviewUrls: string[] = [];
  // keep metadata parallel to imagePreviewUrls for edit mode operations
  previewMeta: Array<{
    imageId?: number;
    isNew: boolean;
    isPrimary?: boolean;
  }> = [];
  // existing images fetched from backend in edit mode
  existingImages: Array<{
    image_id: number;
    image_url: string;
    is_primary?: boolean;
  }> = [];
  // initial loading guard for edit mode
  isInitialLoading = false;
  // setting primary loader state
  isSettingPrimary = false;
  settingPrimaryIndex: number | null = null;
  // deleting image loader state
  isDeletingImage = false;
  deletingImageIndex: number | null = null;
  // edit mode
  isEditMode = false;
  editingDormId: number | null = null;
  originalRoomTypes: any[] = []; // เก็บข้อมูลประเภทห้องเดิมสำหรับเปรียบเทียบ

  // drag & drop
  isDragOver = false;
  draggedIndex: number | null = null;

  sliderImages: Array<{ src: string; alt: string }> = [];

  private readonly SCROLL_OFFSET_PX = 100; // NEW: ถ้า navbar เตี้ย/สูงกว่าปรับเลขนี้
  private readonly mapRetryDelayMs = 1000;
  private readonly maxMapInitAttempts = 20;
  private locationMapInitAttempts = 0;
  private previewMapInitAttempts = 0;
  private locationResizeObserver?: ResizeObserver;
  private previewResizeObserver?: ResizeObserver;

  // carousel state (single center image with faded sides)
  currentImageIndex = 0;

  get hasImages(): boolean {
    return (
      Array.isArray(this.imagePreviewUrls) && this.imagePreviewUrls.length > 0
    );
  }
  get prevImageIndex(): number {
    if (!this.hasImages) return 0;
    return (
      (this.currentImageIndex - 1 + this.imagePreviewUrls.length) %
      this.imagePreviewUrls.length
    );
  }
  get nextImageIndex(): number {
    if (!this.hasImages) return 0;
    return (this.currentImageIndex + 1) % this.imagePreviewUrls.length;
  }
  onPrevImage(): void {
    if (!this.hasImages) return;
    this.currentImageIndex = this.prevImageIndex;
    this.cdr.markForCheck();
  }
  onNextImage(): void {
    if (!this.hasImages) return;
    this.currentImageIndex = this.nextImageIndex;
    this.cdr.markForCheck();
  }

  // อ้างอิง viewport ของสไลด์แบบ strip เพื่อสั่งเลื่อนด้วยปุ่ม
  @ViewChild('stripViewport') stripViewportRef?: ElementRef<HTMLDivElement>;

  // โมดัลรูปภาพเต็มจอ
  imageModalOpen = false;
  imageModalIndex = 0;

  // ===== แหล่งความจริง: สิ่งอำนวยความสะดวก (แยกภายใน/ภายนอก) =====
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
    { id: 'other', name: 'อื่นๆ', location_type: '' }, // ให้เลือกเอง
  ];

  private amenityIndexMap = new Map(this.AMENITIES.map((a, i) => [a.id, i]));

  // Mapping จาก index ไป amenity_id จริงในฐานข้อมูล
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

  zones: ZoneOption[] = [];
  zonesLoading = false;
  zonesError: string | null = null;

  // ต้องมี "รายเดือน" หรือ "รายวัน" อย่างน้อย 1 ช่อง (เฉพาะ 2 ช่องนี้เท่านั้น)
  private readonly requireMonthOrDay: ValidatorFn = (
    group: AbstractControl
  ): ValidationErrors | null => {
    if (!(group instanceof FormGroup)) return null;
    const m = (group.get('pricePerMonth')?.value ?? '').toString().trim();
    const d = (group.get('pricePerDay')?.value ?? '').toString().trim();
    const result = m !== '' || d !== '' ? null : { needMonthOrDay: true };
    return result;
  };

  // Custom popup properties
  showPopup = false;
  popupMessage = '';
  popupType: 'error' | 'warning' | 'success' = 'error';
  private popupTargetSelector: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    private mapService: MapService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private dormitoryService: DormitoryService,
    private authService: AuthService,
    private distanceService: DistanceService,
    private adminService: AdminService
  ) {
    this.initForm();
    this.loadZones();
    this.initSliderImages();
  }

  ngAfterViewInit(): void {
    // โหลดข้อมูลเมื่อได้รับ dormId จาก @Input
    setTimeout(() => {
      if (this.dormId) {
        this.editingDormId = parseInt(this.dormId, 10);
        this.isEditMode = true;
        this.loadDormitoryForEdit(this.editingDormId);
      }
    }, 100);

    this.electricity
      .get('electricity_type')
      ?.valueChanges.subscribe(() => this.adjustMapHeight());
    this.water
      .get('water_type')
      ?.valueChanges.subscribe(() => this.adjustMapHeight());
  }


  private async loadDormitoryForEdit(dormId: number): Promise<void> {
    try {
      this.isInitialLoading = true;
      this.cdr.markForCheck();
      // ใช้ Admin API แทน Owner API
      console.log('[AdminEditDorm] Loading dormitory data via Admin API:', dormId);
      const detail$ = this.adminService
        .getDormitoryDetail(String(dormId))
        .toPromise();
      const images$ = this.dormitoryService
        .getImagesForEdit(dormId)
        .toPromise();
      const [detailResponse, images] = await Promise.all([detail$, images$]);

      // Admin API returns { dormitory: {...}, room_types: [...], amenities: [...], images: [...], owner_contact: {...} }
      const detail: any = detailResponse?.dormitory || detailResponse;
      const roomTypes = detailResponse?.room_types || (detail as any).roomTypes || [];
      const amenitiesResp = detailResponse?.amenities || (detail as any).amenities || [];

      console.log('[AdminEditDorm] Loaded data structure:', {
        has_dormitory: !!detailResponse?.dormitory,
        has_room_types: !!detailResponse?.room_types,
        has_amenities: !!detailResponse?.amenities,
        detail_keys: Object.keys(detail || {}),
      });

      if (detail) {
        // Log ข้อมูลหอพักที่โหลดมา
        console.log('[DormEdit] ข้อมูลหอพักที่โหลดมา:', {
          dorm_id: detail.dorm_id || (detail as any).id,
          dorm_name: detail.dorm_name || (detail as any).name,
          address: detail.address,
          zone_id: (detail as any).zone_id,
          description: detail.dorm_description || detail.description,
          latitude: detail.latitude,
          longitude: detail.longitude,
          electricity_type: detail.electricity_type,
          electricity_rate: detail.electricity_rate,
          water_type: detail.water_type,
          water_rate: detail.water_rate,
          created_at: (detail as any).created_at,
          updated_at:
            (detail as any).updated_at || (detail as any).updated_date,
          owner_id: (detail as any).owner_id,
          full_detail: detail,
        });

        // General
        this.dormForm.get('generalInfo.name')?.setValue(detail.dorm_name || '');
        this.dormForm
          .get('generalInfo.zone_id')
          ?.setValue((detail as any).zone_id || '');
        this.dormForm
          .get('generalInfo.address')
          ?.setValue(detail.address || '');
        // แยกระยะทางออกจาก description ก่อนโหลดเข้าฟอร์ม
        const fullDescription =
          detail.dorm_description || detail.description || '';
        const { description: cleanDescription } =
          this.distanceService.splitDescription(fullDescription);
        this.dormForm
          .get('generalInfo.description')
          ?.setValue(cleanDescription);
        // โหลดสถานะหอพัก (ถ้ามี)
        this.dormForm
          .get('generalInfo.statusDorm')
          ?.setValue(
            (detail as any).status_dorm || (detail as any).statusDorm || 'ว่าง'
          );

        // Utilities (normalize using *_type and *_rate)
        const eType = detail.electricity_type || 'ตามมิเตอร์';
        const wType = detail.water_type || 'ตามมิเตอร์';
        this.electricity.get('electricity_type')?.setValue(eType);
        this.electricity
          .get('electricity_rate')
          ?.setValue(
            detail.electricity_rate && Number(detail.electricity_rate) > 0
              ? detail.electricity_rate
              : ''
          );
        this.water.get('water_type')?.setValue(wType);
        this.water
          .get('water_rate')
          ?.setValue(
            detail.water_rate && Number(detail.water_rate) > 0
              ? detail.water_rate
              : ''
          );

        // Location - ตรวจสอบข้อมูลพิกัดอย่างเข้มงวด
        const latRaw = detail.latitude;
        const lngRaw = detail.longitude;
        const lat = Number(latRaw);
        const lng = Number(lngRaw);

        // ตรวจสอบว่าข้อมูลพิกัดถูกต้องหรือไม่
        if (!latRaw || !lngRaw || Number.isNaN(lat) || Number.isNaN(lng)) {
          console.error('[DormEdit] ข้อมูลพิกัดไม่ถูกต้อง:', {
            dorm_id: detail.dorm_id,
            latitude_raw: latRaw,
            longitude_raw: lngRaw,
            latitude_parsed: lat,
            longitude_parsed: lng,
            error: 'Missing or invalid coordinates',
          });
          this.showCustomPopup(
            'ข้อมูลพิกัดของหอพักไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ',
            'error'
          );
          return;
        }

        // Log ข้อมูลแผนที่ของหอพัก
        console.log('[DormEdit] ข้อมูลแผนที่ของหอพัก:', {
          dorm_id: detail.dorm_id || (detail as any).id,
          dorm_name: detail.dorm_name || (detail as any).name,
          coordinates: {
            latitude: lat,
            longitude: lng,
            latitude_raw: detail.latitude,
            longitude_raw: detail.longitude,
          },
          default_location: null,
          is_using_default: !detail.latitude || !detail.longitude,
          map_ready: true,
        });

        this.dormForm.get('location.latitude')?.setValue(lat);
        this.dormForm.get('location.longitude')?.setValue(lng);

        // สร้างแผนที่หลังจากโหลดข้อมูลเสร็จ
        setTimeout(() => {
          this.initLocationMap();
          this.adjustMapHeight();
          this.cdr.markForCheck();
        }, 200);
      }

      // Room types (normalize common response shapes/fields)
      let roomTypeList: any[] = [];
      if (Array.isArray(roomTypes)) {
        roomTypeList = roomTypes as any[];
      } else if (roomTypes && typeof roomTypes === 'object') {
        const rt =
          (roomTypes as any).room_types ||
          (roomTypes as any).data ||
          (roomTypes as any).items ||
          [];
        roomTypeList = Array.isArray(rt) ? rt : [];
      }

      if (roomTypeList.length) {
        // Log ข้อมูลประเภทห้องที่โหลดมา
        console.log('[DormEdit] ข้อมูลประเภทห้องที่โหลดมา:', {
          total_room_types: roomTypeList.length,
          room_types: roomTypeList.map((rt, index) => ({
            index: index + 1,
            room_type_id:
              rt.room_type_id || rt.id || (rt as any).roomTypeId || null,
            name: rt.name || rt.room_name || rt.type || '',
            bed_type: rt.bed_type || rt.bedType || '',
            monthly_price: rt.monthly_price ?? rt.monthlyPrice ?? null,
            daily_price: rt.daily_price ?? rt.dailyPrice ?? null,
            term_price: (rt as any).term_price ?? (rt as any).termPrice ?? null,
            summer_price:
              (rt as any).summer_price ?? (rt as any).summerPrice ?? null,
            full_room_type: rt,
          })),
        });

        // เก็บข้อมูลเดิมไว้สำหรับเปรียบเทียบ
        this.originalRoomTypes = roomTypeList.map((rt) => ({
          room_type_id:
            rt.room_type_id || rt.id || (rt as any).roomTypeId || null,
          name: rt.name || rt.room_name || rt.type || '',
          bed_type: rt.bed_type || rt.bedType || '',
          monthly_price: rt.monthly_price ?? rt.monthlyPrice ?? null,
          daily_price: rt.daily_price ?? rt.dailyPrice ?? null,
          term_price: (rt as any).term_price ?? (rt as any).termPrice ?? null,
          summer_price:
            (rt as any).summer_price ?? (rt as any).summerPrice ?? null,
        }));

        // clear existing
        while (this.roomTypes.length) this.roomTypes.removeAt(0);
        roomTypeList.forEach((rt) => {
          const g = this.createRoomType();
          const name = rt.name || rt.room_name || rt.type || '';
          const bedType = rt.bed_type || rt.bedType || '';
          const monthly = rt.monthly_price ?? rt.monthlyPrice ?? null;
          const daily = rt.daily_price ?? rt.dailyPrice ?? null;
          const term = (rt as any).term_price ?? (rt as any).termPrice ?? null;
          const summer =
            (rt as any).summer_price ?? (rt as any).summerPrice ?? null;

          // ตรวจสอบว่าเป็นประเภทมาตรฐานหรือไม่
          const standardTypes = ['ห้องแอร์', 'ห้องพัดลม', 'ห้องพัดลม + แอร์'];

          if (standardTypes.includes(name)) {
            g.get('type')?.setValue(name);
            g.get('customType')?.setValue('');
          } else {
            // ถ้าไม่ใช่ประเภทมาตรฐาน ให้เป็น "อื่นๆ"
            g.get('type')?.setValue('other');
            g.get('customType')?.setValue(name);
          }
          g.get('bed_type')?.setValue(String(bedType));
          g.get('room_type_id')?.setValue(
            rt.room_type_id || rt.id || (rt as any).roomTypeId || null
          );
          if (monthly !== null && monthly !== undefined)
            g.get('pricePerMonth')?.setValue(String(monthly));
          if (daily !== null && daily !== undefined)
            g.get('pricePerDay')?.setValue(String(daily));
          if (term !== null && term !== undefined)
            g.get('pricePerTerm')?.setValue(String(term));
          if (summer !== null && summer !== undefined)
            g.get('pricePerSummer')?.setValue(String(summer));
          this.roomTypes.push(g);
        });
      }

      // Images (store ids + primary flags)
      if (Array.isArray(images) && images.length) {
        // Log ข้อมูลรูปภาพที่โหลดมา
        console.log('[DormEdit] ข้อมูลรูปภาพที่โหลดมา:', {
          total_images: images.length,
          images: (images as any[]).map((img, index) => ({
            index: index + 1,
            image_id: img.image_id,
            image_url: img.image_url,
            is_primary: img.is_primary,
            created_at: img.created_at,
            full_image: img,
          })),
        });

        this.existingImages = images as any[];
        this.imagePreviewUrls = [];
        this.previewMeta = [];
        (images as any[]).forEach((img: any) => {
          if (!img?.image_url) return;
          this.imagePreviewUrls.push(img.image_url);
          this.previewMeta.push({
            imageId: Number(img.image_id),
            isNew: false,
            isPrimary: !!img.is_primary,
          });
        });
        // sync form array for previews (no File objects in edit)
        while (this.imagesArray.length) this.imagesArray.removeAt(0);
        this.imagePreviewUrls.forEach((url) => {
          this.imagesArray.push(
            this.fb.group({ file: [null], preview: [url], image_type: [''] })
          );
        });
        this.updateSliderImages();
      }

      // Amenities: load via dedicated GET for edit flow
      try {
        const enabledSet = new Set<number | string>();

        let rows: any[] = [];

        const amenitiesData = (amenitiesResp as any)?.amenities;
        if (
          amenitiesData &&
          typeof amenitiesData === 'object' &&
          !Array.isArray(amenitiesData)
        ) {
          const indoor = Array.isArray(amenitiesData.indoor)
            ? amenitiesData.indoor
            : [];
          const outdoor = Array.isArray(amenitiesData.outdoor)
            ? amenitiesData.outdoor
            : [];
          rows = [...indoor, ...outdoor];
        } else if (Array.isArray(amenitiesData)) {
          // Backend sent: [{ amenity_id, amenity_name, is_available }]
          rows = amenitiesData;
        } else if (Array.isArray(amenitiesResp)) {
          // Backend sent array directly
          rows = amenitiesResp;
        }

        rows.forEach((r: any) => {
          if (typeof r === 'number') {
            enabledSet.add(Number(r));
            return;
          }
          if (typeof r === 'string') {
            enabledSet.add(r.trim());
            return;
          }
          // Only add if is_available is true
          if (r?.is_available === true) {
            if (r?.amenity_id) enabledSet.add(Number(r.amenity_id));
            const nm = (r?.amenity_name || r?.name || '').toString().trim();
            if (nm) enabledSet.add(nm);
          }
        });

        // Log ข้อมูลสิ่งอำนวยความสะดวกที่โหลดมา
        console.log('[DormEdit] ข้อมูลสิ่งอำนวยความสะดวกที่โหลดมา:', {
          total_amenities: rows.length,
          amenities_data: rows,
          enabled_amenities: Array.from(enabledSet),
          amenities_by_type: {
            indoor: rows.filter((r: any) => r?.location_type === 'ภายใน'),
            outdoor: rows.filter((r: any) => r?.location_type === 'ภายนอก'),
          },
          source: 'from_detail_endpoint',
        });

        const arr = this.dormForm.get('amenities') as FormArray;
        this.AMENITIES.forEach((a, idx) => {
          // ใช้ mapping ที่ถูกต้องแทน idx + 1
          const mappedId = this.getAmenityIdFromIndex(idx);
          const byId = mappedId ? enabledSet.has(mappedId) : false;
          const byName = enabledSet.has(a.name);
          const isChecked = byId || byName;
          arr.at(idx).setValue(isChecked);
        });
        this.cdr.markForCheck();
      } catch (e) {
        console.warn(
          '[DormEdit] amenities GET mapping failed, fallback to detail.amenities',
          e
        );
        const amenitiesFromApi = Array.isArray((detail as any)?.amenities)
          ? (detail as any).amenities
          : [];
        const amenityNames = new Set<string>(
          amenitiesFromApi.map((a: any) =>
            (a.name || a.amenity_name || '').toString().trim()
          )
        );
        const arr = this.dormForm.get('amenities') as FormArray;
        this.AMENITIES.forEach((a, idx) => {
          const checked = amenityNames.has(a.name);
          arr.at(idx).setValue(checked);
        });
        this.cdr.markForCheck();
      }

      // Log ข้อมูลฟอร์มที่ถูกตั้งค่าแล้ว
      console.log('[DormEdit] ข้อมูลฟอร์มที่ถูกตั้งค่าแล้ว:', {
        general_info: {
          name: this.dormForm.get('generalInfo.name')?.value,
          zone_id: this.dormForm.get('generalInfo.zone_id')?.value,
          address: this.dormForm.get('generalInfo.address')?.value,
          description: this.dormForm.get('generalInfo.description')?.value,
        },
        utilities: {
          electricity_type: this.electricity.get('electricity_type')?.value,
          electricity_rate: this.electricity.get('electricity_rate')?.value,
          water_type: this.water.get('water_type')?.value,
          water_rate: this.water.get('water_rate')?.value,
        },
        location: {
          latitude: this.dormForm.get('location.latitude')?.value,
          longitude: this.dormForm.get('location.longitude')?.value,
        },
        room_types_count: this.roomTypes.length,
        images_count: this.imagePreviewUrls.length,
        amenities_selected: (
          this.dormForm.get('amenities') as FormArray
        ).value.filter((v: boolean) => v).length,
        form_valid: this.dormForm.valid,
        full_form_value: this.dormForm.value,
      });

      // stepper: jump to step 2 for quick verify
      this.maxReachedStep = 2;
      this.currentStep = 1;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.initLocationMap();
        this.initPreviewMap();
      }, 300);
    } catch (e) {
      console.error('[DormEdit] Failed to load dormitory for edit:', e);
    } finally {
      this.isInitialLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ---------- Strip manual controls (Step 2) ----------
  private getStripCardWidth(): number {
    const viewport = this.stripViewportRef?.nativeElement;
    if (!viewport) return 0;
    const viewportWidth = viewport.clientWidth;
    const gap = 16; // 1rem
    const visibleCards =
      viewportWidth <= 640 ? 1 : viewportWidth <= 1024 ? 2 : 3;
    const totalGap = gap * (visibleCards - 1);
    return Math.max(0, (viewportWidth - totalGap) / visibleCards);
  }
  onStripPrev(): void {
    const viewport = this.stripViewportRef?.nativeElement;
    if (!viewport) return;
    const cardWidth = this.getStripCardWidth() + 16; // รวม gap
    if (viewport.scrollLeft <= 0) viewport.scrollLeft = viewport.scrollWidth; // วน
    viewport.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  }
  onStripNext(): void {
    const viewport = this.stripViewportRef?.nativeElement;
    if (!viewport) return;
    const cardWidth = this.getStripCardWidth() + 16;
    if (
      Math.ceil(viewport.scrollLeft + viewport.clientWidth) >=
      viewport.scrollWidth
    )
      viewport.scrollLeft = 0; // วน
    viewport.scrollBy({ left: cardWidth, behavior: 'smooth' });
  }

  openImageModal(index: number) {
    this.imageModalIndex = index;
    this.imageModalOpen = true;
    this.cdr.markForCheck();
  }
  closeImageModal() {
    this.imageModalOpen = false;
    this.cdr.markForCheck();
  }
  prevModalImage() {
    const len = this.sliderImages.length;
    this.imageModalIndex = (this.imageModalIndex - 1 + len) % len;
    this.cdr.markForCheck();
  }
  nextModalImage() {
    const len = this.sliderImages.length;
    this.imageModalIndex = (this.imageModalIndex + 1) % len;
    this.cdr.markForCheck();
  }

  // ---------- Map ----------
  private adjustMapHeight() {
    const isElecOfficial =
      this.electricity.get('electricity_type')?.value === 'ตามมิเตอร์';
    const isWaterOfficial =
      this.water.get('water_type')?.value === 'ตามมิเตอร์';
    this.mapHeightClass = isElecOfficial || isWaterOfficial ? 'h-100' : 'h-96';
    setTimeout(() => this.mapService.resize(), 0);
  }

  // --------- ฟอร์ม ---------
  initForm() {
    this.dormForm = this.fb.group({
      generalInfo: this.fb.group({
        name: ['', Validators.required],
        zone_id: ['', Validators.required],
        address: ['', Validators.required],
        description: ['', Validators.required],
        statusDorm: ['ว่าง'], // สถานะหอพัก: 'ว่าง' หรือ 'เต็ม'
      }),
      roomTypes: this.fb.array([this.createRoomType()]),
      utilities: this.fb.group({
        electricity: this.fb.group({
          electricity_type: ['คิดตามหน่วย', Validators.required],
          electricity_rate: ['', [Validators.min(1)]],
        }),
        water: this.fb.group({
          water_type: ['คิดตามหน่วย', Validators.required],
          water_rate: ['', [Validators.min(1)]],
        }),
      }),
      location: this.fb.group({
        latitude: [null, Validators.required],
        longitude: [null, Validators.required],
      }),
      images: this.fb.array([]),

      // amenity: boolean list + ช่อง 'อื่นๆ'
      amenities: this.fb.array(
        this.AMENITIES.map(() => this.fb.control(false))
      ),
      amenitiesOther: this.fb.array([]), // << ช่องกรอก 'อื่นๆ'
    });

    this.setupUtilityValidators();
  }

  // --------- getters เพิ่มเติม ---------
  get amenitiesOther(): FormArray {
    return this.dormForm.get('amenitiesOther') as FormArray;
  }
  isAmenityChecked(id: string): boolean {
    const idx = this.getAmenityIndex(id);
    const arr = this.dormForm.get('amenities') as FormArray;
    return idx > -1 ? !!arr.at(idx).value : false;
  }
  getAmenityLocationType(id: string): string {
    const amenity = this.AMENITIES.find((a) => a.id === id);
    return amenity?.location_type || '';
  }

  // --------- toggle 'อื่นๆ' ---------
  onAmenityChange(index: number, id: string) {
    if (id !== 'other') return;
    const checked = (this.dormForm.get('amenities') as FormArray).at(
      index
    ).value;

    if (checked && this.amenitiesOther.length === 0) {
      this.amenitiesOther.push(
        this.fb.group({
          name: ['', [Validators.required, Validators.maxLength(50)]],
          location_type: ['', Validators.required],
        })
      );
    }
    if (!checked) {
      // เคลียร์รายการอื่นๆ เมื่อยกเลิกติ๊ก
      while (this.amenitiesOther.length) this.amenitiesOther.removeAt(0);
    }
  }
  addOtherAmenityField() {
    this.amenitiesOther.push(
      this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(50)]],
        location_type: ['', Validators.required],
      })
    );
  }
  removeOtherAmenityField(i: number) {
    this.amenitiesOther.removeAt(i);
  }

  private setupUtilityValidators() {
    // ไฟฟ้า
    this.electricity
      .get('electricity_type')
      ?.valueChanges.subscribe((type: string) => {
        const rateControl = this.electricity.get('electricity_rate')!;
        if (type === 'คิดตามหน่วย') {
          rateControl.setValidators([Validators.required, Validators.min(1)]);
          // เคลียร์ค่าเดิมเมื่อเปลี่ยนเป็นคิดตามหน่วย (เคลียร์ทุกครั้ง)
          rateControl.setValue('');
        } else {
          // ตามมิเตอร์ = ไม่ต้องใส่ราคา
          rateControl.clearValidators();
          rateControl.setValue('');
        }
        rateControl.updateValueAndValidity();
      });

    // น้ำ
    this.water.get('water_type')?.valueChanges.subscribe((type: string) => {
      const rateControl = this.water.get('water_rate')!;
      if (type === 'คิดตามหน่วย' || type === 'เหมาจ่าย') {
        rateControl.setValidators([Validators.required, Validators.min(1)]);
        // เคลียร์ค่าเดิมเมื่อเปลี่ยนเป็นคิดตามหน่วย/เหมาจ่าย (เคลียร์ทุกครั้ง)
        rateControl.setValue('');
      } else {
        // ตามมิเตอร์ = ไม่ต้องใส่ราคา
        rateControl.clearValidators();
        rateControl.setValue('');
      }
      rateControl.updateValueAndValidity();
    });
  }

  private loadZones(): void {
    this.zonesLoading = true;
    this.zonesError = null;
    this.dormitoryService.getAllZones().subscribe({
      next: (res) => {
        this.zones = Array.isArray(res) ? res : [];
        this.zonesLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.zonesLoading = false;
        this.zonesError = 'ไม่สามารถโหลดรายการโซนได้';
        console.error(err);
        this.cdr.markForCheck();
      },
    });
  }

  createRoomType() {
    return this.fb.group(
      {
        type: ['', Validators.required],
        customType: [''],
        bed_type: ['', Validators.required], // เพิ่มประเภทเตียง
        pricePerMonth: ['', [Validators.min(1)]],
        pricePerDay: ['', [Validators.min(1)]],
        pricePerTerm: ['', [Validators.min(1)]],
        pricePerSummer: ['', [Validators.min(1)]],
        room_type_id: [null],
      },
      { validators: this.requireMonthOrDay }
    );
  }

  // === Helpers ===
  get amenitiesList(): Amenity[] {
    return this.AMENITIES;
  }
  getAmenityIndex(amenityId: string): number {
    return this.amenityIndexMap.get(amenityId) ?? -1;
  }

  isOther(i: number): boolean {
    const g = this.roomTypes.at(i) as FormGroup;
    return g.get('type')?.value === 'other';
  }
  onTypeChange(i: number) {
    const g = this.roomTypes.at(i) as FormGroup;
    const type = g.get('type')?.value;
    const custom = g.get('customType');
    if (type === 'other') {
      custom?.setValidators([Validators.required, Validators.maxLength(100)]);
    } else {
      custom?.clearValidators();
      custom?.setValue('');
    }
    custom?.updateValueAndValidity({ emitEvent: false });

    if (type === 'other')
      setTimeout(() => {
        const el = this.document.querySelector<HTMLInputElement>(
          'input[formcontrolname="customType"]'
        );
        el?.focus();
      });
    this.cdr.markForCheck();
  }
  confirmOther(i: number) {
    const g = this.roomTypes.at(i) as FormGroup;
    const custom = (g.get('customType')?.value || '').trim();
    if (!custom) {
      g.get('type')?.setValue('');
      g.get('customType')?.setValue('');
      g.get('customType')?.clearValidators();
      g.get('customType')?.updateValueAndValidity({ emitEvent: false });
    }
    this.cdr.markForCheck();
  }
  revertOther(i: number) {
    const g = this.roomTypes.at(i) as FormGroup;
    g.get('type')?.setValue('');
    g.get('customType')?.setValue('');
    g.get('customType')?.clearValidators();
    g.get('customType')?.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }

  // getters
  get roomTypes(): FormArray {
    return this.dormForm.get('roomTypes') as FormArray;
  }
  get utilities(): FormGroup {
    return this.dormForm.get('utilities') as FormGroup;
  }
  get electricity(): FormGroup {
    return this.utilities.get('electricity') as FormGroup;
  }
  get water(): FormGroup {
    return this.utilities.get('water') as FormGroup;
  }
  get imagesArray(): FormArray {
    return this.dormForm.get('images') as FormArray;
  }

  // number helpers
  private toNumber(val: any): number | null {
    if (val === null || val === undefined) return null;
    const s = String(val).replace(/[,\s]/g, '');
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  private collectNumbers(keys: string[]): number[] {
    return (this.roomTypes.controls as FormGroup[])
      .map((g) => keys.map((k) => this.toNumber(g.get(k)?.value)))
      .flat()
      .filter((n): n is number => n !== null && n >= 0);
  }
  private thBaht(n: number): string {
    return new Intl.NumberFormat('th-TH').format(n);
  }

  // price text
  get priceRangeText(): string {
    const monthly = this.collectNumbers(['pricePerMonth']);
    const pick = monthly.length
      ? monthly
      : this.collectNumbers(['pricePerDay']);
    if (!pick.length) return '-';
    const unit = monthly.length ? 'บาท/เดือน' : 'บาท/วัน';
    const min = Math.min(...pick);
    const max = Math.max(...pick);
    if (pick.length === 1 || min === max) return `${this.thBaht(min)} ${unit}`;
    return `${this.thBaht(min)} - ${this.thBaht(max)} ${unit}`;
  }

  get zoneName(): string {
    const id = Number(this.dormForm.get('generalInfo.zone_id')?.value);
    const z = this.zones.find((z) => z.zone_id === id);
    return z?.zone_name ?? '';
  }

  // Display helpers for room table
  getRoomDisplayName(rt: any): string {
    const nameRaw =
      rt?.type === 'other' ? (rt?.customType || '').trim() : rt?.type || '-';
    return nameRaw || '-';
  }

  formatNumberOrDash(value: any): string {
    if (value === null || value === undefined || value === '') return '-';
    const normalized = String(value).replace(/[,\s]/g, '');
    const num = Number(normalized);
    return Number.isFinite(num) ? num.toLocaleString('th-TH') : '-';
  }

  addRoomType() {
    this.roomTypes.push(this.createRoomType());
  }
  removeRoomType(index: number) {
    this.roomTypes.removeAt(index);
  }

  // จำกัดให้กรอกเฉพาะตัวเลขในช่องราคา
  enforceNumeric(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const cleaned = input.value.replace(/[^\d]/g, '');
    if (cleaned !== input.value) input.value = cleaned;
  }

  // nav
  nextStep() {
    // Validate current step before proceeding
    if (this.currentStep === 1) {
      // ตรวจสอบตามลำดับที่กำหนด

      // 1. ข้อมูลทั่วไป
      const generalInfoGroup = this.dormForm.get('generalInfo') as FormGroup;
      if (!generalInfoGroup) {
        this.showCustomPopup('กรุณากรอกข้อมูลทั่วไปให้ครบถ้วน', 'error');
        return;
      }

      const name = generalInfoGroup.get('name')?.value?.trim();
      const zone_id = generalInfoGroup.get('zone_id')?.value;
      const address = generalInfoGroup.get('address')?.value?.trim();
      const description = generalInfoGroup.get('description')?.value?.trim();

      if (!name) {
        this.showCustomPopup(
          'กรุณากรอกชื่อหอพัก',
          'error',
          'input[formControlName="name"]'
        );
        return;
      }
      if (!zone_id) {
        this.showCustomPopup(
          'กรุณาเลือกโซน',
          'error',
          'select[formControlName="zone_id"]'
        );
        return;
      }
      if (!address) {
        this.showCustomPopup(
          'กรุณากรอกที่อยู่',
          'error',
          'input[formControlName="address"]'
        );
        return;
      }
      if (!description) {
        this.showCustomPopup(
          'กรุณากรอกรายละเอียดเพิ่มเติม',
          'error',
          'textarea[formControlName="description"]'
        );
        return;
      }

      // 2. ประเภทห้อง
      const roomTypesArray = this.roomTypes;
      if (roomTypesArray.length === 0) {
        this.showCustomPopup(
          'กรุณาเพิ่มประเภทห้องอย่างน้อย 1 ประเภท',
          'error',
          '#room-types-header'
        );
        return;
      }

      // ตรวจสอบแต่ละประเภทห้อง
      for (let i = 0; i < roomTypesArray.length; i++) {
        const roomType = roomTypesArray.at(i) as FormGroup;
        const typeField = roomType.get('type')?.value;
        const bedTypeField = roomType.get('bed_type')?.value;
        const monthlyPrice = roomType.get('pricePerMonth')?.value?.trim();
        const dailyPrice = roomType.get('pricePerDay')?.value?.trim();

        if (!typeField) {
          this.showCustomPopup(
            `กรุณาเลือกประเภทห้องที่ ${i + 1}`,
            'error',
            `#room-type-header-${i}`
          );
          return;
        }
        if (!bedTypeField) {
          this.showCustomPopup(
            `กรุณาเลือกประเภทเตียงที่ ${i + 1}`,
            'error',
            `#room-type-header-${i}`
          );
          return;
        }
        // ตรวจสอบว่าค่าที่กรอกเป็นตัวเลขและขั้นต่ำ 1
        const isMonthlyValid =
          !monthlyPrice ||
          (/^\d+$/.test(monthlyPrice) && Number(monthlyPrice) >= 1);
        const isDailyValid =
          !dailyPrice || (/^\d+$/.test(dailyPrice) && Number(dailyPrice) >= 1);

        if (!monthlyPrice && !dailyPrice) {
          this.showCustomPopup(
            `กรุณากรอกราคารายเดือนหรือรายวันที่ ${i + 1}`,
            'error',
            `#room-type-header-${i}`
          );
          return;
        }

        if (monthlyPrice && !/^\d+$/.test(monthlyPrice)) {
          this.showCustomPopup(
            `กรุณากรอกราคารายเดือนเป็นตัวเลขเท่านั้นที่ ${i + 1}`,
            'error',
            `#room-type-header-${i}`
          );
          return;
        }

        if (dailyPrice && !/^\d+$/.test(dailyPrice)) {
          this.showCustomPopup(
            `กรุณากรอกราคารายวันเป็นตัวเลขเท่านั้นที่ ${i + 1}`,
            'error',
            `#room-type-header-${i}`
          );
          return;
        }
        if (
          (monthlyPrice && Number(monthlyPrice) === 0) ||
          (dailyPrice && Number(dailyPrice) === 0)
        ) {
          this.showCustomPopup(
            `กรุณากรอกราคาอย่างน้อย 1 บาท ที่ประเภทห้อง ${i + 1}`,
            'error',
            `#room-type-header-${i}`
          );
          return;
        }
      }

      // 3. สิ่งอำนวยความสะดวก
      const amenitiesArray = this.dormForm.get('amenities') as FormArray;
      const selectedAmenities = amenitiesArray.value.filter(
        (amenity: boolean) => amenity === true
      );
      if (selectedAmenities.length === 0) {
        this.showCustomPopup(
          'กรุณาเลือกสิ่งอำนวยความสะดวกอย่างน้อย 1 รายการ',
          'error',
          '#amenities-header'
        );
        return;
      }

      // 4. ค่าใช้จ่าย
      const utilities = this.dormForm.get('utilities') as FormGroup;
      const electricityType = utilities.get(
        'electricity.electricity_type'
      )?.value;
      const waterType = utilities.get('water.water_type')?.value;
      const electricityRate = utilities
        .get('electricity.electricity_rate')
        ?.value?.trim();
      const waterRate = utilities.get('water.water_rate')?.value?.trim();

      if (!electricityType) {
        this.showCustomPopup(
          'กรุณาเลือกประเภทค่าไฟ',
          'error',
          'button[ng-reflect-ng-switch-case], select[formControlName="electricity_type"]'
        );
        return;
      }
      if (!waterType) {
        this.showCustomPopup(
          'กรุณาเลือกประเภทค่าน้ำ',
          'error',
          'button[ng-reflect-ng-switch-case], select[formControlName="water_type"]'
        );
        return;
      }

      // ตรวจสอบอัตราค่าไฟ
      if (electricityType === 'คิดตามหน่วย') {
        if (!electricityRate) {
          this.showCustomPopup(
            'กรุณากรอกอัตราค่าไฟ',
            'error',
            'input[formControlName="electricity_rate"]'
          );
          return;
        }
        if (!/^\d+(\.\d{1,2})?$/.test(electricityRate)) {
          this.showCustomPopup(
            'กรุณากรอกอัตราค่าไฟเป็นตัวเลขเท่านั้น',
            'error',
            'input[formControlName="electricity_rate"]'
          );
          return;
        }
      }

      // ตรวจสอบอัตราค่าน้ำ
      if (waterType === 'คิดตามหน่วย' || waterType === 'เหมาจ่าย') {
        if (!waterRate) {
          this.showCustomPopup(
            'กรุณากรอกอัตราค่าน้ำ',
            'error',
            'input[formControlName="water_rate"]'
          );
          return;
        }
        if (!/^\d+(\.\d{1,2})?$/.test(waterRate)) {
          this.showCustomPopup(
            'กรุณากรอกอัตราค่าน้ำเป็นตัวเลขเท่านั้น',
            'error',
            'input[formControlName="water_rate"]'
          );
          return;
        }
      }

      // 5. ตำแหน่ง
      const location = this.dormForm.get('location') as FormGroup;
      const latitude = location.get('latitude')?.value;
      const longitude = location.get('longitude')?.value;

      if (!latitude || !longitude) {
        this.showCustomPopup('กรุณาเลือกตำแหน่งหอพักบนแผนที่', 'error');
        return;
      }

      // 6. รูปภาพ
      if (this.imagePreviewUrls.length < 5) {
        this.showCustomPopup(
          'กรุณาอัปโหลดรูปภาพอย่างน้อย 5 ภาพ',
          'error',
          '#file-upload'
        );
        return;
      }
    } else if (this.currentStep === 2) {
      // Validate Room Types
      const roomTypesArray = this.roomTypes;

      if (roomTypesArray.length === 0) {
        this.showCustomPopup(
          'กรุณาเพิ่มประเภทห้องอย่างน้อย 1 ประเภท',
          'error',
          '#room-types-header'
        );
        return;
      }

      // Validate each room type
      let hasValidRoomType = false;
      let validationErrors: string[] = [];

      for (let i = 0; i < roomTypesArray.length; i++) {
        const roomType = roomTypesArray.at(i) as FormGroup;
        this.markFormGroupTouched(roomType);

        const typeField = roomType.get('type');
        const bedTypeField = roomType.get('bed_type');
        const monthlyPrice = roomType.get('pricePerMonth')?.value?.trim();
        const dailyPrice = roomType.get('pricePerDay')?.value?.trim();

        console.log(`[DormAdd nextStep] Room type ${i + 1} validation:`, {
          valid: roomType.valid,
          type: {
            value: typeField?.value,
            valid: typeField?.valid,
            errors: typeField?.errors,
          },
          bed_type: {
            value: bedTypeField?.value,
            valid: bedTypeField?.valid,
            errors: bedTypeField?.errors,
          },
          pricePerMonth: monthlyPrice,
          pricePerDay: dailyPrice,
          groupErrors: roomType.errors,
        });

        // ตรวจสอบว่าค่าที่กรอกเป็นตัวเลขหรือไม่
        const isMonthlyValid = !monthlyPrice || /^\d+$/.test(monthlyPrice);
        const isDailyValid = !dailyPrice || /^\d+$/.test(dailyPrice);

        if (roomType.valid && isMonthlyValid && isDailyValid) {
          hasValidRoomType = true;
        } else {
          if (typeField?.hasError('required')) {
            validationErrors.push('กรุณาเลือกประเภทห้อง');
          }
          if (bedTypeField?.hasError('required')) {
            validationErrors.push('กรุณาเลือกประเภทเตียง');
          }
          if (!monthlyPrice && !dailyPrice) {
            validationErrors.push('กรุณากรอกราคารายเดือนหรือรายวัน');
          }
          if (monthlyPrice && !isMonthlyValid) {
            validationErrors.push('กรุณากรอกราคารายเดือนเป็นตัวเลขเท่านั้น');
          }
          if (dailyPrice && !isDailyValid) {
            validationErrors.push('กรุณากรอกราคารายวันเป็นตัวเลขเท่านั้น');
          }
        }
      }

      console.log('[DormAdd nextStep] Validation summary:', {
        hasValidRoomType,
        validationErrors,
        totalRoomTypes: roomTypesArray.length,
      });

      if (!hasValidRoomType) {
        const errorMessage =
          validationErrors.length > 0
            ? 'กรุณาแก้ไขข้อผิดพลาด:\n' + validationErrors.join('\n')
            : 'กรุณากรอกข้อมูลประเภทห้องให้ครบถ้วน';
        console.log('[DormAdd nextStep] About to show alert:', errorMessage);
        this.showCustomPopup(errorMessage, 'error');
        return;
      }

      // Check if at least one room type has price
      const roomPayloads = this.buildRoomTypePayloads();
      if (roomPayloads.length === 0) {
        this.showCustomPopup(
          'กรุณากรอกราคารายเดือนหรือรายวันสำหรับประเภทห้องอย่างน้อย 1 ประเภท',
          'error'
        );
        return;
      }
    }

    // Proceed to next step if validation passes
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      if (this.currentStep > this.maxReachedStep)
        this.maxReachedStep = this.currentStep;

      // Initialize map เมื่อไปยัง step ที่มี map
      if (this.currentStep === 2) {
        setTimeout(() => {
          this.initLocationMap();
          this.initPreviewMap();
          this.cdr.markForCheck();
        }, 500);
      }
    }
  }
  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      // เมื่อย้อนกลับมา Step 2 ให้สร้างแผนที่ใหม่เสมอ (เหมือนหน้า Add)
      if (this.currentStep === 2) {
        setTimeout(() => {
          this.initLocationMap();
          this.initPreviewMap();
          this.cdr.markForCheck();
        }, 500);
      }
    }
  }
  goToStep(step: number) {
    if (step <= this.maxReachedStep && step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;

      // Initialize map เมื่อไปยัง step ที่มี map
      if (this.currentStep === 2) {
        setTimeout(() => {
          // ตรวจสอบและสร้างแมปถ้ายังไม่มี
          this.initLocationMap();
          this.initPreviewMap();
          this.cdr.markForCheck();
        }, 500);
      }
    }
  }

  // *** ป้องกัน multiple submissions ***
  private isSubmittingGuard = false;

  // submit
  onSubmit() {
    // Log ข้อมูลที่กำลังจะส่ง
    console.log('[DormEdit] กำลังส่งข้อมูลหอพัก:', {
      is_edit_mode: this.isEditMode,
      editing_dorm_id: this.editingDormId,
      form_value: this.dormForm.value,
      form_valid: this.dormForm.valid,
      room_types_payload: this.buildRoomTypePayloads(),
      amenities_payload: this.buildEnabledAmenitiesForPost(),
      images_count: this.selectedImages.length,
      existing_images_count: this.existingImages.length,
    });

    // *** Guard against multiple simultaneous submissions ***
    if (this.isSubmittingGuard) {
      return;
    }

    // เซ็ต guard flag
    this.isSubmittingGuard = true;

    // ตรวจสอบข้อมูลทั่วไป (Step 1)
    const generalInfoGroup = this.dormForm.get('generalInfo') as FormGroup;
    if (!generalInfoGroup || !generalInfoGroup.valid) {
      this.markFormGroupTouched(generalInfoGroup || this.dormForm);
      this.showCustomPopup('กรุณากรอกข้อมูลทั่วไปให้ครบถ้วน', 'error');
      this.isSubmittingGuard = false; // รีเซ็ต guard
      return;
    }

    // ตรวจสอบข้อมูลประเภทห้อง (Step 2)
    const roomTypesArray = this.roomTypes;

    if (roomTypesArray.length === 0) {
      this.showCustomPopup(
        'กรุณาเพิ่มประเภทห้องอย่างน้อย 1 ประเภท',
        'error',
        '#room-types-header'
      );
      this.isSubmittingGuard = false; // รีเซ็ต guard
      return;
    }

    // ตรวจสอบ room type แต่ละประเภท
    let validationErrors: string[] = [];
    let hasValidRoomType = false;

    for (let i = 0; i < roomTypesArray.length; i++) {
      const roomType = roomTypesArray.at(i) as FormGroup;
      this.markFormGroupTouched(roomType);

      const typeField = roomType.get('type');
      const bedTypeField = roomType.get('bed_type');
      const monthlyPrice = roomType.get('pricePerMonth')?.value;
      const dailyPrice = roomType.get('pricePerDay')?.value;

      // ไม่พึ่ง roomType.valid แล้ว ให้ตรวจสอบเองทุกอย่าง
      let roomHasErrors = false;

      // ตรวจสอบ type แบบง่ายๆ
      const typeValue = typeField?.value?.toString().trim() || '';
      if (typeValue === '') {
        validationErrors.push(`ประเภทห้องที่ ${i + 1}: กรุณาเลือกประเภทห้อง`);
        roomHasErrors = true;
      }

      // ตรวจสอบ bed_type แบบง่ายๆ
      const bedTypeValue = bedTypeField?.value?.toString().trim() || '';
      if (bedTypeValue === '') {
        validationErrors.push(`ประเภทห้องที่ ${i + 1}: กรุณาเลือกประเภทเตียง`);
        roomHasErrors = true;
      }

      // ตรวจสอบราคา
      const hasMonthlyPrice =
        monthlyPrice && monthlyPrice.toString().trim() !== '';
      const hasDailyPrice = dailyPrice && dailyPrice.toString().trim() !== '';
      if (!hasMonthlyPrice && !hasDailyPrice) {
        validationErrors.push(
          `ประเภทห้องที่ ${i + 1}: กรุณากรอกราคารายเดือนหรือรายวัน`
        );
        roomHasErrors = true;
      }

      if (!roomHasErrors) {
        hasValidRoomType = true;
      } else {
      }
    }

    if (!hasValidRoomType) {
      const errorMessage =
        validationErrors.length > 0
          ? 'กรุณาแก้ไขข้อผิดพลาด:\n' + validationErrors.join('\n')
          : 'กรุณากรอกข้อมูลประเภทห้องให้ครบถ้วน';

      this.showCustomPopup(errorMessage, 'error');
      this.isSubmittingGuard = false; // รีเซ็ต guard
      return;
    }

    // ตรวจสอบว่ามี room payload ที่พร้อมส่งหรือไม่
    const roomPayloads = this.buildRoomTypePayloads();

    if (roomPayloads.length === 0) {
      this.showCustomPopup(
        'กรุณากรอกราคารายเดือนหรือรายวันสำหรับประเภทห้องอย่างน้อย 1 ประเภท',
        'error'
      );
      return;
    }

    const v = this.dormForm.value;
    try {
      const u = this.authService.currentUser$.value;
    } catch {}

    const payloadBasic: any = {
      dormName: v.generalInfo.name,
      zoneId: Number(v.generalInfo.zone_id),
      address: v.generalInfo.address,
      description: v.generalInfo.description,
      latitude:
        typeof v.location.latitude === 'string'
          ? Number(v.location.latitude)
          : v.location.latitude,
      longitude:
        typeof v.location.longitude === 'string'
          ? Number(v.location.longitude)
          : v.location.longitude,
      electricityType: v.utilities.electricity.electricity_type,
      waterType: v.utilities.water.water_type,
    };

    // เพิ่ม statusDorm เฉพาะตอนแก้ไข
    if (this.isEditMode && v.generalInfo.statusDorm) {
      payloadBasic.statusDorm = v.generalInfo.statusDorm;
    }

    // Log ข้อมูลที่ส่งไปยัง API
    console.log('[DormEdit] ข้อมูลที่ส่งไปยัง API:', {
      dorm_id: this.editingDormId,
      payload: payloadBasic,
      location_data: {
        latitude_raw: v.location.latitude,
        longitude_raw: v.location.longitude,
        latitude_processed: payloadBasic.latitude,
        longitude_processed: payloadBasic.longitude,
        latitude_type: typeof payloadBasic.latitude,
        longitude_type: typeof payloadBasic.longitude,
        is_latitude_number: typeof payloadBasic.latitude === 'number',
        is_longitude_number: typeof payloadBasic.longitude === 'number',
        latitude_is_nan: Number.isNaN(payloadBasic.latitude),
        longitude_is_nan: Number.isNaN(payloadBasic.longitude),
      },
      form_location_value: {
        latitude: this.dormForm.get('location.latitude')?.value,
        longitude: this.dormForm.get('location.longitude')?.value,
      },
    });
    // Optional numeric rates: only include when present
    const eraw = v.utilities.electricity.electricity_rate;
    if (
      eraw !== null &&
      eraw !== undefined &&
      String(eraw).toString().trim() !== ''
    ) {
      payloadBasic.electricityRate = Number(String(eraw).replace(/[,\s]/g, ''));
    }
    const wraw = v.utilities.water.water_rate;
    if (
      wraw !== null &&
      wraw !== undefined &&
      String(wraw).toString().trim() !== ''
    ) {
      payloadBasic.waterRate = Number(String(wraw).replace(/[,\s]/g, ''));
    }

    // *** Set both guards ***
    this.isSubmittingGuard = true;
    this.isSubmitting = true;
    this.cdr.markForCheck();

    // ใช้เส้นทางแก้ไขเมื่ออยู่ในโหมดแก้ไข - ใช้ Admin API
    if (this.isEditMode && this.editingDormId) {
      const dormId = this.editingDormId;
      this.adminService
        .updateDormitory(dormId, payloadBasic)
        .subscribe({
          next: (resp) => {
            console.log('[DormEdit] อัปเดตข้อมูลพื้นฐานสำเร็จ:', {
              dorm_id: dormId,
              response: resp,
              payload_sent: payloadBasic,
              location_updated: {
                sent_latitude: payloadBasic.latitude,
                sent_longitude: payloadBasic.longitude,
                response_latitude: resp?.latitude || resp?.data?.latitude,
                response_longitude: resp?.longitude || resp?.data?.longitude,
              },
            });

            const existingIds = new Set<number>();
            const toAdd: Array<Partial<RoomType>> = [];
            const toUpdate: Array<{ id: number; data: Partial<RoomType> }> = [];

            // Collect form rows
            (this.roomTypes.controls as FormGroup[]).forEach((g) => {
              const idRaw = g.get('room_type_id')?.value;
              const id =
                idRaw !== null && idRaw !== undefined && idRaw !== ''
                  ? Number(idRaw)
                  : null;
              const type = g.get('type')?.value;
              const customType = g.get('customType')?.value;
              const bedType = g.get('bed_type')?.value;
              const monthly = this.toNumber(g.get('pricePerMonth')?.value);
              const daily = this.toNumber(g.get('pricePerDay')?.value);
              const term = this.toNumber(g.get('pricePerTerm')?.value);
              const summer = this.toNumber(g.get('pricePerSummer')?.value);
              const hasAny = [monthly, daily, term, summer].some(
                (v) => v !== null
              );
              if (!hasAny) return;
              const data: Partial<RoomType> = {
                name: type === 'other' ? (customType || '').trim() : type,
                bed_type: bedType,
              };
              if (monthly !== null) data.monthly_price = monthly;
              if (daily !== null) data.daily_price = daily;
              if (term !== null) (data as any).term_price = term;
              if (summer !== null) (data as any).summer_price = summer;

              if (id) {
                existingIds.add(id);
                toUpdate.push({ id, data });
              } else {
                toAdd.push(data);
              }
            });

            // ลบประเภทห้องที่ไม่ได้ส่งมาใหม่
            const toDelete = this.originalRoomTypes
              .filter(
                (rt) => rt.room_type_id && !existingIds.has(rt.room_type_id)
              )
              .map((rt) => rt.room_type_id!);

            // Fire requests: deletes, updates, then adds
            const calls = [
              ...toDelete.map((id) => this.dormitoryService.deleteRoomType(id)),
              ...toUpdate.map(({ id, data }) =>
                this.dormitoryService.updateRoomType(id, data)
              ),
              ...toAdd.map((data) =>
                this.dormitoryService.addRoomTypeForEdit(dormId, data)
              ),
            ];
            forkJoin(calls.length ? calls : [of(null)]).subscribe({
              next: (individualResp) => {
                console.log('[DormEdit] อัปเดตประเภทห้องสำเร็จ:', {
                  dorm_id: dormId,
                  to_delete: toDelete,
                  to_update: toUpdate,
                  to_add: toAdd,
                  response: individualResp,
                });

                // Submit amenities as full enabled list after basic + rooms succeed - ตามสเปคใหม่
                const amenitiesPayload = this.buildEnabledAmenitiesForPost();
                this.ownerDormitoryService
                  .saveDormAmenitiesForEdit(dormId, amenitiesPayload)
                  .subscribe({
                    next: () => {
                      console.log(
                        '[DormEdit] บันทึกสิ่งอำนวยความสะดวกสำเร็จ:',
                        {
                          dorm_id: dormId,
                          amenities_payload: amenitiesPayload,
                        }
                      );
                      this.uploadImagesIfAny(dormId);
                    },
                    error: (amenErr) => {
                      console.error(
                        '[DormEdit] Save amenities (edit) error:',
                        amenErr
                      );
                      // Proceed to image upload even if amenities fails, but show warning
                      this.showCustomPopup(
                        'บันทึกสิ่งอำนวยความสะดวกไม่สำเร็จ',
                        'warning'
                      );
                      this.uploadImagesIfAny(dormId);
                    },
                  });
              },
              error: (err2) => {
                console.error('[DormEdit] Save room types (edit) error:', err2);
                this.isSubmittingGuard = false;
                this.isSubmitting = false;
                this.submitErrorMessage =
                  'บันทึกประเภทห้องไม่สำเร็จ: ' +
                  (err2?.message || 'ไม่ทราบสาเหตุ');
                this.showErrorModal = true;
                this.cdr.markForCheck();
              },
            });
          },
          error: (err) => {
            console.error('[DormEdit] Update dormitory error:', err);
            this.isSubmittingGuard = false;
            this.isSubmitting = false;
            this.submitErrorMessage =
              'บันทึกไม่สำเร็จ: ' + (err?.message || 'ไม่ทราบสาเหตุ');
            this.showErrorModal = true;
            this.cdr.markForCheck();
          },
        });
      return;
    }

    // โหมดเพิ่มใหม่ (fallback เดิม)
    this.ownerDormitoryService.addDormitoryBasic(payloadBasic).subscribe({
      next: (resp) => {
        const dormId =
          resp?.dorm_id ??
          resp?.id ??
          resp?.dorm?.dorm_id ??
          resp?.data?.dorm_id ??
          null;

        if (!dormId) {
          console.error(
            '[DormEdit] No dorm ID received from backend (create mode)'
          );
          this.isSubmittingGuard = false;
          this.isSubmitting = false;
          this.submitErrorMessage = 'ไม่สามารถสร้างหอพักได้ กรุณาลองอีกครั้ง';
          this.showErrorModal = true;
          this.cdr.markForCheck();
          return;
        }

        // ใช้ individual calls แทน bulk
        const calls = roomPayloads.map((p) =>
          this.dormitoryService.addRoomType(dormId, p)
        );

        forkJoin(calls.length ? calls : [of(null)]).subscribe({
          next: (individualResp) => {
            // อัปโหลดรูปภาพ (ถ้ามี)
            this.uploadImagesIfAny(dormId);
          },
          error: (err2) => {
            console.error(
              '[DormEdit] Save room types error (create mode):',
              err2
            );
            this.isSubmittingGuard = false;
            this.isSubmitting = false;
            this.submitErrorMessage =
              'บันทึกประเภทห้องไม่สำเร็จ: ' +
              (err2?.message || 'ไม่ทราบสาเหตุ');
            this.showErrorModal = true;
            this.cdr.markForCheck();
          },
        });
      },
      error: (err) => {
        console.error('[DormEdit] Add dormitory error (create mode):', err);
        this.isSubmittingGuard = false;
        this.isSubmitting = false;
        this.submitErrorMessage =
          'บันทึกไม่สำเร็จ: ' + (err?.message || 'ไม่ทราบสาเหตุ');
        this.showErrorModal = true;
        this.cdr.markForCheck();
      },
    });
  }

  closeErrorModal() {
    this.showErrorModal = false;
  }

  private initSliderImages() {
    if (this.imagePreviewUrls.length > 0) {
      this.sliderImages = this.imagePreviewUrls.map((url, index) => ({
        src: url,
        alt: `รูปภาพหอพัก ${index + 1}`,
      }));
    } else {
      // default images
      this.sliderImages = [
        {
          src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องนั่งเล่นทันสมัย',
        },
        {
          src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องพักสะอาดตา',
        },
        {
          src: 'https://images.unsplash.com/photo-1560448075-bb485b067938?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องนอนอบอุ่น',
        },
        {
          src: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องครัวโมเดิร์น',
        },
        {
          src: 'https://images.unsplash.com/photo-1505692794403-34d4982f88aa?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องรับแขกโปร่งสบาย',
        },
        {
          src: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80',
          alt: 'มุมทำงาน',
        },
        {
          src: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1600&q=80',
          alt: 'ตกแต่งด้วยต้นไม้',
        },
        {
          src: 'https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องน้ำสะอาด',
        },
        {
          src: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องนั่งเล่นอบอุ่น',
        },
        {
          src: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องนอนมินิมอล',
        },
      ];
    }
    this.cdr.markForCheck();
  }

  updateSliderImages(): void {
    this.initSliderImages();
    this.cdr.markForCheck();
  }

  private buildRoomTypePayloads(): Array<Partial<RoomType>> {
    const payloads: Array<Partial<RoomType>> = [];
    const list = this.roomTypes.controls as FormGroup[];
    for (const g of list) {
      const type = g.get('type')?.value;
      const customType = g.get('customType')?.value;
      const bedType = g.get('bed_type')?.value; // เพิ่มประเภทเตียง
      const monthly = this.toNumber(g.get('pricePerMonth')?.value);
      const daily = this.toNumber(g.get('pricePerDay')?.value);
      const term = this.toNumber(g.get('pricePerTerm')?.value);
      const summer = this.toNumber(g.get('pricePerSummer')?.value);
      const hasAny = [monthly, daily, term, summer].some((v) => v !== null);
      if (!hasAny) continue;
      // ยกเลิกการกำหนด price_type; ให้หลังบ้านคำนวณเอง
      let priceType = 'รายเดือน'; // default
      if (daily !== null && monthly === null) {
        priceType = 'รายวัน';
      } else if (daily !== null && monthly !== null) {
        priceType = 'รายวันและรายเดือน';
      }

      const payload: Partial<RoomType> = {
        name: type === 'other' ? (customType || '').trim() : type,
        bed_type: bedType, // เพิ่มประเภทเตียงใน payload
        // price_type ตัดออก ให้หลังบ้านคำนวณเอง
      };
      if (monthly !== null) payload.monthly_price = monthly;
      if (daily !== null) payload.daily_price = daily;
      if (term !== null) payload.term_price = term;
      if (summer !== null) payload.summer_price = summer;
      payloads.push(payload);
    }
    return payloads;
  }

  goToOwnerPage() {
    // ระบบใหม่ไม่มีหน้าเจ้าของหอพัก ให้กลับไปหน้าแอดมินแทน
    this.router.navigate(['/admin']);
  }

  cancelForm() {
    // ยกเลิกการแก้ไขและกลับไปหน้า Admin
    this.onClose.emit();
  }

  private markFormGroupTouched(group: FormGroup | FormArray) {
    Object.keys(group.controls).forEach((key) => {
      const control = group.get(key);
      if (control instanceof FormGroup || control instanceof FormArray)
        this.markFormGroupTouched(control);
      else control?.markAsTouched();
    });
  }

  // ---------- Distance Calculation ----------
  private calculateAndUpdateDistance(lat: number, lng: number): void {
    const dormName = this.dormForm.get('generalInfo.name')?.value?.trim() || '';
    const zoneId = this.dormForm.get('generalInfo.zone_id')?.value;
    const zoneName =
      this.zones.find((z) => z.zone_id === Number(zoneId))?.zone_name || '';

    if (!dormName || !zoneName) {
      console.log(
        '[DormEdit] Cannot calculate distance: missing dorm name or zone'
      );
      return;
    }

    const distance = this.distanceService.calculateDistance(lat, lng);
    const distanceText = this.distanceService.createDistanceText(
      dormName,
      zoneName,
      distance
    );

    console.log('[DormEdit] คำนวณระยะทาง:', {
      dorm_name: dormName,
      zone_name: zoneName,
      coordinates: { latitude: lat, longitude: lng },
      distance_km: distance,
      distance_text: distanceText,
      dorm_id: this.editingDormId,
    });

    // อัปเดต description ด้วย distance text
    const currentDescription =
      this.dormForm.get('generalInfo.description')?.value || '';
    const { description: cleanDescription } =
      this.distanceService.splitDescription(currentDescription);
    const newDescription = this.distanceService.combineDescription(
      distanceText,
      cleanDescription
    );

    console.log('[DormEdit] อัปเดต description ด้วยข้อมูลระยะทาง:', {
      old_description: currentDescription,
      clean_description: cleanDescription,
      distance_text: distanceText,
      new_description: newDescription,
      dorm_id: this.editingDormId,
    });

    this.dormForm.get('generalInfo.description')?.setValue(newDescription);
    this.cdr.markForCheck();
  }

  // ฟังก์ชัน initLocationMap แบบเดียวกับหน้า DormAdd (เช็ค DOM และขนาดก่อน สร้างเฉพาะเมื่อพร้อม)
  initLocationMap() {
    setTimeout(() => {
      const mapElement = this.document.getElementById('location-map');
      if (!mapElement) {
        setTimeout(() => this.initLocationMap(), 1000);
        return;
      }

      if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
        console.error('[DormEdit] Map element has zero dimensions, waiting...');
        setTimeout(() => this.initLocationMap(), 500);
        return;
      }

      if (this.mapService.isMapInitialized('location-map')) {
        return;
      }

      const loc = this.dormForm.get('location')!;
      const lat = loc.get('latitude')?.value;
      const lng = loc.get('longitude')?.value;

      // ตรวจสอบว่ามีข้อมูลพิกัดหรือไม่
      if (
        !lat ||
        !lng ||
        Number.isNaN(Number(lat)) ||
        Number.isNaN(Number(lng))
      ) {
        console.error(
          '[DormEdit] ไม่สามารถสร้างแผนที่ได้: ข้อมูลพิกัดไม่ถูกต้อง',
          {
            latitude: lat,
            longitude: lng,
            dorm_id: this.editingDormId,
          }
        );
        return;
      }

      try {
        console.log('[DormEdit] สร้างแผนที่ตำแหน่ง:', {
          container: 'location-map',
          coordinates: { latitude: lat, longitude: lng },
          dorm_id: this.editingDormId,
          is_edit_mode: this.isEditMode,
        });

        this.mapService.initializeMap('location-map', lat, lng);

        console.log('[DormEdit] แผนที่ตำแหน่งสร้างสำเร็จ');

        this.mapService.enablePickLocation(({ lat, lng }) => {
          console.log('[DormEdit] ผู้ใช้เลือกตำแหน่งใหม่บนแผนที่:', {
            old_coordinates: {
              latitude: loc.get('latitude')?.value,
              longitude: loc.get('longitude')?.value,
            },
            new_coordinates: { latitude: lat, longitude: lng },
            dorm_id: this.editingDormId,
          });

          // อัปเดต Form values อย่างชัดเจน
          loc.get('latitude')?.setValue(lat);
          loc.get('longitude')?.setValue(lng);

          // อัปเดต Form state
          loc.get('latitude')?.markAsDirty();
          loc.get('longitude')?.markAsDirty();
          loc.get('latitude')?.markAsTouched();
          loc.get('longitude')?.markAsTouched();

          // อัปเดตแผนที่ให้แสดงตำแหน่งใหม่
          this.mapService.initializeMap('location-map', lat, lng);

          // คำนวณระยะทางใหม่เมื่อแก้ไขพิกัด
          this.calculateAndUpdateDistance(lat, lng);

          // บังคับให้ Angular ตรวจสอบการเปลี่ยนแปลง
          this.cdr.detectChanges();
          this.cdr.markForCheck();

          console.log('[DormEdit] อัปเดตพิกัดเสร็จสิ้น:', {
            form_latitude: loc.get('latitude')?.value,
            form_longitude: loc.get('longitude')?.value,
            new_latitude: lat,
            new_longitude: lng,
          });
        });
      } catch (error) {
        console.error('[DormEdit] Map initialization error:', error);
      }
    }, 200);
  }

  // ฟังก์ชัน initPreviewMap แบบเดียวกับหน้า DormAdd (เช็ค DOM และขนาดก่อน สร้างเฉพาะเมื่อพร้อม)
  initPreviewMap() {
    // console.log('[DormEdit] initPreviewMap called');

    setTimeout(() => {
      const mapElement = this.document.getElementById('preview-map');
      if (!mapElement) {
        setTimeout(() => this.initPreviewMap(), 1000);
        return;
      }

      if (this.mapService.isMapInitialized('preview-map')) {
        return;
      }

      const loc = this.dormForm.get('location')!;
      const lat = loc.get('latitude')?.value;
      const lng = loc.get('longitude')?.value;

      if (
        !lat ||
        !lng ||
        Number.isNaN(Number(lat)) ||
        Number.isNaN(Number(lng))
      ) {
        console.error(
          '[DormEdit] ไม่สามารถสร้างแผนที่ตัวอย่างได้: ข้อมูลพิกัดไม่ถูกต้อง',
          {
            latitude: lat,
            longitude: lng,
            dorm_id: this.editingDormId,
          }
        );
        return;
      }

      try {
        console.log('[DormEdit] สร้างแผนที่ตัวอย่าง:', {
          container: 'preview-map',
          coordinates: { latitude: lat, longitude: lng },
          title: 'ตำแหน่งหอพัก',
          dorm_id: this.editingDormId,
          is_edit_mode: this.isEditMode,
        });

        this.mapService.initializeMap('preview-map', lat, lng, 'ตำแหน่งหอพัก');

        console.log('[DormEdit] แผนที่ตัวอย่างสร้างสำเร็จ');
      } catch (error) {
        console.error('[DormEdit] Preview map initialization error:', error);
      }
    }, 300);
  }

  // ---------- Drag & Drop Methods ----------
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById(
      'file-upload'
    ) as HTMLInputElement;
    fileInput?.click();
  }

  onImageReorder(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    // Reorder both arrays using CDK's moveItemInArray
    moveItemInArray(
      this.selectedImages,
      event.previousIndex,
      event.currentIndex
    );
    moveItemInArray(
      this.imagePreviewUrls,
      event.previousIndex,
      event.currentIndex
    );
    moveItemInArray(this.previewMeta, event.previousIndex, event.currentIndex);

    // Update form array
    this.updateFormArray();

    // Update slider images
    this.updateSliderImages();
  }

  private updateFormArray(): void {
    // Clear existing form array
    while (this.imagesArray.length) {
      this.imagesArray.removeAt(0);
    }

    // Add images in new order
    this.selectedImages.forEach((file, index) => {
      this.imagesArray.push(
        this.fb.group({
          file: [file],
          preview: [this.imagePreviewUrls[index]],
          image_type: [''],
        })
      );
    });
  }

  private handleFiles(files: File[]): void {
    // ตรวจสอบจำนวนไฟล์
    if (this.selectedImages.length + files.length > 20) {
      this.showCustomPopup('ไม่สามารถอัปโหลดได้เกิน 20 ภาพ', 'error');
      return;
    }

    // ตรวจสอบไฟล์ทั้งหมดก่อน
    const validFiles: File[] = [];
    for (const file of files) {
      // ตรวจสอบขนาดไฟล์ (5MB = 5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        this.showCustomPopup(`ไฟล์ ${file.name} มีขนาดเกิน 5MB`, 'error');
        continue;
      }

      // ตรวจสอบประเภทไฟล์
      if (!file.type.startsWith('image/')) {
        this.showCustomPopup(`ไฟล์ ${file.name} ไม่ใช่รูปภาพ`, 'error');
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // เพิ่มไฟล์ทั้งหมดในครั้งเดียว
    this.selectedImages.push(...validFiles);

    // สร้าง preview URLs แบบ async เพื่อไม่ให้ UI block
    this.createImagePreviews(validFiles);
  }

  private createImagePreviews(files: File[]): void {
    let processedCount = 0;
    const totalFiles = files.length;

    files.forEach((file, index) => {
      // ใช้ createObjectURL แทน readAsDataURL เพื่อความเร็ว
      const url = URL.createObjectURL(file);
      this.imagePreviewUrls.push(url);
      this.previewMeta.push({
        isNew: true,
        isPrimary: this.imagePreviewUrls.length === 0,
      });
      this.imageError = false;

      // เก็บไฟล์ในฟอร์ม
      this.imagesArray.push(
        this.fb.group({
          file: [file],
          preview: [url],
          image_type: [''],
        })
      );

      processedCount++;

      // อัปเดต UI เมื่อประมวลผลเสร็จครบทุกไฟล์
      if (processedCount === totalFiles) {
        this.cdr.markForCheck();
        this.updateSliderImages();
      }
    });
  }

  // ---------- Images ----------
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    this.handleFiles(files);
  }

  removeImage(index: number): void {
    if (index < 0 || index >= this.imagePreviewUrls.length) return;

    const meta = this.previewMeta[index];
    const urlToRemove = this.imagePreviewUrls[index];

    const finalizeLocalRemoval = () => {
      if (urlToRemove && urlToRemove.startsWith('blob:')) {
        URL.revokeObjectURL(urlToRemove);
      }
      this.imagePreviewUrls.splice(index, 1);
      this.previewMeta.splice(index, 1);
      this.selectedImages.splice(index, 1);
      this.updateFormArray();
      this.updateSliderImages();
      this.cdr.markForCheck();
    };

    // If it's an existing image (has imageId), call DELETE API first
    if (meta?.imageId && this.isEditMode && this.editingDormId) {
      const dormId = this.editingDormId;
      this.isDeletingImage = true;
      this.deletingImageIndex = index;
      this.ownerDormitoryService
        .deleteDormImageForEdit(dormId, meta.imageId)
        .subscribe({
          next: () => {
            // เก็บรูปใหม่ที่อัปโหลดไว้ก่อน
            const newImages = this.imagePreviewUrls.filter(
              (url, idx) => this.previewMeta[idx]?.isNew
            );
            const newMeta = this.previewMeta.filter((meta) => meta?.isNew);
            const newFiles = this.selectedImages.filter(
              (file, idx) => this.previewMeta[idx]?.isNew
            );

            // Refresh from GET to ensure primary/order state
            this.dormitoryService.getImages(dormId).subscribe((imgs) => {
              this.existingImages = imgs as any[];
              this.imagePreviewUrls = [];
              this.previewMeta = [];

              // เพิ่มรูปเก่าที่เหลือ
              (imgs as any[]).forEach((img: any) => {
                if (!img?.image_url) return;
                this.imagePreviewUrls.push(img.image_url);
                this.previewMeta.push({
                  imageId: Number(img.image_id),
                  isNew: false,
                  isPrimary: !!img.is_primary,
                });
              });

              // เพิ่มรูปใหม่ที่อัปโหลดไว้กลับมา
              this.imagePreviewUrls.push(...newImages);
              this.previewMeta.push(...newMeta);
              this.selectedImages = newFiles;

              while (this.imagesArray.length) this.imagesArray.removeAt(0);
              this.imagePreviewUrls.forEach((url) => {
                this.imagesArray.push(
                  this.fb.group({
                    file: [null],
                    preview: [url],
                    image_type: [''],
                  })
                );
              });
              this.updateSliderImages();
              this.cdr.markForCheck();
            });
            this.isDeletingImage = false;
            this.deletingImageIndex = null;
          },
          error: () => {
            // If DELETE fails, keep as is and show error
            this.showCustomPopup('ลบรูปภาพไม่สำเร็จ', 'error');
            this.isDeletingImage = false;
            this.deletingImageIndex = null;
          },
        });
      return;
    }

    // New image (not uploaded yet) -> remove locally
    finalizeLocalRemoval();
  }

  // ตั้งรูปภาพเป็นภาพหลัก (ย้ายไปตำแหน่งแรก)
  setAsMainImage(index: number): void {
    if (index === 0 || index < 0 || index >= this.imagePreviewUrls.length)
      return;

    const meta = this.previewMeta[index];

    // Existing image -> call API to set primary
    if (meta?.imageId && this.isEditMode && this.editingDormId) {
      const dormId = this.editingDormId;
      this.isSettingPrimary = true;
      this.settingPrimaryIndex = index;
      this.ownerDormitoryService
        .setPrimaryDormImageForEdit(dormId, meta.imageId)
        .subscribe({
          next: () => {
            // เก็บรูปใหม่ที่อัปโหลดไว้ก่อน
            const newImages = this.imagePreviewUrls.filter(
              (url, idx) => this.previewMeta[idx]?.isNew
            );
            const newMeta = this.previewMeta.filter((meta) => meta?.isNew);
            const newFiles = this.selectedImages.filter(
              (file, idx) => this.previewMeta[idx]?.isNew
            );

            // Refresh list from backend
            this.dormitoryService.getImages(dormId).subscribe((imgs) => {
              this.existingImages = imgs as any[];
              this.imagePreviewUrls = [];
              this.previewMeta = [];

              // เพิ่มรูปเก่าที่เหลือ
              (imgs as any[]).forEach((img: any) => {
                if (!img?.image_url) return;
                this.imagePreviewUrls.push(img.image_url);
                this.previewMeta.push({
                  imageId: Number(img.image_id),
                  isNew: false,
                  isPrimary: !!img.is_primary,
                });
              });

              // เพิ่มรูปใหม่ที่อัปโหลดไว้กลับมา
              this.imagePreviewUrls.push(...newImages);
              this.previewMeta.push(...newMeta);
              this.selectedImages = newFiles;

              while (this.imagesArray.length) this.imagesArray.removeAt(0);
              this.imagePreviewUrls.forEach((url) => {
                this.imagesArray.push(
                  this.fb.group({
                    file: [null],
                    preview: [url],
                    image_type: [''],
                  })
                );
              });
              this.currentImageIndex = 0;
              this.updateSliderImages();
              this.showCustomPopup('ตั้งเป็นภาพหลักแล้ว', 'success');
              this.isSettingPrimary = false;
              this.settingPrimaryIndex = null;
              this.cdr.markForCheck();
            });
          },
          error: () => {
            this.isSettingPrimary = false;
            this.settingPrimaryIndex = null;
            this.showCustomPopup('ตั้งรูปหลักไม่สำเร็จ', 'error');
          },
        });
      return;
    }

    // New image (not uploaded yet) -> move to first locally
    const imageToMove = this.imagePreviewUrls[index];
    const fileToMove = this.selectedImages[index];
    const metaToMove = this.previewMeta[index];
    this.imagePreviewUrls.splice(index, 1);
    this.selectedImages.splice(index, 1);
    this.previewMeta.splice(index, 1);
    this.imagePreviewUrls.unshift(imageToMove);
    this.selectedImages.unshift(fileToMove);
    this.previewMeta.unshift(metaToMove);
    this.updateFormArray();
    this.updateSliderImages();
    this.currentImageIndex = 0;
    this.showCustomPopup('ตั้งเป็นภาพหลักแล้ว', 'success');
  }

  // ตรวจสอบว่าเป็นภาพหลักหรือไม่
  isMainImage(index: number): boolean {
    return index === 0;
  }

  private uploadImagesIfAny(dormId: number): void {
    if (this.selectedImages.length === 0) {
      // ไม่มีรูป ไปขั้นตอนสุดท้าย
      this.finishSubmission();
      return;
    }

    console.log('[DormEdit] Uploading images:', this.selectedImages.length);

    // สร้าง FormData สำหรับส่งรูปภาพ
    const formData = new FormData();

    // เพิ่มรูปภาพตามลำดับ (รูปแรก = ภาพหลัก)
    this.selectedImages.forEach((file, index) => {
      formData.append('images', file);
    });

    // ส่งไป backend
    this.ownerDormitoryService
      .uploadDormImagesForEdit(dormId, formData)
      .subscribe({
        next: (response) => {
          console.log('[DormEdit] อัปโหลดรูปภาพสำเร็จ:', {
            dorm_id: dormId,
            images_uploaded: this.selectedImages.length,
            response: response,
          });

          // After upload, refresh image list from backend to get image_id and primary flags
          this.dormitoryService.getImages(dormId).subscribe((imgs) => {
            this.existingImages = imgs as any[];
            this.imagePreviewUrls = [];
            this.previewMeta = [];
            (imgs as any[]).forEach((img: any) => {
              if (!img?.image_url) return;
              this.imagePreviewUrls.push(img.image_url);
              this.previewMeta.push({
                imageId: Number(img.image_id),
                isNew: false,
                isPrimary: !!img.is_primary,
              });
            });
            while (this.imagesArray.length) this.imagesArray.removeAt(0);
            this.imagePreviewUrls.forEach((url) => {
              this.imagesArray.push(
                this.fb.group({
                  file: [null],
                  preview: [url],
                  image_type: [''],
                })
              );
            });
            this.updateSliderImages();
            this.cdr.markForCheck();
            this.finishSubmission();
          });
        },
        error: (error) => {
          console.error('[DormEdit] Image upload error:', error);
          // Even if upload fails, proceed to finish
          this.finishSubmission();
        },
      });
  }

  private finishSubmission(): void {
    console.log('[DormEdit] การแก้ไขหอพักเสร็จสมบูรณ์:', {
      is_edit_mode: this.isEditMode,
      editing_dorm_id: this.editingDormId,
      final_form_value: this.dormForm.value,
      final_location: {
        latitude: this.dormForm.get('location.latitude')?.value,
        longitude: this.dormForm.get('location.longitude')?.value,
      },
      final_room_types_count: this.roomTypes.length,
      final_images_count: this.imagePreviewUrls.length,
      final_amenities_count: (
        this.dormForm.get('amenities') as FormArray
      ).value.filter((v: boolean) => v).length,
    });

    console.log('[DormEdit] finishSubmission called');
    console.log('[DormEdit] Current step before:', this.currentStep);
    this.currentStep = 3;
    this.maxReachedStep = 3;
    this.isSubmittingGuard = false;
    this.isSubmitting = false;
    console.log('[AdminEditDorm] Calling cdr.markForCheck()');
    this.cdr.markForCheck();
    console.log('[AdminEditDorm] finishSubmission completed');

    // แสดงข้อความสำเร็จและ emit event กลับไป Admin
    this.showCustomPopup('บันทึกข้อมูลหอพักสำเร็จ', 'success');
    
    setTimeout(() => {
      this.onSaveSuccess.emit();
    }, 1500);
  }

  private buildAmenitiesPayload(): Array<{
    amenity_id?: number;
    amenity_name: string;
    location_type: string;
    is_available: boolean;
  }> {
    const amenities: Array<{
      amenity_id?: number;
      amenity_name: string;
      location_type: string;
      is_available: boolean;
    }> = [];

    // Standard amenities - ส่งเฉพาะที่ผู้ใช้เลือก (isChecked = true)
    this.AMENITIES.forEach((amenity, index) => {
      const isChecked = this.dormForm.get('amenities')?.value[index];
      if (isChecked) {
        amenities.push({
          amenity_id: index + 1, // สมมติว่า amenity_id ใน DB เริ่มจาก 1
          amenity_name: amenity.name, // ส่งชื่อที่ผู้ใช้เห็น (แอร์, WIFI, ลิฟต์, etc.)
          location_type: amenity.location_type,
          is_available: true,
        });
      }
    });

    // Custom amenities (อื่นๆ) - ส่งเฉพาะที่ผู้ใช้กรอก
    this.amenitiesOther.controls.forEach((ctrl) => {
      const group = ctrl as FormGroup;
      const name = group.get('name')?.value?.trim();
      const locationType = group.get('location_type')?.value;

      if (name && locationType) {
        amenities.push({
          amenity_name: name, // ส่งชื่อที่ผู้ใช้กรอกเอง
          location_type: locationType,
          is_available: true,
        });
      }
    });

    return amenities;
  }

  // Build payload for PATCH /edit-dormitory/:id/amenities as "full enabled list" - ตามสเปคใหม่
  private buildEnabledAmenitiesForPost(): Array<{
    amenity_id?: number;
    is_available: boolean;
    location_type: string;
    amenity_name: string;
  }> {
    const enabled: Array<{
      amenity_id?: number;
      is_available: boolean;
      location_type: string;
      amenity_name: string;
    }> = [];
    const arr = this.dormForm.get('amenities') as FormArray;
    this.AMENITIES.forEach((amenity, index) => {
      const isChecked = !!arr.at(index)?.value;
      if (isChecked) {
        // ใช้ mapping ที่ถูกต้องแทน index + 1
        enabled.push({
          amenity_id: this.getAmenityIdFromIndex(index),
          is_available: true,
          location_type: amenity.location_type,
          amenity_name: amenity.name,
        });
      }
    });

    // Include custom ones
    this.amenitiesOther.controls.forEach((ctrl) => {
      const group = ctrl as FormGroup;
      const name = (group.get('name')?.value || '').trim();
      const locationType = group.get('location_type')?.value || '';
      if (name) {
        enabled.push({
          is_available: true,
          location_type: locationType,
          amenity_name: name,
        });
      }
    });
    return enabled;
  }

  ngOnDestroy(): void {
    console.log('[DormEdit] ทำลายแผนที่และทำความสะอาด:', {
      dorm_id: this.editingDormId,
      is_edit_mode: this.isEditMode,
      maps_to_destroy: ['location-map', 'preview-map'],
      current_coordinates: {
        latitude: this.dormForm.get('location.latitude')?.value,
        longitude: this.dormForm.get('location.longitude')?.value,
      },
    });

    // ทำลาย map instance เมื่อออกจาก component
    try {
      this.mapService.destroyMapByContainer('location-map');
      console.log('[DormEdit] ทำลายแผนที่ location-map สำเร็จ');
    } catch (error) {
      console.log('[DormEdit] Map cleanup error (location-map):', error);
    }

    try {
      this.mapService.destroyMapByContainer('preview-map');
      console.log('[DormEdit] ทำลายแผนที่ preview-map สำเร็จ');
    } catch (error) {
      console.log('[DormEdit] Map cleanup error (preview-map):', error);
    }

    // disconnect observers
    try {
      this.locationResizeObserver?.disconnect();
    } catch {}
    try {
      this.previewResizeObserver?.disconnect();
    } catch {}

    // Cleanup object URLs เพื่อป้องกัน memory leaks
    this.imagePreviewUrls.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

  // Custom popup methods
  showCustomPopup(
    message: string,
    type: 'error' | 'warning' | 'success' = 'error',
    scrollTargetSelector?: string
  ) {
    console.log('[DormEdit] showCustomPopup called with:', {
      message,
      type,
      scrollTargetSelector,
    });
    this.popupMessage = message;
    this.popupType = type;
    this.popupTargetSelector = scrollTargetSelector || null;
    console.log(
      '[DormEdit] popupTargetSelector set to:',
      this.popupTargetSelector
    );
    this.showPopup = true;
  }

  closePopup(shouldMove: boolean = false) {
    console.log(
      '[DormEdit] closePopup called, shouldMove:',
      shouldMove,
      'targetSelector:',
      this.popupTargetSelector
    );
    this.showPopup = false;
    if (shouldMove && this.popupTargetSelector) {
      // รอให้ modal ปิดสมบูรณ์ก่อน scroll
      setTimeout(() => {
        console.log('[DormEdit] About to scroll to:', this.popupTargetSelector);
        this.scrollToRoomTypeWithHighlight(this.popupTargetSelector!);
        this.popupTargetSelector = null;
      }, 200);
    }
  }

  // CHANGED: ให้รองรับ default ไปที่ header เสมอ
  private scrollToRoomTypeWithHighlight(selector: string) {
    console.log('[DormEdit] Looking for element with selector:', selector);
    const targetElement = this.findTargetElement(selector);

    if (targetElement) {
      console.log('[DormEdit] Element found, scrolling to:', targetElement);

      // เลื่อนแบบคำนวณระยะเอง เพื่อชดเชย navbar/sticky header
      const rect = targetElement.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const topWithOffset = Math.max(absoluteTop - this.SCROLL_OFFSET_PX, 0);

      window.scrollTo({ top: topWithOffset, behavior: 'smooth' });

      // รอให้เลื่อนแล้วค่อย focus + flash
      setTimeout(() => {
        this.focusIfInput(targetElement);
        this.flashHighlight(targetElement); // NEW
      }, 350);
    } else {
      console.error('[DormEdit] Element not found with selector:', selector);
    }
  }

  // แยก concerns: หา element ด้วย multiple selectors
  private findTargetElement(selector: string): HTMLElement | null {
    console.log('[DormEdit] Searching for selector:', selector);

    // Handle comma-separated selectors
    const selectors = selector.split(',').map((s) => s.trim());

    for (const sel of selectors) {
      console.log('[DormEdit] Trying selector:', sel);
      let element = this.document.querySelector<HTMLElement>(sel);
      if (element) {
        console.log('[DormEdit] Found element with selector:', sel, element);
        return element;
      }
    }

    // Fallback: หาจาก room type index
    const roomTypeMatch = selector.match(/room-type-(\d+)/);
    if (roomTypeMatch) {
      const index = parseInt(roomTypeMatch[1]);
      console.log('[DormEdit] Trying room type fallback for index:', index);

      // Try multiple selectors
      const fallbackSelectors = [
        `#room-type-${index}`,
        `#room-type-header-${index}`,
        `.room-type-container:nth-child(${index + 1})`,
        `div[formGroupName="${index}"] span.font-medium`,
      ];

      for (const sel of fallbackSelectors) {
        console.log('[DormEdit] Trying fallback selector:', sel);
        const element = this.document.querySelector<HTMLElement>(sel);
        if (element) {
          console.log(
            '[DormEdit] Found element with fallback selector:',
            sel,
            element
          );
          return element;
        }
      }
    }

    console.log('[DormEdit] No element found for selector:', selector);
    return null;
  }

  // NEW: ไฮไลต์ชั่วคราวให้เห็นชัดว่าเลื่อนไปถึง
  private flashHighlight(el: HTMLElement) {
    el.classList.add('scroll-flash'); // ใส่คลาสชั่วคราว
    el.setAttribute('tabindex', '-1'); // ให้ focus ได้แม้ไม่ใช่ input
    el.focus({ preventScroll: true });

    setTimeout(() => {
      el.classList.remove('scroll-flash');
      el.removeAttribute('tabindex');
    }, 1200);
  }

  // แยก concerns: focus input elements
  private focusIfInput(element: HTMLElement) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.focus();
    }
  }

  // ตรวจสอบว่ามีราคา 0 บาทหรือไม่
  hasZeroPriceError(roomType: AbstractControl): boolean {
    const priceFields = [
      'pricePerDay',
      'pricePerMonth',
      'pricePerTerm',
      'pricePerSummer',
    ];
    return priceFields.some((field) => {
      const control = roomType.get(field);
      return control && control.touched && control.value === '0';
    });
  }
}
