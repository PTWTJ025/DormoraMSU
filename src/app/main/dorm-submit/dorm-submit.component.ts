import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../../services/supabase.service';
import { GsapAnimationService } from '../../services/gsap-animation.service';
import { DistanceService } from '../../services/distance.service';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

interface ImageItem {
  type: 'file' | 'url';
  file?: File;
  url?: string;
  preview: string;
  isPrimary: boolean;
  uploadStatus?: 'pending' | 'success' | 'error' | 'validated';
  supabaseUrl?: string;
}

interface Zone {
  zone_id: number;
  zone_name: string;
}

@Component({
  selector: 'app-dorm-submit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './dorm-submit.component.html',
  styleUrls: ['./dorm-submit.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DormSubmitComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('popupMapContainer') popupMapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('progressBar') progressBar!: ElementRef<HTMLDivElement>;
  @ViewChild('step1') step1!: ElementRef<HTMLDivElement>;
  @ViewChild('step2') step2!: ElementRef<HTMLDivElement>;
  @ViewChild('step3') step3!: ElementRef<HTMLDivElement>;
  @ViewChild('step4') step4!: ElementRef<HTMLDivElement>;
  @ViewChild('imageGrid') imageGrid!: ElementRef<HTMLDivElement>;
  @ViewChild('amenitiesGrid') amenitiesGrid!: ElementRef<HTMLDivElement>;
  @ViewChild('successModal') successModal!: ElementRef<HTMLDivElement>;
  @ViewChild('successModalContent')
  successModalContent!: ElementRef<HTMLDivElement>;

  dormForm!: FormGroup;
  currentStep = 1;
  totalSteps = 4;
  isSubmitting = false;
  imageItems: ImageItem[] = []; // เก็บทั้งไฟล์และ URL
  maxImages = 20;
  minImages = 3;
  imageUrlInput: string = ''; // สำหรับ input ลิงก์
  isAddingUrl: boolean = false; // สถานะการเพิ่ม URL
  showSuccessModal = false; // สำหรับแสดง success popup
  showDetailsModal = false;
  isUploadingImages = false; // สถานะการอัปโหลดรูป
  isSubmittingFullPage = false; // Full-page loading overlay status
  // Data from API
  zones: Zone[] = [];
  amenities: string[] = [];
  lastCalculatedDistance: number | null = null; // เก็บค่าระยะทางล่าสุด
  isLoadingData = false;
  isLoadingRoadDistance = false;
  roadDistanceFallback = false;
  roadNearbySummaryText: string = '';
  private roadDistanceReqSeq = 0;
  private currentUploadPromise: Promise<void> | null = null;

  // Map loading state
  isLoadingLocation = false;

  // Room types
  roomTypes = ['ห้องแอร์', 'ห้องคู่', 'ห้องพัดลม', 'อื่นๆ'];

  // Map properties
  map: maptilersdk.Map | null = null;
  marker: maptilersdk.Marker | null = null;
  currentMapStyle: 'satellite' | 'streets' = 'satellite';
  
  // Popup map properties
  popupMap: maptilersdk.Map | null = null;
  popupMarker: maptilersdk.Marker | null = null;
  popupMapStyle: 'satellite' | 'streets' = 'satellite';

  private backendUrl = environment.backendApiUrl;
maptilersdk: any;

  // Make encodeURIComponent available in template
  encodeURIComponent = encodeURIComponent;

  constructor(
    private fb: FormBuilder,
    public router: Router,
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private gsapService: GsapAnimationService,
    private distanceService: DistanceService,
  ) {
    this.maptilersdk = maptilersdk;
  }

  ngOnInit() {
    this.initForm();
    this.loadZones();
    this.loadAmenities();
  }

  ngAfterViewInit(): void {
    // Initialize map if starting on step 4 (rare case)
    if (this.currentStep === 4) {
      setTimeout(() => this.initMap(), 100);
    }
  }

  initForm() {
    this.dormForm = this.fb.group(
      {
        // ข้อมูลหอพัก
        accommodation_type: ['หอ', Validators.required], // เพิ่มประเภทที่พัก (หอ/บ้าน)
        dorm_name: ['', [Validators.required, Validators.minLength(3)]],
        address: ['', [Validators.required, Validators.minLength(10)]],
        zone_id: ['', Validators.required], // เปลี่ยนจาก zone_name เป็น zone_id
        description: [''], // คำอธิบาย/กฎระเบียบ (ไม่บังคับ)

        // ข้อมูลติดต่อ (ไม่บังคับทั้งหมด)
        contact_name: [''],
        contact_phone: [
          '',
          [Validators.pattern(/^[0-9]{3}-?[0-9]{3}-?[0-9]{4}$|^[0-9]{10}$/)],
        ], // รองรับ 090-962-8055 หรือ 0909628055
        contact_email: ['', [Validators.email]],
        line_id: [''],

        // ประเภทห้อง (dropdown + อื่นๆ)
        room_type: ['', Validators.required],
        room_type_other: [''], // ถ้าเลือก "อื่นๆ"

        // ราคา (ต้องเลือกอย่างน้อย 1)
        monthly_price: ['', [Validators.min(1000), Validators.max(100000), Validators.pattern('^[0-9]*$')]],
        term_price: ['', [Validators.min(1000), Validators.max(100000), Validators.pattern('^[0-9]*$')]], // เปลี่ยนจาก daily_price เป็น term_price
        summer_price: ['', [Validators.pattern('^[0-9]*$')]], // ราคาซัมเมอร์ (ไม่บังคับ)
        deposit: ['', [Validators.pattern('^[0-9]*$')]], // ค่าประกันห้อง (ไม่บังคับ)

        // ค่าน้ำค่าไฟ (บังคับกรอก)
        electricity_price_type: ['', Validators.required], // เพิ่มประเภทค่าไฟ
        electricity_price: [{ value: '', disabled: true }, [Validators.pattern('^[0-9]*.?[0-9]*$')]], // ค่าไฟ บาท/หน่วย - ไม่บังคับถ้า disabled
        water_price_type: ['', Validators.required], // ประเภทค่าน้ำ - บังคับ
        water_price: [{ value: '', disabled: true }, [Validators.pattern('^[0-9]*.?[0-9]*$')]], // ค่าน้ำ - ไม่บังคับถ้า disabled

        // สิ่งอำนวยความสะดวก (จะสร้างแบบ dynamic จาก API)
        amenities: this.fb.group({}),

        // พิกัด (Map picker)
        latitude: [null, Validators.required],
        longitude: [null, Validators.required],
      },
      { validators: this.atLeastOnePriceValidator },
    );

    // ฟังการเปลี่ยนแปลงของ water_price_type
    this.dormForm.get('water_price_type')?.valueChanges.subscribe((value) => {
      const waterPriceControl = this.dormForm.get('water_price');
      if (value === 'ตามอัตราการประปา') {
        waterPriceControl?.setValue(null);
        waterPriceControl?.disable();
      } else if (value) {
        waterPriceControl?.enable();
        waterPriceControl?.setValue(null);
      } else {
        waterPriceControl?.disable();
        waterPriceControl?.setValue(null);
      }
    });

    // ฟังการเปลี่ยนแปลงของ electricity_price_type
    this.dormForm
      .get('electricity_price_type')
      ?.valueChanges.subscribe((value) => {
        const electricityPriceControl = this.dormForm.get('electricity_price');
        if (value === 'ตามอัตราการไฟฟ้า') {
          electricityPriceControl?.setValue(null);
          electricityPriceControl?.disable();
        } else if (value) {
          electricityPriceControl?.enable();
          electricityPriceControl?.setValue(null);
        } else {
          electricityPriceControl?.disable();
          electricityPriceControl?.setValue(null);
        }
      });
  }

  // Custom validator: ต้องมีราคาอย่างน้อย 1 ตัว (ตรวจเฉพาะตอนอยู่ step 3)
  atLeastOnePriceValidator = (
    group: FormGroup,
  ): { [key: string]: boolean } | null => {
    // ตรวจสอบว่าอยู่ใน step 3 หรือไม่ (จาก component property)
    // ถ้าไม่ใช่ step 3 ให้ผ่านเสมอ
    if (!this.currentStep || this.currentStep !== 3) {
      return null;
    }

    const monthly = group.get('monthly_price')?.value;
    const term = group.get('term_price')?.value; // เปลี่ยนจาก daily เป็น term

    // ต้องมีราคาอย่างน้อย 1 ตัวที่ไม่ใช่ค่าว่าง
    const hasMonthlyPrice = monthly && monthly.toString().trim() !== '';
    const hasTermPrice = term && term.toString().trim() !== '';

    if (!hasMonthlyPrice && !hasTermPrice) {
      return { atLeastOnePrice: true };
    }
    return null;
  };

  loadZones() {
    this.isLoadingData = true;
    this.http.get<Zone[]>(`${this.backendUrl}/zones`).subscribe({
      next: (zones) => {
        this.zones = zones;
        this.isLoadingData = false;
      },
      error: (error) => {
        console.error('Error loading zones:', error);
        this.isLoadingData = false;
      },
    });
  }

  loadAmenities() {
    this.http
      .get<string[]>(`${this.backendUrl}/dormitories/amenities`)
      .subscribe({
        next: (amenities) => {
          // เรียงตามความนิยม/ความสำคัญที่คนหาหอพักพิจารณาก่อน
          const popularityOrder = [
            'แอร์',
            'WIFI',
            'เครื่องทำน้ำอุ่น',
            'ตู้เย็น',
            'พัดลม',
            'เตียงนอน',
            'ตู้เสื้อผ้า',
            'โต๊ะทำงาน',
            'กล้องวงจรปิด',
            'คีย์การ์ด',
            'ที่จอดรถ',
            'เครื่องซักผ้าหยอดเหรียญ',
            'ตู้กดน้ำหยอดเหรียญ',
            'ซิงค์ล้างจาน',
            'โต๊ะเครื่องแป้ง',
            'ไมโครเวฟ',
            'ลิฟต์',
            'ฟิตเนส',
            'สระว่ายน้ำ',
            'TV',
            'Lobby',
            'ที่วางพัสดุ',
            'รปภ',
            'อนุญาตให้เลี้ยงสัตว์',
          ];

          this.amenities = [...amenities].sort((a, b) => {
            const indexA = popularityOrder.findIndex((key) => a.includes(key));
            const indexB = popularityOrder.findIndex((key) => b.includes(key));
            const orderA = indexA === -1 ? 999 : indexA;
            const orderB = indexB === -1 ? 999 : indexB;

            if (orderA !== orderB) return orderA - orderB;
            return a.localeCompare(b, 'th');
          });

          // สร้าง form controls สำหรับแต่ละ amenity
          const amenitiesGroup = this.dormForm.get('amenities') as FormGroup;
          this.amenities.forEach((amenity) => {
            amenitiesGroup.addControl(amenity, this.fb.control(false));
          });
        },
        error: (error) => {
          console.error('Error loading amenities:', error);
        },
      });
  }

  // การจัดการรูปภาพ
  async uploadImagesToSupabase(): Promise<void> {
    if (this.currentUploadPromise) {
      return this.currentUploadPromise;
    }

    const itemsToUpload = this.getFileItemsNeedingUpload();
    if (itemsToUpload.length === 0) {
      return;
    }

    this.currentUploadPromise = this.performSupabaseUpload(itemsToUpload);

    try {
      await this.currentUploadPromise;
    } finally {
      this.currentUploadPromise = null;

      const hasQueuedFiles = this.imageItems.some(
        (item) =>
          item.type === 'file' &&
          item.file &&
          item.uploadStatus === 'pending',
      );

      if (hasQueuedFiles) {
        await this.uploadImagesToSupabase();
      }
    }
  }

  private async performSupabaseUpload(items: ImageItem[]): Promise<void> {
    this.isUploadingImages = true;

    try {
      for (const item of items) {
        item.uploadStatus = 'pending';
        const { url, error } = await this.supabaseService.uploadImage(
          item.file!,
          'dorm-drafts/',
        );

        if (url) {
          item.supabaseUrl = url;
          item.uploadStatus = 'success';
        } else {
          console.error('Failed to upload image to Supabase:', error);
          item.uploadStatus = 'error';
        }
      }

      const failedCount = items.filter(
        (item) => item.uploadStatus === 'error',
      ).length;

      if (failedCount > 0) {
        this.showToast(`อัปโหลดรูปไม่สำเร็จ ${failedCount} รูป`, 'error');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      items.forEach((item) => {
        if (item.uploadStatus !== 'success') {
          item.uploadStatus = 'error';
        }
      });
      this.showToast('อัปโหลดรูปไม่สำเร็จ', 'error');
    } finally {
      this.isUploadingImages = false;
    }
  }

  // อัปโหลดรูปทันทีที่เพิ่มรูป (auto-upload)
  async autoUploadImages() {
    const needsUpload = this.getFileItemsNeedingUpload();
    if (needsUpload.length === 0) {
      return;
    }

    await this.uploadImagesToSupabase();
  }

  openCamera() {
    this.cameraInput.nativeElement.click();
  }

  openGallery() {
    this.fileInput.nativeElement.click();
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
      const files = Array.from(input.files);
      const availableSlots = this.maxImages - this.imageItems.length;

      if (availableSlots <= 0) {
        this.showToast(
          `สามารถอัปโหลดรูปภาพได้สูงสุด ${this.maxImages} รูป`,
          'error',
        );
        input.value = '';
        return;
      }

      if (files.length > availableSlots) {
        this.showToast(
          `คุณสามารถเลือกเพิ่มได้อีกเพียง ${availableSlots} รูป (สูงสุด ${this.maxImages} รูป)`,
          'error',
        );
      }

      files.slice(0, availableSlots).forEach((file) => {
        this.handleImageFile(file);
      });
    }

    // reset value so selecting same files again will trigger change
    input.value = '';
  }

  handleImageFile(file: File) {
    if (this.imageItems.length >= this.maxImages) {
      this.showToast(
        `สามารถอัปโหลดรูปภาพได้สูงสุด ${this.maxImages} รูป`,
        'error',
      );
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      this.showToast('ขนาดไฟล์ต้องไม่เกิน 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newIndex = this.imageItems.length;
      this.imageItems.push({
        type: 'file',
        file,
        preview: e.target?.result as string,
        isPrimary: this.imageItems.length === 0,
        uploadStatus: 'pending',
        supabaseUrl: undefined,
      });

      // Animate the new image
      setTimeout(() => this.animateImageAdd(newIndex), 50);

      // อัปโหลดรูปทันทีที่เพิ่ม
      this.autoUploadImages();
    };
    reader.readAsDataURL(file);
  }

  // การนำทาง
  async nextStep() {
    // Mark fields as touched to show validation errors
    this.markStepFieldsAsTouched();

    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        const previousStep = this.currentStep;
        this.currentStep++;

        // Animate step transition
        await this.animateStepTransition(
          previousStep,
          this.currentStep,
          'next',
        );

        // Initialize map when entering step 4
        if (this.currentStep === 4) {
          setTimeout(() => this.initMap(), 100);
          // Animate images and amenities after a short delay
          setTimeout(() => {
            this.animateImagesStagger();
          }, 300);
        }
      }
    }
  }

  async prevStep() {
    if (this.currentStep > 1) {
      const previousStep = this.currentStep;
      this.currentStep--;

      // Animate step transition
      await this.animateStepTransition(previousStep, this.currentStep, 'prev');
    }
  }

  // GSAP Animation Methods
  private async animateStepTransition(
    fromStep: number,
    toStep: number,
    direction: 'next' | 'prev',
  ): Promise<void> {
    const fromElement = this.getStepElement(fromStep);
    const toElement = this.getStepElement(toStep);

    if (fromElement && toElement) {
      await this.gsapService.animateStepTransition(
        fromElement,
        toElement,
        direction,
      );
    }

    // Animate progress bar
    if (this.progressBar) {
      const fromPercent = ((fromStep - 1) / this.totalSteps) * 100;
      const toPercent = (toStep / this.totalSteps) * 100;
      this.gsapService.animateProgressBar(
        this.progressBar.nativeElement,
        fromPercent,
        toPercent,
      );
    }
  }

  private getStepElement(step: number): HTMLElement | null {
    switch (step) {
      case 1:
        return this.step1?.nativeElement || null;
      case 2:
        return this.step2?.nativeElement || null;
      case 3:
        return this.step3?.nativeElement || null;
      case 4:
        return this.step4?.nativeElement || null;
      default:
        return null;
    }
  }

  // Animate images with stagger effect
  animateImagesStagger(): void {
    if (this.imageGrid) {
      const imageItems =
        this.imageGrid.nativeElement.querySelectorAll('.image-item');
      if (imageItems.length > 0) {
        this.gsapService.animateImagesStagger(
          Array.from(imageItems) as HTMLElement[],
        );
      }
    }
  }

  // Animate new image addition
  animateImageAdd(index: number): void {
    if (this.imageGrid) {
      const imageItems =
        this.imageGrid.nativeElement.querySelectorAll('.image-item');
      const newItem = imageItems[index] as HTMLElement;
      if (newItem) {
        this.gsapService.animateImageAdd(newItem);
      }
    }
  }

  // Animate amenities with stagger effect
  animateAmenitiesStagger(): void {
    if (this.amenitiesGrid) {
      const amenityItems =
        this.amenitiesGrid.nativeElement.querySelectorAll('.amenity-item');
      if (amenityItems.length > 0) {
        this.gsapService.animateImagesStagger(
          Array.from(amenityItems) as HTMLElement[],
        );
      }
    }
  }

  // แสดง success modal แบบเรียบง่าย
  private showSuccessSimple(): void {
    this.showSuccessModal = true;
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        // Step 1: กรอกทุกอย่าง (บังคับทั้งหมด)
        return !!(
          this.dormForm.get('accommodation_type')?.valid &&
          this.dormForm.get('dorm_name')?.valid &&
          this.dormForm.get('address')?.valid &&
          this.dormForm.get('zone_id')?.valid
        );
      case 2:
        // Step 2: ไม่บังคับ ผ่านเสมอ
        return true;
      case 3:
        // Step 3: ต้องกรอกราคาอย่างน้อย 1 ตัว + ค่าน้ำค่าไฟต้องกรอก
        const monthly = this.dormForm.get('monthly_price')?.value;
        const term = this.dormForm.get('term_price')?.value;
        const hasPrice =
          (monthly && monthly.toString().trim() !== '') ||
          (term && term.toString().trim() !== '');

        const electricityType = this.dormForm.get(
          'electricity_price_type',
        )?.value;
        const waterType = this.dormForm.get('water_price_type')?.value;
        const hasElectricityType =
          electricityType && electricityType.trim() !== '';
        const hasWaterType = waterType && waterType.trim() !== '';

        return hasPrice && hasElectricityType && hasWaterType;
      case 4:
        // ตรวจสอบจากจำนวนรูปทั้งหมด (ทั้งไฟล์และ URL)
        const hasEnoughImages = this.getValidImageUrls().length >= this.minImages;
        const hasLocation = !!(
          this.dormForm.get('latitude')?.value &&
          this.dormForm.get('longitude')?.value
        );
        const hasEnoughAmenities = this.getSelectedAmenities().length >= 5;
        return hasEnoughImages && hasLocation && hasEnoughAmenities;
      default:
        return false;
    }
  }

  async onSubmit() {
    // ตรวจสอบว่าทุก step ผ่านหรือไม่
    if (this.isSubmitting) return;

    // Validate all steps
    const originalStep = this.currentStep;
    let allValid = true;
    for (let step = 1; step <= this.totalSteps; step++) {
      this.currentStep = step;
      if (!this.validateCurrentStep()) {
        allValid = false;
        break;
      }
    }
    this.currentStep = originalStep;

    if (!allValid) {
      this.showToast('กรุณากรอกข้อมูลให้ครบถ้วนทุกขั้นตอน', 'error');
      return;
    }

    this.isSubmitting = true;
    this.isSubmittingFullPage = true; // Show overlay

    try {
      // อัปโหลดรูปไฟล์ขึ้น Supabase ก่อน (ถ้ามีไฟล์ที่ยังไม่ได้อัปโหลด)
      await this.uploadImagesToSupabase();

      const { urls: allImageUrls, primaryIndex } = this.buildImageUrlList();

      // ถ้าจำนวนรูปยังไม่ครบให้หยุด
      if (allImageUrls.length < this.minImages) {
        this.showToast(
          `กรุณาอัปโหลดรูปให้ครบอย่างน้อย ${this.minImages} รูป`,
          'error',
        );
        this.isSubmittingFullPage = false;
        return;
      }

      // ดึงค่าจาก form ทั้งหมด (รวม disabled fields)
      const formValues = this.dormForm.getRawValue();

      // จัดรูปแบบค่าไฟตามที่ backend ต้องการ
      const electricityPriceType = formValues.electricity_price_type || null;
      let electricityPrice = formValues.electricity_price;

      // ถ้าเลือก "ตามอัตราการไฟฟ้า" ให้ส่ง null
      if (electricityPriceType === 'ตามอัตราการไฟฟ้า') {
        electricityPrice = null;
      } else if (
        electricityPrice &&
        typeof electricityPrice === 'string' &&
        electricityPrice.trim() !== ''
      ) {
        electricityPrice = electricityPrice.trim();
      }

      // จัดรูปแบบค่าน้ำตามที่ backend ต้องการ
      const waterPriceType = formValues.water_price_type || null;
      let waterPrice = formValues.water_price;

      // ถ้าเลือก "ตามอัตราการประปา" ให้ส่ง null
      if (waterPriceType === 'ตามอัตราการประปา') {
        waterPrice = null;
      } else if (
        waterPrice &&
        typeof waterPrice === 'string' &&
        waterPrice.trim() !== ''
      ) {
        waterPrice = waterPrice.trim();
      }

      const payload = {
        ...formValues,
        // description จะเก็บเฉพาะข้อความที่ผู้ใช้กรอก ไม่ฝังประโยคระยะทางลงฐานข้อมูลแล้ว
        description: formValues.description || '',
        electricity_price_type: electricityPriceType,
        electricity_price: electricityPrice,
        water_price_type: waterPriceType,
        water_price: waterPrice,
        images: allImageUrls,
        primary_image_index: primaryIndex,
        amenities: this.getSelectedAmenities(),
      };

      // ส่ง JSON ไป backend
      await this.http
        .post(`${this.backendUrl}/submissions`, payload)
        .toPromise();

      // แสดง success modal แบบเรียบง่าย
      this.showSuccessSimple();
    } catch (error: any) {
      console.error('Error submitting form:', error);

      // แสดง error message จาก backend ถ้ามี
      const errorMessage =
        error.error?.message ||
        error.error?.error ||
        'เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง';
      this.showToast(errorMessage, 'error');
    } finally {
      this.isSubmitting = false;
      this.isSubmittingFullPage = false;
    }
  }

  getInvalidFields(): string[] {
    const invalid: string[] = [];
    const controls = this.dormForm.controls;

    // ตรวจเฉพาะ field ใน step ปัจจุบัน
    switch (this.currentStep) {
      case 1:
        // Step 1: ตรวจเฉพาะ field ใน step 1
        if (controls['accommodation_type']?.invalid)
          invalid.push('accommodation_type');
        if (controls['dorm_name']?.invalid) invalid.push('dorm_name');
        if (controls['address']?.invalid) invalid.push('address');
        if (controls['zone_id']?.invalid) invalid.push('zone_id');
        break;
      case 2:
        // Step 2: ไม่บังคับ แต่ถ้ากรอกต้องถูกต้อง
        if (
          controls['contact_phone']?.value &&
          controls['contact_phone']?.invalid
        ) {
          invalid.push('contact_phone');
        }
        if (
          controls['contact_email']?.value &&
          controls['contact_email']?.invalid
        ) {
          invalid.push('contact_email');
        }
        break;
      case 3:
        // Step 3: ตรวจราคาและค่าน้ำค่าไฟ
        const monthly = controls['monthly_price']?.value;
        const term = controls['term_price']?.value;
        const hasPrice =
          (monthly && monthly.toString().trim() !== '') ||
          (term && term.toString().trim() !== '');

        if (!hasPrice) {
          invalid.push('atLeastOnePrice');
        }
        if (controls['electricity_price_type']?.invalid)
          invalid.push('electricity_price_type');
        if (controls['water_price_type']?.invalid)
          invalid.push('water_price_type');
        break;
      case 4:
        // Step 4: ตรวจรูป พิกัด และ amenities
        if (this.getValidImageUrls().length < this.minImages)
          invalid.push('images');
        if (!controls['latitude']?.value || !controls['longitude']?.value)
          invalid.push('location');
        if (this.getSelectedAmenities().length < 5) invalid.push('amenities');
        break;
    }

    return invalid;
  }

  // Helper methods
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

  // Helper methods for dynamic labels
  getAccommodationType(): string {
    return this.dormForm.get('accommodation_type')?.value || 'หอ';
  }

  isHouse(): boolean {
    return this.getAccommodationType() === 'บ้าน';
  }

  getAccommodationNameLabel(): string {
    return this.isHouse() ? 'ชื่อบ้าน' : 'ชื่อหอพัก';
  }

  getAccommodationAddressLabel(): string {
    return this.isHouse() ? 'ที่อยู่บ้าน' : 'ที่อยู่หอพัก';
  }

  getRoomTypeLabel(): string {
    return this.isHouse() ? 'จำนวนห้อง' : 'ประเภทห้อง';
  }

  getDepositLabel(): string {
    return this.isHouse() ? 'ค่าประกันบ้าน' : 'ค่าประกันห้อง';
  }

  getRoomTypes(): string[] {
    if (this.isHouse()) {
      return [
        '1 ห้องนอน 1 ห้องน้ำ',
        '2 ห้องนอน 1 ห้องน้ำ',
        '2 ห้องนอน 2 ห้องน้ำ',
        '3 ห้องนอน 2 ห้องน้ำ',
        '3 ห้องนอน 3 ห้องน้ำ',
        '4 ห้องนอน 3 ห้องน้ำ',
        '4 ห้องนอน 4 ห้องน้ำ',
        'อื่นๆ',
      ];
    } else {
      return [
        'ห้องพัดลม',
        'ห้องแอร์',
        'ห้องสตูดิโอ',
        'อื่นๆ',
      ];
    }
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

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return !!(
          this.dormForm.get('dorm_name')?.valid &&
          this.dormForm.get('address')?.valid &&
          this.dormForm.get('zone_id')?.valid
        );
      case 2:
        return true; // ข้อมูลติดต่อไม่บังคับ
      case 3:
        return true; // ตรวจสอบราคาใน validator แล้ว
      case 4:
        // ต้องมีรูปอย่างน้อย minImages รูป, มีพิกัด, และเลือกสิ่งอำนวยความสะดวกอย่างน้อย 5 อย่าง
        const hasEnoughImages = this.imageItems.length >= this.minImages;
        const hasLocation = !!(
          this.dormForm.get('latitude')?.value &&
          this.dormForm.get('longitude')?.value
        );
        const hasEnoughAmenities = this.getSelectedAmenities().length >= 5;
        return hasEnoughImages && hasLocation && hasEnoughAmenities;
      default:
        return false;
    }
  }

  getSelectedAmenities(): string[] {
    const amenitiesGroup = this.dormForm.get('amenities')?.value || {};
    return Object.keys(amenitiesGroup).filter((key) => amenitiesGroup[key]);
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
      this.showToast('กรุณาใส่ URL รูปภาพ', 'error');
      return;
    }

    if (this.imageItems.length >= this.maxImages) {
      this.showToast(`สามารถเพิ่มรูปได้สูงสุด ${this.maxImages} รูป`, 'error');
      return;
    }

    if (!this.isValidImageUrl(this.imageUrlInput.trim())) {
      this.showToast('URL ไม่ถูกต้อง', 'error');
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
      this.showToast('เพิ่มรูปจาก URL สำเร็จ', 'success');
    } catch (error) {
      // URL ใช้ไม่ได้ ใช้ placeholder
      imageItem.preview = this.getNoImagePlaceholder();
      imageItem.uploadStatus = 'error';
      this.showToast('ไม่สามารถโหลดรูปจาก URL นี้ได้ ใช้รูป placeholder แทน', 'info');
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
    return this.buildImageUrlList().urls;
  }

  private buildImageUrlList(): { urls: string[]; primaryIndex: number } {
    const urls: string[] = [];
    let primaryIndex = -1;

    this.imageItems.forEach((item) => {
      let resolvedUrl: string | null = null;

      if (item.type === 'file' && item.supabaseUrl) {
        resolvedUrl = item.supabaseUrl;
      } else if (
        item.type === 'url' &&
        item.url &&
        item.uploadStatus === 'success'
      ) {
        resolvedUrl = item.url;
      }

      if (!resolvedUrl) {
        return;
      }

      if (urls.includes(resolvedUrl)) {
        if (item.isPrimary) {
          primaryIndex = urls.indexOf(resolvedUrl);
        }
        return;
      }

      urls.push(resolvedUrl);
      if (item.isPrimary) {
        primaryIndex = urls.length - 1;
      }
    });

    if (primaryIndex === -1 && urls.length > 0) {
      primaryIndex = 0;
    }

    return { urls, primaryIndex };
  }

  private getFileItemsNeedingUpload(): ImageItem[] {
    return this.imageItems.filter(
      (item) =>
        item.type === 'file' &&
        item.file &&
        item.uploadStatus !== 'success',
    );
  }

  // Map methods
  initMap() {
    if (this.map) {
      // Clean up previous instance before re-initializing
      this.map.remove();
      this.map = null;
      this.marker = null;
    }

    maptilersdk.config.apiKey = environment.mapTilerApiKey;

    // Default center: มหาวิทยาลัยมหาสารคาม
    const defaultCenter: [number, number] = [103.2565, 16.2467];

    this.map = new maptilersdk.Map({
      container: this.mapContainer.nativeElement,
      style: maptilersdk.MapStyle.SATELLITE,
      center: defaultCenter,
      zoom: 14,
      geolocateControl: false, // ปิด GeolocateControl ของ MapTiler
    });

    // เพิ่ม marker
    this.marker = new maptilersdk.Marker({ draggable: true, color: '#FFCD22' })
      .setLngLat(defaultCenter)
      .addTo(this.map);

    // อัพเดทพิกัดเมื่อลาก marker
    this.marker.on('dragend', () => {
      const lngLat = this.marker!.getLngLat();
      this.updateLocation(lngLat.lng, lngLat.lat);
    });

    // คลิกบนแผนที่เพื่อเลือกตำแหน่ง
    this.map.on('click', (e) => {
      this.marker!.setLngLat([e.lngLat.lng, e.lngLat.lat]);
      this.updateLocation(e.lngLat.lng, e.lngLat.lat);
    });
  }

  updateLocation(lng: number, lat: number) {
    this.dormForm.patchValue({
      longitude: lng,
      latitude: lat,
    });

    // คำนวณระยะทางตามถนน (ORS). ถ้า ORS ใช้ไม่ได้จะ fallback เป็นเส้นตรง (calculateDistance)
    const reqSeq = ++this.roadDistanceReqSeq;
    this.isLoadingRoadDistance = true;
    this.distanceService.getRoadDistancesFromDorm(lat, lng).subscribe({
      next: (res) => {
        if (reqSeq !== this.roadDistanceReqSeq) return;
        this.lastCalculatedDistance = res.msuKm;
        this.roadDistanceFallback = res.fallback;
        this.roadNearbySummaryText = this.distanceService.buildNearbySummaryTextFromRoad(res.places, res.fallback);
      },
      error: () => {
        if (reqSeq !== this.roadDistanceReqSeq) return;
        const distance = this.distanceService.calculateDistance(lat, lng);
        this.lastCalculatedDistance = distance;
        this.roadDistanceFallback = true;
        this.roadNearbySummaryText = '';
      },
      complete: () => {
        if (reqSeq !== this.roadDistanceReqSeq) return;
        this.isLoadingRoadDistance = false;
      },
    });
  }

  getCurrentLocation() {
    if (navigator.geolocation) {
      this.isLoadingLocation = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;

          if (this.map && this.marker) {
            this.map.setCenter([lng, lat]);
            this.marker.setLngLat([lng, lat]);
            this.updateLocation(lng, lat);
          }
          this.isLoadingLocation = false;
        },
        (error) => {
          console.error('Error getting location:', error);
          this.showToast('ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้', 'error');
          this.isLoadingLocation = false;
        },
      );
    } else {
      this.showToast('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง', 'error');
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
      type === 'success'
        ? 'bg-green-500'
        : type === 'error'
          ? 'bg-red-500'
          : 'bg-blue-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  toggleMapStyle() {
    if (!this.map) return;

    if (this.currentMapStyle === 'satellite') {
      this.map.setStyle(maptilersdk.MapStyle.STREETS);
      this.currentMapStyle = 'streets';
    } else {
      this.map.setStyle(maptilersdk.MapStyle.SATELLITE);
      this.currentMapStyle = 'satellite';
    }
  }

  // Helper method to get zone name
  getZoneName(): string {
    const zoneId = this.dormForm.get('zone_id')?.value;
    if (!zoneId) return 'ไม่ระบุ';
    const zone = this.zones.find((z) => z.zone_id === Number(zoneId));
    return zone ? zone.zone_name : 'ไม่ระบุ';
  }

  markStepFieldsAsTouched() {
    switch (this.currentStep) {
      case 1:
        this.dormForm.get('accommodation_type')?.markAsTouched();
        this.dormForm.get('dorm_name')?.markAsTouched();
        this.dormForm.get('address')?.markAsTouched();
        this.dormForm.get('zone_id')?.markAsTouched();
        break;
      case 2:
        // ไม่บังคับ
        break;
      case 3:
        this.dormForm.get('room_type')?.markAsTouched();
        this.dormForm.get('room_type_other')?.markAsTouched();
        this.dormForm.get('monthly_price')?.markAsTouched();
        this.dormForm.get('term_price')?.markAsTouched();
        this.dormForm.get('electricity_price_type')?.markAsTouched();
        this.dormForm.get('electricity_price')?.markAsTouched();
        this.dormForm.get('water_price_type')?.markAsTouched();
        this.dormForm.get('water_price')?.markAsTouched();
        break;
      case 4:
        // จะแสดง error ของรูปภาพและแผนที่
        break;
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.router.navigate(['/']);
  }

  toggleDetailsModal(): void {
    this.showDetailsModal = !this.showDetailsModal;
    
    if (this.showDetailsModal) {
      // Initialize popup map when modal opens
      setTimeout(() => {
        this.initPopupMap();
      }, 100);
    } else {
      // Clean up popup map when modal closes
      if (this.popupMap) {
        this.popupMap.remove();
        this.popupMap = null;
        this.popupMarker = null;
      }
    }
  }

  // Phone input restriction - only allow numbers
  allowNumbersOnly(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 46, 9, 27, 13].indexOf(charCode) !== -1) {
      return true;
    }
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (
      (event.ctrlKey || event.metaKey) &&
      [65, 67, 86, 88].indexOf(charCode) !== -1
    ) {
      return true;
    }
    // Allow: home, end, left, right
    if (charCode >= 35 && charCode <= 39) {
      return true;
    }
    // Allow: numbers only (0-9)
    if (charCode >= 48 && charCode <= 57) {
      return true;
    }
    // Block everything else
    event.preventDefault();
    return false;
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    // Remove all non-numeric characters
    const numericOnly = pastedText.replace(/\D/g, '');
    // Insert only numbers
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = input.value;
    const newValue =
      currentValue.substring(0, start) +
      numericOnly +
      currentValue.substring(end);
    // Truncate to max length
    input.value = newValue.substring(0, 10);
    // Update form control
    this.dormForm.get('contact_phone')?.setValue(input.value);
    // Trigger change detection
    input.dispatchEvent(new Event('input'));
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    if (this.popupMap) {
      this.popupMap.remove();
    }
  }

  // Popup map methods
  initPopupMap(): void {
    if (!this.popupMapContainer || this.popupMap) return;

    const lat = this.dormForm.get('latitude')?.value;
    const lng = this.dormForm.get('longitude')?.value;
    
    if (!lat || !lng) return;

    // Configure MapTiler
    if (this.maptilersdk?.config) {
      this.maptilersdk.config.apiKey = environment.mapTilerApiKey;
    }

    this.popupMap = new (this.maptilersdk.Map || maptilersdk.Map)({
      container: this.popupMapContainer.nativeElement,
      style: this.popupMapStyle === 'satellite' ? (this.maptilersdk.MapStyle || maptilersdk.MapStyle).SATELLITE : (this.maptilersdk.MapStyle || maptilersdk.MapStyle).STREETS,
      center: [lng, lat],
      zoom: 16,
      geolocateControl: false,
      navigationControl: false,
      scaleControl: false,
    });

    // Add marker
    this.popupMarker = new (this.maptilersdk.Marker || maptilersdk.Marker)({ color: '#FFCD22', draggable: false })
      .setLngLat([lng, lat])
      .addTo(this.popupMap);

    // Hide MapTiler warnings
    this.popupMap?.on('styleimagemissing', (e: any) => {
      // Silent - ไม่ต้องทำอะไร เพราะเราไม่ได้ใช้ไอคอนเหล่านั้น
    });
  }

  togglePopupMapStyle(): void {
    if (!this.popupMap) return;

    this.popupMapStyle = this.popupMapStyle === 'satellite' ? 'streets' : 'satellite';
    
    const nextStyle = this.popupMapStyle === 'satellite' 
      ? (this.maptilersdk.MapStyle || maptilersdk.MapStyle).SATELLITE 
      : (this.maptilersdk.MapStyle || maptilersdk.MapStyle).STREETS;

    this.popupMap.setStyle(nextStyle);
  }
}
