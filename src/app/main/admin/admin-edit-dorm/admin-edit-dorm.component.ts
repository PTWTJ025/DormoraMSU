import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { SupabaseService } from '../../../services/supabase.service';
import { DistanceService } from '../../../services/distance.service';
import { environment } from '../../../../environments/environment';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

interface Zone {
  zone_id: number;
  zone_name: string;
}

interface DormImage {
  image_id: number;
  image_url: string;
  is_primary: boolean;
}

interface ImageFile {
  file: File;
  preview: string;
  isPrimary: boolean;
  url?: string;
  uploadStatus?: 'pending' | 'success' | 'error';
}

interface ImageItem {
  type: 'file' | 'url';
  file?: File;
  url?: string;
  preview: string;
  isPrimary: boolean;
  uploadStatus?: 'pending' | 'success' | 'error' | 'validated';
}

@Component({
  selector: 'app-admin-edit-dorm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-edit-dorm.component.html',
  styleUrls: ['./admin-edit-dorm.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AdminEditDormComponent implements OnInit, OnDestroy {
  @Input() dormId: string | null = null;
  @Output() editSuccess = new EventEmitter<void>();
  
  public dormIdNum: number = 0;
  
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imageGrid') imageGrid!: ElementRef<HTMLDivElement>;
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('successModal') successModal!: ElementRef<HTMLDivElement>;
  @ViewChild('successModalContent')
  successModalContent!: ElementRef<HTMLDivElement>;

  dormForm!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  isUploadingImages = false;
  showSuccessModal = false;

  // Image management
  images: ImageFile[] = [];
  imageItems: ImageItem[] = []; // เก็บทั้งไฟล์และ URL
  imageUrls: string[] = [];
  existingImages: DormImage[] = [];
  maxImages = 20;
  imageUrlInput: string = ''; // สำหรับ input ลิงก์
  isAddingUrl: boolean = false; // สถานะการเพิ่ม URL

  private getExistingImageCount(): number {
    return this.existingImages?.length || 0;
  }

  private getNewUploadCount(): number {
    return this.images?.length || 0;
  }

  private getUrlImageCount(): number {
    return this.imageItems?.length || 0;
  }

  getCurrentImageCount(): number {
    return (
      this.getExistingImageCount() +
      this.getNewUploadCount() +
      this.getUrlImageCount()
    );
  }

  isImageLimitReached(): boolean {
    return this.getCurrentImageCount() >= this.maxImages;
  }

  private getRemainingImageSlots(): number {
    return Math.max(this.maxImages - this.getCurrentImageCount(), 0);
  }

  // Legacy for compatibility
  dormImages: DormImage[] = [];

  zones: Zone[] = [];
  private zoneGuideHints: { keywords: string[]; text: string }[] = [
    {
      keywords: ['หน้ามอ'],
      text: 'โซนหน้ามอ ตั้งแต่หน้ามหาวิทยาลัยถึงบ้านดอนเวียงจันทร์และถนนหน้าป้าย',
    },
    {
      keywords: ['ท่าขอนยาง'],
      text: 'โซนท่าขอนยาง ครอบคลุมถนนหลักและซอยต่าง ๆ รอบตลาดและมหาวิทยาลัยใหม่',
    },
    {
      keywords: ['ขามเรียง'],
      text: 'โซนขามเรียง ขยายไปจนถึงบ้านโนนสะแบงและพื้นที่ใกล้เคียง',
    },
    {
      keywords: ['กู่แก้ว'],
      text: 'โซนกู่แก้ว ตั้งแต่เซเว่นกู่แก้วไปจนถึงศาลาวัดกู่แก้ว',
    },
    {
      keywords: ['ดอนนา'],
      text: 'โซนดอนนา ต่อเนื่องถึงสามแยกเส้นไปท่าขอนยางและพื้นที่รอบ ๆ',
    },
  ];
  amenitiesList: string[] = [];

  // Map properties
  map: maptilersdk.Map | null = null;
  marker: maptilersdk.Marker | null = null;
  currentMapStyle: 'satellite' | 'streets' = 'satellite';
  private readonly defaultMapCenter: [number, number] = [103.2565, 16.2467];

  // Toast notification
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

  // Step navigation
  currentStep = 1;
  totalSteps = 4;
  minImages = 3;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private adminService: AdminService,
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef,
    private distanceService: DistanceService,
  ) {}

  ngOnInit() {
    // Load dotlottie script
    this.loadDotLottieScript();
    
    if (!this.dormId) {
      return;
    }
    
    this.dormIdNum = Number(this.dormId);
    if (!this.dormIdNum) {
      return;
    }

    console.log('🏠 Admin Edit Dorm - Initializing with ID:', this.dormIdNum);

    this.initForm();
    this.fetchInitialData();
  }

  loadDotLottieScript() {
    if (!document.querySelector('script[src*="dotlottie-wc"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.3/dist/dotlottie-wc.js';
      script.type = 'module';
      script.onload = () => {
        console.log('dotlottie-wc script loaded successfully');
      };
      script.onerror = () => {
        console.error('Failed to load dotlottie-wc script');
      };
      document.head.appendChild(script);
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  initForm() {
    this.dormForm = this.fb.group({
      accommodation_type: ['หอ', Validators.required],
      dorm_name: ['', [Validators.required, Validators.minLength(3)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      zone_id: ['', Validators.required],
      description: [''],

      latitude: [null, Validators.required],
      longitude: [null, Validators.required],

      room_type: ['', Validators.required],
      room_type_other: [''],

      monthly_price: [''],
      daily_price: [''], 
      summer_price: [''],
      deposit: [''],

      electricity_price_type: ['', Validators.required],
      electricity_price: [{ value: '', disabled: true }],
      water_price_type: ['', Validators.required],
      water_price: [{ value: '', disabled: true }],

      contact_name: [''],
      contact_phone: ['', [Validators.pattern(/^[0-9]{9,10}$/)]],
      contact_email: ['', [Validators.email]],
      line_id: [''],

      amenities: this.fb.group({}),
      approval_status: [''],
      term_price: [''],
    });

    // Handle price type changes
    this.dormForm
      .get('electricity_price_type')
      ?.valueChanges.subscribe((val) => {
        const ctrl = this.dormForm.get('electricity_price');
        if (!val || val === 'ตามอัตราการไฟฟ้า' || val === 'สอบถามหอพัก') {
          ctrl?.disable();
          ctrl?.setValue(null);
        } else {
          ctrl?.enable();
        }
      });

    this.dormForm.get('water_price_type')?.valueChanges.subscribe((val) => {
      const ctrl = this.dormForm.get('water_price');
      if (!val || val === 'ตามอัตราการประปา' || val === 'สอบถามหอพัก') {
        ctrl?.disable();
        ctrl?.setValue(null);
      } else {
        ctrl?.enable();
      }
    });
  }

  async fetchInitialData() {
    this.isLoading = true;
    try {
      // Fetch zones and amenities first to build the form template
      const [zones, amenitiesRaw] = await Promise.all([
        this.adminService.getZones().toPromise(),
        this.adminService.getAmenities().toPromise(),
      ]);

      this.zones = zones || [];

      // เรียงตามความนิยม/ความสำคัญที่คนหาหอพักพิจารณาก่อน
      const popularityOrder = [
        'แอร์', 'WIFI', 'เครื่องทำน้ำอุ่น', 'ตู้เย็น', 'พัดลม',
        'เตียงนอน', 'ตู้เสื้อผ้า', 'โต๊ะทำงาน', 'กล้องวงจรปิด', 'คีย์การ์ด',
        'ที่จอดรถ', 'เครื่องซักผ้าหยอดเหรียญ', 'ตู้กดน้ำหยอดเหรียญ', 'ซิงค์ล้างจาน',
        'โต๊ะเครื่องแป้ง', 'ไมโครเวฟ', 'ลิฟต์', 'ฟิตเนส', 'สระว่ายน้ำ',
        'TV', 'Lobby', 'ที่วางพัสดุ', 'รปภ', 'อนุญาตให้เลี้ยงสัตว์',
      ];

      this.amenitiesList = [...(amenitiesRaw || [])].sort((a, b) => {
        const indexA = popularityOrder.findIndex((key) => a.includes(key));
        const indexB = popularityOrder.findIndex((key) => b.includes(key));
        const orderA = indexA === -1 ? 999 : indexA;
        const orderB = indexB === -1 ? 999 : indexB;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b, 'th');
      });

      // Add controls for amenities
      const amenitiesGroup = this.dormForm.get('amenities') as FormGroup;
      this.amenitiesList.forEach((a) => {
        if (!amenitiesGroup.contains(a)) {
          amenitiesGroup.addControl(a, this.fb.control(false));
        }
      });

      // Now fetch the dormitory details and patch the form
      const data = await this.adminService
        .getDormitoryDetail(this.dormIdNum.toString())
        .toPromise();

      if (!data) throw new Error('Data not found');

      const dorm = data.dormitory;
      
      // แก้ไขการโหลดรูปภาพตาม Flow ใหม่
      // จาก GET /api/admin/dormitories/:dormId → field images
      this.existingImages = dorm.images || [];
      this.dormImages = dorm.images || [];

      this.dormForm.patchValue({
        accommodation_type: dorm.accommodation_type || 'หอ',
        dorm_name: dorm.dorm_name,
        address: dorm.address,
        zone_id: dorm.zone_id || (this.zones[0]?.zone_id ?? ''),
        description: dorm.description || dorm.dorm_description || '',
        latitude: dorm.latitude || 16.244, // Default MSU coordinates
        longitude: dorm.longitude || 103.251, // Default MSU coordinates
        room_type: dorm.room_type || '',
        room_type_other: dorm.room_type_other,
        monthly_price: dorm.monthly_price,
        daily_price: dorm.daily_price,
        summer_price: dorm.summer_price,
        deposit: dorm.deposit,
        electricity_price_type: (dorm as any).electricity_price_type || 'ราคาหน่วยละ (บาท/หน่วย)',
        electricity_price: dorm.electricity_price,
        water_price_type: (dorm as any).water_price_type || 'ราคาหน่วยละ (บาท/หน่วย)',
        water_price: dorm.water_price,
        approval_status: dorm.approval_status,
        contact_name: dorm.manager_name || dorm.owner_name,
        contact_phone: dorm.primary_phone || dorm.owner_phone,
        contact_email: dorm.contact_email || dorm.owner_email,
        line_id: dorm.line_id || dorm.owner_line_id,
        term_price: dorm.term_price,
      });

      // Patch amenities checkboxes
      console.log('🔍 Full dorm object:', dorm);
      console.log('🔍 Dorm amenities type:', typeof dorm.amenities);
      console.log('🔍 Dorm amenities value:', dorm.amenities);
      
      if (dorm.amenities && Array.isArray(dorm.amenities)) {
        const patchObj: any = {};
        
        // ข้อมูลจาก API เป็น array ธรรมดา
        console.log('🔍 Amenities from API (array):', dorm.amenities);
        
        dorm.amenities.forEach((a: any) => {
          console.log('🔍 Processing amenity:', a);
          if (amenitiesGroup.contains(a.amenity_name)) {
            patchObj[a.amenity_name] = true; // ถ้ามีในฐานข้อมูล = เลือก (true)
          }
        });
        
        console.log('🔍 Amenity patch object:', patchObj);
        amenitiesGroup.patchValue(patchObj);
      }

      // Enable/disable price fields based on type
      const electricityType = this.dormForm.get('electricity_price_type')?.value;
      const waterType = this.dormForm.get('water_price_type')?.value;
      
      console.log('🔍 Raw data from API:', dorm);
      console.log('⚡ Electricity Type from API:', (dorm as any).electricity_price_type);
      console.log('💧 Water Type from API:', (dorm as any).water_price_type);
      console.log('⚡ Electricity Price from API:', dorm.electricity_price);
      console.log('💧 Water Price from API:', dorm.water_price);
      console.log('⚡ Electricity Type in form:', electricityType);
      console.log('💧 Water Type in form:', waterType);
      
      if (electricityType === 'ตามอัตราการไฟฟ้า' || electricityType === 'สอบถามหอพัก') {
        this.dormForm.get('electricity_price')?.disable();
        this.dormForm.get('electricity_price')?.setValue(null);
        console.log('⚡ Electricity price disabled');
      } else {
        this.dormForm.get('electricity_price')?.enable();
        console.log('⚡ Electricity price enabled with value:', dorm.electricity_price);
      }
      
      if (waterType === 'ตามอัตราการประปา' || waterType === 'สอบถามหอพัก') {
        this.dormForm.get('water_price')?.disable();
        this.dormForm.get('water_price')?.setValue(null);
        console.log('💧 Water price disabled');
      } else {
        this.dormForm.get('water_price')?.enable();
        console.log('💧 Water price enabled with value:', dorm.water_price);
      }

      // เพิ่มการจัดการพิกัดให้ซิงค์กัน
      this.setupLocationSync();

      this.isLoading = false;
      
      console.log('🏠 Form data after patching:', this.dormForm.value);
      console.log('⚡ Electricity Type:', this.dormForm.get('electricity_price_type')?.value);
      console.log('⚡ Electricity Price:', this.dormForm.get('electricity_price')?.value);
      console.log('💧 Water Type:', this.dormForm.get('water_price_type')?.value);
      console.log('💧 Water Price:', this.dormForm.get('water_price')?.value);
      console.log('🏠 Available room types:', this.getRoomTypes());
      console.log('🏠 Existing images:', this.existingImages);
      
      // คำนวณระยะทางตามถนนจากพิกัดปัจจุบัน
      const initialLat = Number(this.dormForm.get('latitude')?.value);
      const initialLng = Number(this.dormForm.get('longitude')?.value);
      if (!isNaN(initialLat) && !isNaN(initialLng)) {
        this.refreshRoadDistance(initialLat, initialLng);
      }

      setTimeout(() => this.initMap(), 100);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      this.showToastNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
      this.isLoading = false;
    }
  }

  // 🔄 การจัดการพิกัดให้ซิงค์กันระหว่างแผนที่และฟอร์ม
  setupLocationSync() {
    // เมื่อค่าพิกัดในฟอร์มเปลี่ยน → อัปเดตแผนที่
    this.dormForm.get('latitude')?.valueChanges.subscribe(lat => {
      const lng = this.dormForm.get('longitude')?.value;
      if (lat && lng) {
        this.updateMapPosition(lat, lng);
      }
    });

    this.dormForm.get('longitude')?.valueChanges.subscribe(lng => {
      const lat = this.dormForm.get('latitude')?.value;
      if (lat && lng) {
        this.updateMapPosition(lat, lng);
      }
    });
  }

  // 🗺️ เมื่อผู้ใช้คลิกเปลี่ยนตำแหน่งในแผนที่ → อัปเดตฟอร์ม
  onMapLocationChange(newLat: number, newLng: number) {
    console.log('📍 Map location changed:', newLat, newLng);
    
    // อัปเดตค่าในฟอร์มทันที
    this.dormForm.patchValue({
      latitude: newLat,
      longitude: newLng
    });

    // แสดง toast แจ้งว่าพิกัดอัปเดตแล้ว
    this.showToastNotification('อัปเดตตำแหน่งพิกัดเรียบร้อยแล้ว', 'success');
  }

  // 🗺️ อัปเดตตำแหน่งในแผนที่ (ใช้ MapTiler SDK)
  updateMapPosition(lat: number, lng: number) {
    // ตรวจสอบว่ามีแผนที่อยู่ในหน้านี้หรือไม่
    if (typeof window !== 'undefined' && (window as any).mapInstance) {
      const map = (window as any).mapInstance;
      
      // ล้าง marker เก่า
      if ((window as any).currentMarker) {
        map.removeMarker((window as any).currentMarker);
      }

      // เพิ่ม marker ใหม่ (ใช้ MapTiler SDK)
      const newMarker = new maptilersdk.Marker({ color: '#EF4444' })
        .setLngLat([lng, lat])
        .addTo(map);
      (window as any).currentMarker = newMarker;

      // ย้ายแผนที่ไปยังตำแหน่งใหม่
      map.setCenter([lng, lat]);
      map.setZoom(15);

      console.log('🗺️ Map updated to:', lat, lng);
    }
  }

  // Image Management - New Design (matching dorm-submit)
  openCamera() {
    this.cameraInput.nativeElement.click();
  }

  openGallery() {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onCameraCapture(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleImageFile(input.files[0]);
    }
  }

  onGallerySelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) {
      return;
    }

    const remainingSlots = this.getRemainingImageSlots();
    if (remainingSlots <= 0) {
      this.showToastNotification(`สามารถอัปโหลดรูปภาพได้สูงสุด ${this.maxImages} รูป`, 'error');
      return;
    }

    const files = Array.from(input.files).slice(0, remainingSlots);
    if (files.length < input.files.length) {
      this.showToastNotification(`เลือกรูปได้สูงสุดอีก ${remainingSlots} รูป`, 'info');
    }

    files.forEach((file) => this.handleImageFile(file));
  }

  handleImageFile(file: File) {
    if (this.isImageLimitReached()) {
      this.showToastNotification(`สามารถอัปโหลดรูปภาพได้สูงสุด ${this.maxImages} รูป`, 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.showToastNotification('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showToastNotification('ขนาดไฟล์ต้องไม่เกิน 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.images.push({
        file,
        preview: e.target?.result as string,
        isPrimary: this.images.length === 0,
        uploadStatus: 'pending'
      });
      // Auto upload to draft API
      this.uploadImageToDraft(file, this.images.length - 1);
    };
    reader.readAsDataURL(file);
  }

  async uploadImageToDraft(file: File, imageIndex: number) {
    this.isUploadingImages = true;
    
    // Set status to pending
    if (this.images[imageIndex]) {
      this.images[imageIndex].uploadStatus = 'pending';
    }
    
    try {
      console.log('📤 Uploading image to Supabase draft folder:', file.name);
      
      // อัปโหลดไปที่ Supabase draft folder โดยตรง
      const { url, error } = await this.supabaseService.uploadImage(file, 'dorm-drafts/');
      
      if (error) {
        console.error('❌ Supabase upload error:', error);
        throw new Error('Failed to upload image to Supabase');
      }
      
      console.log('✅ Image uploaded to Supabase:', url);
      
      // Update the image with the uploaded URL (draft URL)
      if (this.images[imageIndex]) {
        this.images[imageIndex].url = url;
        this.images[imageIndex].uploadStatus = 'success';
      }
      
    } catch (error) {
      console.error('❌ Error uploading image to draft:', error);
      if (this.images[imageIndex]) {
        this.images[imageIndex].uploadStatus = 'error';
      }
      this.showToastNotification('อัปโหลดรูปภาพไม่สำเร็จ', 'error');
    } finally {
      this.isUploadingImages = false;
    }
  }

  removeImage(index: number) {
    const wasPrimary = this.images[index].isPrimary;
    this.images.splice(index, 1);

    if (this.imageUrls.length > index) {
      this.imageUrls.splice(index, 1);
    }

    if (wasPrimary && this.images.length > 0) {
      this.images[0].isPrimary = true;
    }

    // Images are uploaded immediately in handleImageFile, no need for auto upload
  }

  setPrimaryImage(index: number) {
    this.images.forEach((img, i) => {
      img.isPrimary = i === index;
    });
  }

  async deleteExistingImage(image: DormImage) {
    if (!confirm('ยืนยันความต้องการที่จะลบรูปภาพนี้?')) return;

    try {
      await this.adminService
        .deleteDormitoryImage(this.dormIdNum, image.image_id)
        .toPromise();
      this.existingImages = this.existingImages.filter(
        (img) => img.image_id !== image.image_id
      );
      this.dormImages = this.dormImages.filter(
        (img) => img.image_id !== image.image_id
      );
      this.showToastNotification('ลบรูปภาพเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Error deleting image:', err);
      this.showToastNotification('ไม่สามารถลบรูปภาพได้', 'error');
    }
  }

  // Legacy methods for compatibility
  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: any) {
    this.onGallerySelect(event);
  }

  async deleteImage(image: DormImage) {
    this.deleteExistingImage(image);
  }

  // Map methods
  initMap() {
    console.log('🗺️ Initializing map...');
    
    // Clean up existing map
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.marker = null;
    }
    
    const lat = this.getNumericCoordinate('latitude');
    const lng = this.getNumericCoordinate('longitude');
    const centerLat = lat ?? this.defaultMapCenter[1];
    const centerLng = lng ?? this.defaultMapCenter[0];

    if (!this.mapContainer) {
      console.log('🗺️ Map initialization skipped - missing container');
      return;
    }

    // Wait a bit for DOM to be ready
    setTimeout(() => {
      try {
        if (!this.mapContainer.nativeElement) {
          console.log('🗺️ Map container not ready');
          return;
        }
        
        console.log('🗺️ Creating map with container:', this.mapContainer.nativeElement);
        
        maptilersdk.config.apiKey = environment.mapTilerApiKey;
        this.map = new maptilersdk.Map({
          container: this.mapContainer.nativeElement,
          style: maptilersdk.MapStyle.STREETS,
          center: [centerLng, centerLat],
          zoom: 15,
          geolocateControl: false,
        });

        this.marker = new maptilersdk.Marker({ draggable: true, color: '#EF4444' })
          .setLngLat([centerLng, centerLat])
          .addTo(this.map);

        this.marker.on('dragend', () => {
          const lngLat = this.marker!.getLngLat();
          this.dormForm.patchValue({ latitude: lngLat.lat, longitude: lngLat.lng });
          this.refreshRoadDistance(lngLat.lat, lngLat.lng);
        });

        this.map.on('click', (e) => {
          if (!this.marker) return;
          this.marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
          this.dormForm.patchValue({
            latitude: e.lngLat.lat,
            longitude: e.lngLat.lng,
          });
          this.refreshRoadDistance(e.lngLat.lat, e.lngLat.lng);
        });
        
        console.log('🗺️ Map initialized successfully');
      } catch (error) {
        console.error('🗺️ Map initialization error:', error);
      }
    }, 200);
  }

  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (this.map && this.marker) {
            this.map.setCenter([longitude, latitude]);
            this.marker.setLngLat([longitude, latitude]);
            this.dormForm.patchValue({ latitude, longitude });
            this.refreshRoadDistance(latitude, longitude);
          }
        },
        (err) => console.error('Geolocation error:', err),
      );
    }
  }

  private refreshRoadDistance(lat: number, lng: number) {
    const reqSeq = ++this.roadDistanceReqSeq;
    this.isLoadingRoadDistance = true;
    this.distanceService.getRoadDistancesFromDorm(lat, lng).subscribe({
      next: (res) => {
        if (reqSeq !== this.roadDistanceReqSeq) return;
        this.roadDistanceMsuKm = res.msuKm;
        this.roadDistanceFallback = res.fallback;
        this.roadNearbySummaryText = this.distanceService.buildNearbySummaryTextFromRoad(res.places, res.fallback);
      },
      error: () => {
        if (reqSeq !== this.roadDistanceReqSeq) return;
        this.roadDistanceMsuKm = this.distanceService.calculateDistance(lat, lng);
        this.roadDistanceFallback = true;
        this.roadNearbySummaryText = '';
      },
      complete: () => {
        if (reqSeq !== this.roadDistanceReqSeq) return;
        this.isLoadingRoadDistance = false;
      },
    });
  }

  toggleMapStyle() {
    if (!this.map) return;
    this.currentMapStyle =
      this.currentMapStyle === 'satellite' ? 'streets' : 'satellite';
    this.map.setStyle(
      this.currentMapStyle === 'satellite'
        ? maptilersdk.MapStyle.SATELLITE
        : maptilersdk.MapStyle.STREETS,
    );
  }

  private getNumericCoordinate(control: 'latitude' | 'longitude'): number | null {
    const value = this.dormForm.get(control)?.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  // Helper methods
  getSelectedAmenities(): string[] {
    const group = this.dormForm.get('amenities') as FormGroup;
    return Object.keys(group.controls).filter((key) => group.get(key)?.value);
  }

  showApprovalButtons(): boolean {
    // ไม่แสดง Modal การอนุมัติในหน้าแก้ไขหอพัก
    // ควรแสดงเฉพาะในหน้าตรวจสอบหอพักใหม่
    return false;
  }

  approveDormitory(): void {
    this.adminService.updateDormitoryApproval(this.dormIdNum, { status: 'approved' }).subscribe({
      next: () => {
        this.showToastNotification('อนุมัติหอพักเรียบร้อยแล้ว', 'success');
        this.dormForm.patchValue({ approval_status: 'approved' });
      },
      error: () => {
        this.showToastNotification('เกิดข้อผิดพลาดในการอนุมัติ', 'error');
      }
    });
  }

  rejectDormitory(): void {
    this.adminService.updateDormitoryApproval(this.dormIdNum, { status: 'rejected' }).subscribe({
      next: () => {
        this.showToastNotification('ไม่อนุมัติหอพัก', 'success');
        this.dormForm.patchValue({ approval_status: 'rejected' });
      },
      error: () => {
        this.showToastNotification('เกิดข้อผิดพลาดในการไม่อนุมัติ', 'error');
      }
    });
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getApprovalStatus(): string {
    const status = this.dormForm.get('approval_status')?.value;
    switch (status) {
      case 'approved':
        return 'อนุมัติแล้ว';
      case 'pending':
        return 'รออนุมัติ';
      case 'rejected':
        return 'ปฏิเสธ';
      default:
        return 'ไม่ทราบสถานะ';
    }
  }

  getApprovalBadgeClass(): string {
    const status = this.dormForm.get('approval_status')?.value;
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium';
      case 'rejected':
        return 'bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium';
      default:
        return 'bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium';
    }
  }

  getMinPrice(): number {
    const monthly = Number(this.dormForm.get('monthly_price')?.value) || 0;
    const term = Number(this.dormForm.get('term_price')?.value) || 0;
    const summer = Number(this.dormForm.get('summer_price')?.value) || 0;
    
    const prices = [monthly, term, summer].filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }

  getAccommodationType(): string {
    return this.dormForm.get('accommodation_type')?.value || 'หอพัก';
  }

  getZoneName(): string {
    const zoneId = this.dormForm.get('zone_id')?.value;
    const zone = this.zones.find(z => z.zone_id === Number(zoneId));
    return zone ? zone.zone_name : 'ไม่ระบุโซน';
  }

  getSelectedZoneGuide(): string | null {
    const zoneId = this.dormForm.get('zone_id')?.value;
    if (!zoneId) return null;

    const zone = this.zones.find((z) => String(z.zone_id) === String(zoneId));
    if (!zone?.zone_name) {
      return null;
    }

    const match = this.zoneGuideHints.find((hint) =>
      hint.keywords.some((keyword) => zone.zone_name.toLowerCase().includes(keyword)),
    );
    return match?.text || null;
  }

  shouldShowElectricityPriceInput(): boolean {
    const value = this.dormForm.get('electricity_price_type')?.value;
    if (!value) return false;
    return !['ตามอัตราการไฟฟ้า', 'สอบถามหอพัก'].includes(value);
  }

  shouldShowWaterPriceInput(): boolean {
    const value = this.dormForm.get('water_price_type')?.value;
    if (!value) return false;
    return !['ตามอัตราการประปา', 'สอบถามหอพัก'].includes(value);
  }

  getStepTitle(): string {
    switch (this.currentStep) {
      case 1:
        return 'ข้อมูลหอพัก';
      case 2:
        return 'ข้อมูลติดต่อ';
      case 3:
        return 'ประเภทห้องและราคา';
      case 4:
        return 'รูปภาพและข้อมูลเพิ่มเติม';
      default:
        return '';
    }
  }

  // Multi-step form properties
  isLoadingData = false;
  isLoadingLocation = false;
  isLoadingRoadDistance = false;
  roadDistanceMsuKm: number | null = null;
  roadDistanceFallback = false;
  roadNearbySummaryText: string = '';
  private roadDistanceReqSeq = 0;

  // Multi-step methods
  nextStep() {
    if (this.currentStep < this.totalSteps && this.isStepValid(this.currentStep)) {
      this.currentStep++;
      // Reinitialize map when going to step 4 (where map is located)
      if (this.currentStep === 4) {
        setTimeout(() => this.initMap(), 200);
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      // Reinitialize map when going back to step 4
      if (this.currentStep === 4) {
        setTimeout(() => this.initMap(), 200);
      }
    }
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return !!(this.dormForm.get('accommodation_type')?.valid &&
               this.dormForm.get('dorm_name')?.valid &&
               this.dormForm.get('address')?.valid &&
               this.dormForm.get('zone_id')?.valid);
      case 2:
        return true; // Contact info is optional
      case 3:
        return !!(this.dormForm.get('room_type')?.valid &&
               (this.dormForm.get('monthly_price')?.value ||
                this.dormForm.get('term_price')?.value ||
                this.dormForm.get('summer_price')?.value));
      case 4:
        return !!(this.getSelectedAmenities().length >= 5 &&
               this.dormForm.get('latitude')?.value &&
               this.dormForm.get('longitude')?.value);
      default:
        return false;
    }
  }

  validateCurrentStep(): boolean {
    return this.isStepValid(this.currentStep);
  }

  showToastNotification(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
  ) {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.showToast = false), 3000);
  }

  onSubmit() {
    if (this.dormForm.invalid) {
      this.showToastNotification(
        'กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึก',
        'error',
      );
      return;
    }

    this.isSubmitting = true;
    const rawForm = this.dormForm.getRawValue();

    // ตาม Flow ใหม่: แยกการบันทึกข้อมูลทั่วไป และการจัดการรูปภาพ
    this.saveDormitoryData(rawForm);
  }

  async saveDormitoryData(rawForm: any) {
    try {
      // 1. บันทึกข้อมูลทั่วไป (ไม่รวมรูปภาพ)
      const payload = {
        ...rawForm,
        manager_name: rawForm.contact_name,
        primary_phone: rawForm.contact_phone,
        electricity_type: rawForm.electricity_type,
        electricity_price: rawForm.electricity_price,
        water_type: rawForm.water_type || rawForm.water_price_type,
        water_price: rawForm.water_price,
        amenities: this.getSelectedAmenities(),
        description: rawForm.description,
      };

      // Auto change status: rejected → pending
      const currentStatus = this.dormForm.get('approval_status')?.value;
      if (currentStatus === 'rejected') {
        payload.approval_status = 'pending';
      }

      // PUT /api/admin/dormitories/:dormId
      this.adminService.updateDormitory(this.dormIdNum, payload).subscribe({
        next: (response) => {
          console.log('✅ Update response:', response);
          
          if (currentStatus === 'rejected') {
            this.dormForm.patchValue({ approval_status: 'pending' });
            this.showToastNotification('บันทึกสำเร็จ สถานะเปลี่ยนเป็นรอการอนุมัติ', 'success');
          } else {
            this.showToastNotification('ปรับปรุงข้อมูลเรียบร้อยแล้ว', 'success');
          }

          // 2. จัดการรูปภาพ (แยกตาม Flow)
          this.manageImagesAfterSave();
        },
        error: (err) => {
          console.error('❌ Update failed:', err);
          this.showToastNotification('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
          this.isSubmitting = false;
        },
      });

    } catch (error) {
      console.error('❌ Save error:', error);
      this.showToastNotification('เกิดข้อผิดพลาดในการบันทึก', 'error');
      this.isSubmitting = false;
    }
  }

  async manageImagesAfterSave() {
    try {
      // 3. เพิ่มรูปภาพใหม่ (จาก draft)
      for (const newImage of this.images) {
        if (newImage.url && !newImage.url.includes('existing')) {
          // POST /api/admin/dormitories/:dormId/images
          await this.adminService.addDormitoryImage(this.dormIdNum, {
            image_url: newImage.url, // draft URL
            is_primary: newImage.isPrimary || false
          }).toPromise();
          
          console.log('✅ Added new image:', newImage.url);
        }
      }

      this.isSubmitting = false;
      console.log('🎉 All images processed successfully');
      
      // แสดง success modal หลังจัดการรูปภาพเรียบร้อย
      this.showSuccessSimple();
      
    } catch (error) {
      console.error('❌ Error managing images:', error);
      this.showToastNotification('เกิดข้อผิดพลาดในการจัดการรูปภาพ', 'error');
      this.isSubmitting = false;
    }
  }

  // Additional helper methods for template
  getAccommodationNameLabel(): string {
    return this.dormForm.get('accommodation_type')?.value === 'หอ'
      ? 'หอพัก'
      : 'อพาร์ตเมนต์';
  }

  // แสดง success modal แบบเรียบง่าย
  private showSuccessSimple(): void {
    this.showSuccessModal = true;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    // กลับไปหน้ารายการหอพักที่รออนุมัติหลังแก้ไขเสร็จ
    this.router.navigate(['/admin/dormitories/pending']);
  }

  getAccommodationAddressLabel(): string {
    return this.isHouse() ? 'ที่อยู่บ้าน' : 'ที่อยู่หอพัก';
  }

  getRoomTypeLabel(): string {
    return this.isHouse() ? 'ประเภทบ้าน' : 'ประเภทห้อง';
  }

  getDepositLabel(): string {
    return this.isHouse() ? 'ค่ามัดจำ' : 'เงินประกัน';
  }

  // Input validation methods
  allowNumbersOnly(event: KeyboardEvent) {
    const navigationKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
    ];

    if (navigationKeys.includes(event.key)) {
      return;
    }

    if (/^[0-9\s\-]$/.test(event.key)) {
      return;
    }

    event.preventDefault();
  }

  onPhonePaste(event: ClipboardEvent) {
    event.preventDefault();
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    const pastedText = clipboardData?.getData('text') || '';
    const numericOnly = pastedText.replace(/\D/g, '');

    if (!numericOnly) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const currentValue = input.value;
    const newValue = (
      currentValue.substring(0, start) +
      numericOnly +
      currentValue.substring(end)
    ).substring(0, 10);

    input.value = newValue;
    this.dormForm.get('contact_phone')?.setValue(newValue, { emitEvent: false });
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (value.length > 10) {
      value = value.substring(0, 10);
    }

    input.value = value;
    this.dormForm.get('contact_phone')?.setValue(value, { emitEvent: false });
  }

  // Getters for template
  get amenities() {
    return this.amenitiesList;
  }

  isHouse(): boolean {
    return this.dormForm?.get('accommodation_type')?.value === 'บ้าน';
  }

  getRoomTypes(): string[] {
    return [
      'ห้องพัดลม',
      'ห้องแอร์',
      'ห้องสตูดิโอ',
      'อื่นๆ',
    ];
  }

  getElectricityPriceTypes(): string[] {
    return ['ตามอัตราการไฟฟ้า', 'ราคาหน่วยละ (บาท/หน่วย)', 'สอบถามหอพัก'];
  }

  getWaterPriceTypes(): string[] {
    return ['ตามอัตราการประปา', 'ราคาหน่วยละ (บาท/หน่วย)', 'เหมาจ่าย (บาท/เดือน)'];
  }

  getWaterPriceOptions(): string[] {
    return ['ตามอัตราการประปา', 'ราคาหน่วยละ (บาท/หน่วย)', 'เหมาจ่าย (บาท/เดือน)', 'สอบถามหอพัก'];
  }

  // URL Image Management Methods
  isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async addImageUrl(): Promise<void> {
    if (!this.imageUrlInput.trim()) {
      this.showToastNotification('กรุณาใส่ URL รูปภาพ', 'error');
      return;
    }

    if (this.isImageLimitReached()) {
      this.showToastNotification(`สามารถเพิ่มรูปได้สูงสุด ${this.maxImages} รูป`, 'error');
      return;
    }

    if (!this.isValidImageUrl(this.imageUrlInput.trim())) {
      this.showToastNotification('URL ไม่ถูกต้อง', 'error');
      return;
    }

    const url = this.imageUrlInput.trim();
    this.isAddingUrl = true;

    // สร้าง image item ใหม่
    const imageItem: ImageItem = {
      type: 'url',
      url: url,
      preview: '', // จะโหลดทีหลัง
      isPrimary: this.imageItems.length === 0,
      uploadStatus: 'pending'
    };

    this.imageItems.push(imageItem);
    this.imageUrlInput = ''; // เคลียร์ input

    try {
      // ลองโหลด preview
      const preview = await this.loadImagePreview(url);
      imageItem.preview = preview;
      imageItem.uploadStatus = 'success';
      this.showToastNotification('เพิ่มรูปจาก URL สำเร็จ', 'success');
    } catch (error) {
      // URL ใช้ไม่ได้ ใช้ placeholder
      imageItem.preview = this.getNoImagePlaceholder();
      imageItem.uploadStatus = 'error';
      this.showToastNotification('ไม่สามารถโหลดรูปจาก URL นี้ได้ ใช้รูป placeholder แทน', 'info');
    } finally {
      this.isAddingUrl = false;
    }
  }

  async loadImagePreview(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  getNoImagePlaceholder(): string {
    return 'src/assets/images/no image.png';
  }

  removeImageItem(index: number): void {
    const wasPrimary = this.imageItems[index].isPrimary;
    this.imageItems.splice(index, 1);

    // ถ้าลบรูปหลัก ให้รูปแรกเป็นรูปหลักแทน
    if (wasPrimary && this.imageItems.length > 0) {
      this.imageItems[0].isPrimary = true;
    }
  }

  setPrimaryImageItem(index: number): void {
    this.imageItems.forEach((img, i) => {
      img.isPrimary = i === index;
    });
  }

  getTotalImages(): number {
    return this.imageItems.length;
  }

  getValidImageUrls(): string[] {
    return this.imageItems
      .filter(item => item.uploadStatus === 'success' || item.uploadStatus === 'error')
      .map(item => item.url || '');
  }
}
