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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { SupabaseService } from '../../../services/supabase.service';
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

@Component({
  selector: 'app-admin-edit-dorm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  dormForm!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  isUploadingImages = false;

  // Image management
  images: ImageFile[] = [];
  imageUrls: string[] = [];
  existingImages: DormImage[] = [];
  maxImages = 20;

  // Legacy for compatibility
  dormImages: DormImage[] = [];

  zones: Zone[] = [];
  amenitiesList: string[] = [];

  // Map properties
  map: maptilersdk.Map | null = null;
  marker: maptilersdk.Marker | null = null;
  currentMapStyle: 'satellite' | 'streets' = 'satellite';

  // Toast notification
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private adminService: AdminService,
    private supabaseService: SupabaseService,
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
      dorm_description: [''],
      description: [''], // Add description field to fix the error

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
        if (val === 'ตามอัตราการไฟฟ้า') {
          ctrl?.disable();
          ctrl?.setValue(null);
        } else {
          ctrl?.enable();
        }
      });

    this.dormForm.get('water_price_type')?.valueChanges.subscribe((val) => {
      const ctrl = this.dormForm.get('water_price');
      if (val === 'ตามอัตราการประปา') {
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
      const [zones, amenities] = await Promise.all([
        this.adminService.getZones().toPromise(),
        this.adminService.getAmenities().toPromise(),
      ]);

      this.zones = zones || [];

      // UX Sorting: Interior first, then Exterior (Matching Submission Form)
      const interiorKeywords = [
        'แอร์',
        'ปรับอากาศ',
        'ตู้เย็น',
        'ทีวี',
        'โถ',
        'น้ำอุ่น',
        'เตียง',
        'ตู้เสื้อผ้า',
        'โต๊ะ',
        'พัดลม',
        'WIFI',
        'เน็ต',
        'ระเบียง',
        'ห้องน้ำ',
      ];

      this.amenitiesList = (amenities || []).sort((a, b) => {
        const isAInterior = interiorKeywords.some((key) => a.includes(key));
        const isBInterior = interiorKeywords.some((key) => b.includes(key));
        if (isAInterior && !isBInterior) return -1;
        if (!isAInterior && isBInterior) return 1;
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
      this.dormImages = data.images || [];
      this.existingImages = data.images || [];

      this.dormForm.patchValue({
        accommodation_type: dorm.accommodation_type || 'หอ',
        dorm_name: dorm.dorm_name,
        address: dorm.address,
        zone_id: dorm.zone_id || 1,
        dorm_description: dorm.dorm_description || dorm.description,
        latitude: dorm.latitude || 16.244, // Default MSU coordinates
        longitude: dorm.longitude || 103.251, // Default MSU coordinates
        room_type: dorm.room_type || '',
        room_type_other: dorm.room_type_other,
        monthly_price: dorm.min_price || dorm.monthly_price,
        daily_price: dorm.term_price || dorm.daily_price,
        summer_price: dorm.summer_price,
        deposit: dorm.deposit,
        electricity_price_type: dorm.electricity_type || 'ราคาหน่วยละ (บาท/หน่วย)',
        electricity_price: dorm.electricity_rate || dorm.electricity_price,
        water_price_type: dorm.water_type || 'ราคาหน่วยละ (บาท/หน่วย)',
        water_price: dorm.water_rate || dorm.water_price,
        approval_status: dorm.approval_status,
        contact_name: dorm.manager_name || dorm.owner_name,
        contact_phone: dorm.primary_phone || dorm.owner_phone,
        contact_email: dorm.contact_email || dorm.owner_email,
        line_id: dorm.line_id || dorm.owner_line_id,
        term_price: dorm.term_price,
        description: dorm.dorm_description || dorm.description || '',
      });

      // Patch amenities checkboxes
      if (data.amenities) {
        const patchObj: any = {};
        // Flatten amenities from categories
        const allAmenities = [
          ...(data.amenities['ภายใน'] || []),
          ...(data.amenities['ภายนอก'] || []),
          ...(data.amenities.common || []),
        ];

        allAmenities.forEach((a: any) => {
          if (amenitiesGroup.contains(a.amenity_name)) {
            patchObj[a.amenity_name] = a.is_available;
          }
        });
        amenitiesGroup.patchValue(patchObj);
      }

      this.isLoading = false;
      
      console.log('🏠 Form data after patching:', this.dormForm.value);
      console.log('🏠 Available room types:', this.getRoomTypes());
      console.log('🏠 Existing images:', this.existingImages);
      
      setTimeout(() => this.initMap(), 100);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      this.showToastNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
      this.isLoading = false;
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
    if (input.files) {
      Array.from(input.files).forEach(file => {
        this.handleImageFile(file);
      });
    }
  }

  handleImageFile(file: File) {
    if (this.images.length >= this.maxImages) {
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
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('http://localhost:3000/api/submissions/upload-draft-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image to draft');
      }
      
      const result = await response.json();
      
      // Update the image with the uploaded URL
      if (this.images[imageIndex]) {
        this.images[imageIndex].url = result.url;
        this.images[imageIndex].uploadStatus = 'success';
      }
      
      console.log('✅ Image uploaded to draft:', result.url);
      
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
    }
    
    const { latitude, longitude } = this.dormForm.getRawValue();
    console.log('🗺️ Map coordinates:', { latitude, longitude });
    
    if (!latitude || !longitude || !this.mapContainer) {
      console.log('🗺️ Map initialization skipped - missing data:', {
        latitude: !!latitude,
        longitude: !!longitude,
        mapContainer: !!this.mapContainer
      });
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
          center: [longitude, latitude],
          zoom: 15,
          geolocateControl: false,
        });

        this.marker = new maptilersdk.Marker({ draggable: true, color: '#4F46E5' })
          .setLngLat([longitude, latitude])
          .addTo(this.map);

        this.marker.on('dragend', () => {
          const lngLat = this.marker!.getLngLat();
          this.dormForm.patchValue({ latitude: lngLat.lat, longitude: lngLat.lng });
        });

        this.map.on('click', (e) => {
          this.marker!.setLngLat([e.lngLat.lng, e.lngLat.lat]);
          this.dormForm.patchValue({
            latitude: e.lngLat.lat,
            longitude: e.lngLat.lng,
          });
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
          }
        },
        (err) => console.error('Geolocation error:', err),
      );
    }
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

  // Helper methods
  getSelectedAmenities(): string[] {
    const group = this.dormForm.get('amenities') as FormGroup;
    return Object.keys(group.controls).filter((key) => group.get(key)?.value);
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
  currentStep = 1;
  totalSteps = 4;
  isLoadingData = false;
  isLoadingLocation = false;
  minImages = 3;

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
        return !!(this.images.length >= this.minImages &&
               this.getSelectedAmenities().length >= 5 &&
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

    // Collect all image URLs (existing + newly uploaded)
    const allImageUrls: string[] = [];
    
    // Add existing images
    this.existingImages.forEach(img => {
      allImageUrls.push(img.image_url);
    });
    
    // Add newly uploaded images
    this.images.forEach(img => {
      if (img.url) {
        allImageUrls.push(img.url);
      }
    });

    const payload = {
      ...rawForm,
      // Map form fields to backend names if necessary
      manager_name: rawForm.contact_name,
      primary_phone: rawForm.contact_phone,
      electricity_type: rawForm.electricity_price_type,
      electricity_rate: rawForm.electricity_price,
      water_type: rawForm.water_price_type,
      water_rate: rawForm.water_price,
      amenities: this.getSelectedAmenities(),
      // Send images array with URLs for new backend API
      images: allImageUrls,
    };

    console.log('📤 Submitting payload with images:', payload);

    this.adminService.updateDormitory(this.dormIdNum, payload).subscribe({
      next: () => {
        this.showToastNotification('ปรับปรุงข้อมูลเรียบร้อยแล้ว', 'success');
        this.isSubmitting = false;
        // Emit success event for inline editing
        this.editSuccess.emit();
      },
      error: (err) => {
        console.error('Update error:', err);
        this.showToastNotification('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        this.isSubmitting = false;
      },
    });
  }

  // Additional helper methods for template
  getAccommodationNameLabel(): string {
    return this.isHouse() ? 'ชื่อบ้าน' : 'ชื่อหอพัก';
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
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
    }
  }

  onPhonePaste(event: ClipboardEvent) {
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    const pastedText = clipboardData.getData('text');
    if (!/^\d+$/.test(pastedText)) {
      event.preventDefault();
    }
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    
    // ลบอักขระที่ไม่ใช่ตัวเลขและเครื่องหมายที่อนุญาต
    value = value.replace(/[^\d\s\-]/g, '');
    
    // จำกัดความยาว
    if (value.length > 15) {
      value = value.substring(0, 15);
    }
    
    // อัปเดตค่าใน form
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
    return ['ตามอัตราการไฟฟ้า', 'ราคาหน่วยละ (บาท/หน่วย)'];
  }

  getWaterPriceTypes(): string[] {
    return [
      'ตามอัตราการประปา',
      'ราคาหน่วยละ (บาท/หน่วย)',
      'เหมาจ่าย (บาท/เดือน)',
    ];
  }
}
