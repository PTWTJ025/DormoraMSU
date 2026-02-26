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
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../../services/supabase.service';
import { GsapAnimationService } from '../../services/gsap-animation.service';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

interface ImageFile {
  file: File;
  preview: string;
  isPrimary: boolean;
}

interface Zone {
  zone_id: number;
  zone_name: string;
}

@Component({
  selector: 'app-dorm-submit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dorm-submit.component.html',
  styleUrls: ['./dorm-submit.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DormSubmitComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
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
  images: ImageFile[] = [];
  imageUrls: string[] = []; // เก็บ URL จาก Supabase
  maxImages = 20;
  minImages = 3;
  showSuccessModal = false; // สำหรับแสดง success popup
  showDetailsModal = false;
  isUploadingImages = false; // สถานะการอัปโหลดรูป
  isSubmittingFullPage = false; // Full-page loading overlay status
  // Data from API
  zones: Zone[] = [];
  amenities: string[] = [];
  isLoadingData = false;

  // Map loading state
  isLoadingLocation = false;

  // Room types
  roomTypes = ['ห้องแอร์', 'ห้องคู่', 'ห้องพัดลม', 'อื่นๆ'];

  // Map properties
  map: maptilersdk.Map | null = null;
  marker: maptilersdk.Marker | null = null;
  currentMapStyle: 'satellite' | 'streets' = 'satellite';

  private backendUrl = environment.backendApiUrl;

  constructor(
    private fb: FormBuilder,
    public router: Router,
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private gsapService: GsapAnimationService,
  ) {}

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
        monthly_price: ['', [Validators.min(1000), Validators.max(100000)]],
        term_price: ['', [Validators.min(1000), Validators.max(100000)]], // เปลี่ยนจาก daily_price เป็น term_price
        summer_price: ['', []], // ราคาซัมเมอร์ (ไม่บังคับ)
        deposit: ['', []], // ค่าประกันห้อง (ไม่บังคับ)

        // ค่าน้ำค่าไฟ (บังคับกรอก)
        electricity_price_type: ['', Validators.required], // เพิ่มประเภทค่าไฟ
        electricity_price: [{ value: '', disabled: true }], // ค่าไฟ บาท/หน่วย - ไม่บังคับถ้า disabled
        water_price_type: ['', Validators.required], // ประเภทค่าน้ำ - บังคับ
        water_price: [{ value: '', disabled: true }], // ค่าน้ำ - ไม่บังคับถ้า disabled

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
      if (value) {
        waterPriceControl?.enable();
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
          // UX Sorting: Interior first, then Exterior
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

          this.amenities = [...amenities].sort((a, b) => {
            const isAInterior = interiorKeywords.some((key) => a.includes(key));
            const isBInterior = interiorKeywords.some((key) => b.includes(key));

            if (isAInterior && !isBInterior) return -1;
            if (!isAInterior && isBInterior) return 1;
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
  async uploadImagesToSupabase() {
    if (this.images.length === 0) return;

    this.isUploadingImages = true;

    try {
      const files = this.images.map((img) => img.file);
      const result = await this.supabaseService.uploadMultipleImages(
        files,
        'dorm-drafts/',
      );

      if (result.errors.length > 0) {
        console.error('Some images failed to upload:', result.errors);
        this.showToast('บางรูปอัปโหลดไม่สำเร็จ', 'error');
        return;
      }

      this.imageUrls = result.urls;
      console.log('✅ Images uploaded to Supabase:', this.imageUrls);
    } catch (error) {
      console.error('Error uploading images:', error);
      this.showToast('อัปโหลดรูปไม่สำเร็จ', 'error');
    } finally {
      this.isUploadingImages = false;
    }
  }

  // อัปโหลดรูปทันทีที่เพิ่มรูป (auto-upload)
  async autoUploadImages() {
    // เงื่อนไข: ถ้าจำนวนรูปใน local ไม่เท่ากับจำนวน URL ที่อัปโหลดแล้ว
    if (
      this.images.length > 0 &&
      this.images.length !== this.imageUrls.length
    ) {
      await this.uploadImagesToSupabase();
    }
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
      Array.from(input.files).forEach((file) => {
        this.handleImageFile(file);
      });
    }
  }

  handleImageFile(file: File) {
    if (this.images.length >= this.maxImages) {
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
      const newIndex = this.images.length;
      this.images.push({
        file,
        preview: e.target?.result as string,
        isPrimary: this.images.length === 0, // รูปแรกเป็นรูปหลัก
      });

      // Animate the new image
      setTimeout(() => this.animateImageAdd(newIndex), 50);

      // อัปโหลดรูปทันทีที่เพิ่ม
      this.autoUploadImages();
    };
    reader.readAsDataURL(file);
  }

  removeImage(index: number) {
    const wasPrimary = this.images[index].isPrimary;
    this.images.splice(index, 1);

    // ลบ URL ด้วยถ้ามี
    if (this.imageUrls.length > index) {
      this.imageUrls.splice(index, 1);
    }

    // ถ้าลบรูปหลัก ให้รูปแรกเป็นรูปหลักแทน
    if (wasPrimary && this.images.length > 0) {
      this.images[0].isPrimary = true;
    }

    // ถ้าไม่เหลือรูปเลย ให้เคลียร์ URL ทั้งหมด
    if (this.images.length === 0) {
      this.imageUrls = [];
    }

    // อัปโหลดใหม่เพื่อให้ URL sync กับรูปที่เหลือ (กรณีมีการสลับลำดับหรือลบ)
    if (this.images.length > 0) {
      // สำหรับ logic ที่ง่ายที่สุดคือ re-upload หรือแค่จัดการ Array (ในที่นี้เราใช้ simple sync)
      // แต่ถ้าจะเอาชัวร์คือควรให้ imageUrls ลบตาม index
      // this.imageUrls.splice(index, 1); // ทำไปแล้วข้างบน
      // ไม่ต้องเรียก autoUploadImages ซ้ำถ้าลบอย่างเดียว เพราะ URLs จะ sync ตาม index อยู่แล้ว
    }
  }

  setPrimaryImage(index: number) {
    this.images.forEach((img, i) => {
      img.isPrimary = i === index;
    });
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
        // ตรวจสอบจากจำนวนรูปที่เลือกในเครื่อง (Immediate Feedback)
        const hasEnoughImages = this.images.length >= this.minImages;
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
      // อัปโหลดรูปขึ้น Supabase ก่อน (ถ้าจำนวนไม่เท่ากัน)
      if (
        this.images.length > 0 &&
        this.imageUrls.length !== this.images.length
      ) {
        await this.uploadImagesToSupabase();
      }

      // ถ้าจำนวนรูปยังไม่ครบ (รวมที่อัปโหลดแล้ว) ให้หยุด
      if (this.imageUrls.length < this.minImages) {
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
      const electricityPriceType = formValues.electricity_price_type;
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
      const waterPriceType = formValues.water_price_type;
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

      // สร้าง payload ใหม่ที่จัดรูปแบบแล้ว
      const payload = {
        ...formValues,
        electricity_price_type: electricityPriceType,
        electricity_price: electricityPrice,
        water_price_type: waterPriceType,
        water_price: waterPrice,
        images: this.imageUrls,
        primary_image_index: this.images.findIndex((img) => img.isPrimary),
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
        if (this.images.length < this.minImages) invalid.push('images');
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
        '1 ห้องนอน ห้องน้ำในตัว',
        '2 ห้องนอน 1 ห้องน้ำ',
        '2 ห้องนอน 2 ห้องน้ำ',
        '3 ห้องนอน 1 ห้องน้ำ',
        '3 ห้องนอน 2 ห้องน้ำ',
        'อื่นๆ',
      ];
    }
    return ['ห้องแอร์', 'ห้องคู่', 'ห้องพัดลม', 'อื่นๆ'];
  }

  getElectricityPriceTypes(): string[] {
    return ['ตามอัตราการไฟฟ้า', 'กำหนดราคาเอง (บาท/ยูนิต)'];
  }

  getWaterPriceTypes(): string[] {
    return [
      'ตามอัตราการประปา',
      'คิดตามหน่วย (บาท/หน่วย)',
      'คิดรายเดือน (บาท/เดือน)',
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
        const hasEnoughImages = this.images.length >= this.minImages;
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
  }
}
