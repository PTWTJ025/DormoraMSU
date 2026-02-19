import { Component, OnInit, OnDestroy, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../../services/supabase.service';
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
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DormSubmitComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  dormForm!: FormGroup;
  currentStep = 1;
  totalSteps = 4;
  isSubmitting = false;
  images: ImageFile[] = [];
  imageUrls: string[] = []; // เก็บ URL จาก Supabase
  maxImages = 20;
  minImages = 3;
  showSuccessModal = false; // สำหรับแสดง success popup
  isUploadingImages = false; // สถานะการอัปโหลดรูป

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
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadZones();
    this.loadAmenities();
  }

  initForm() {
    this.dormForm = this.fb.group({
      // ข้อมูลหอพัก
      accommodation_type: ['หอ', Validators.required], // เพิ่มประเภทที่พัก (หอ/บ้าน)
      dorm_name: ['', [Validators.required, Validators.minLength(3)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      zone_id: ['', Validators.required], // เปลี่ยนจาก zone_name เป็น zone_id
      description: [''], // คำอธิบาย/กฎระเบียบ (ไม่บังคับ)
      
      // ข้อมูลติดต่อ (ไม่บังคับทั้งหมด)
      contact_name: [''],
      contact_phone: ['', [Validators.pattern(/^[0-9]{10}$/)]], // ต้องเป็น 10 หลักพอดี
      contact_email: ['', [Validators.email]],
      line_id: [''],
      
      // ประเภทห้อง (dropdown + อื่นๆ)
      room_type: ['', Validators.required],
      room_type_other: [''], // ถ้าเลือก "อื่นๆ"
      
      // ราคา (ต้องเลือกอย่างน้อย 1)
      monthly_price: [''],
      term_price: [''], // เปลี่ยนจาก daily_price เป็น term_price
      summer_price: [''], // ราคาซัมเมอร์ (ไม่บังคับ)
      deposit: [''], // ค่าประกันห้อง (ไม่บังคับ)
      
      // ค่าน้ำค่าไฟ (บังคับกรอก)
      electricity_price_type: ['', Validators.required], // เพิ่มประเภทค่าไฟ
      electricity_price: [{ value: '', disabled: true }, Validators.required], // ค่าไฟ บาท/หน่วย - บังคับ
      water_price_type: ['', Validators.required], // ประเภทค่าน้ำ - บังคับ
      water_price: [{ value: '', disabled: true }, Validators.required], // ค่าน้ำ - บังคับ
      
      // สิ่งอำนวยความสะดวก (จะสร้างแบบ dynamic จาก API)
      amenities: this.fb.group({}),
      
      // พิกัด (Map picker)
      latitude: [null, Validators.required],
      longitude: [null, Validators.required]
    }, { validators: this.atLeastOnePriceValidator });

    // ฟังการเปลี่ยนแปลงของ water_price_type
    this.dormForm.get('water_price_type')?.valueChanges.subscribe(value => {
      const waterPriceControl = this.dormForm.get('water_price');
      if (value) {
        waterPriceControl?.enable();
      } else {
        waterPriceControl?.disable();
        waterPriceControl?.setValue('');
      }
    });

    // ฟังการเปลี่ยนแปลงของ electricity_price_type
    this.dormForm.get('electricity_price_type')?.valueChanges.subscribe(value => {
      const electricityPriceControl = this.dormForm.get('electricity_price');
      if (value === 'ตามอัตราการไฟฟ้า') {
        electricityPriceControl?.setValue('ตามอัตราการไฟฟ้า');
        electricityPriceControl?.disable();
      } else if (value) {
        electricityPriceControl?.enable();
        electricityPriceControl?.setValue('');
      } else {
        electricityPriceControl?.disable();
        electricityPriceControl?.setValue('');
      }
    });

    // ฟังการเปลี่ยนแปลงของ water_price_type สำหรับอัตราการประปา
    this.dormForm.get('water_price_type')?.valueChanges.subscribe(value => {
      const waterPriceControl = this.dormForm.get('water_price');
      if (value === 'ตามอัตราการประปา') {
        waterPriceControl?.setValue('ตามอัตราการประปา');
        waterPriceControl?.disable();
      } else if (value) {
        waterPriceControl?.enable();
        waterPriceControl?.setValue('');
      } else {
        waterPriceControl?.disable();
        waterPriceControl?.setValue('');
      }
    });
  }

  // Custom validator: ต้องมีราคาอย่างน้อย 1 ตัว
  atLeastOnePriceValidator(group: FormGroup): {[key: string]: boolean} | null {
    const monthly = group.get('monthly_price')?.value;
    const term = group.get('term_price')?.value; // เปลี่ยนจาก daily เป็น term
    
    if (!monthly && !term) {
      return { atLeastOnePrice: true };
    }
    return null;
  }

  loadZones() {
    this.isLoadingData = true;
    this.http.get<Zone[]>(`${this.backendUrl}/zones`)
      .subscribe({
        next: (zones) => {
          this.zones = zones;
          this.isLoadingData = false;
        },
        error: (error) => {
          console.error('Error loading zones:', error);
          this.isLoadingData = false;
        }
      });
  }

  loadAmenities() {
    this.http.get<string[]>(`${this.backendUrl}/dormitories/amenities`)
      .subscribe({
        next: (amenities) => {
          this.amenities = amenities;
          // สร้าง form controls สำหรับแต่ละ amenity
          const amenitiesGroup = this.dormForm.get('amenities') as FormGroup;
          amenities.forEach(amenity => {
            amenitiesGroup.addControl(amenity, this.fb.control(false));
          });
        },
        error: (error) => {
          console.error('Error loading amenities:', error);
        }
      });
  }

  // การจัดการรูปภาพ
  async uploadImagesToSupabase() {
    if (this.images.length === 0) return;
    
    this.isUploadingImages = true;
    
    try {
      const files = this.images.map(img => img.file);
      const result = await this.supabaseService.uploadMultipleImages(
        files, 
        'dorm-drafts/'
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
    if (this.images.length > 0 && this.imageUrls.length === 0) {
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
      Array.from(input.files).forEach(file => {
        this.handleImageFile(file);
      });
    }
  }

  handleImageFile(file: File) {
    if (this.images.length >= this.maxImages) {
      this.showToast(`สามารถอัปโหลดรูปภาพได้สูงสุด ${this.maxImages} รูป`, 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      this.showToast('ขนาดไฟล์ต้องไม่เกิน 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.images.push({
        file,
        preview: e.target?.result as string,
        isPrimary: this.images.length === 0 // รูปแรกเป็นรูปหลัก
      });
      
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
    
    // อัปโหลดใหม่ถ้ายังมีรูปอยู่
    if (this.images.length > 0) {
      this.autoUploadImages();
    }
  }

  setPrimaryImage(index: number) {
    this.images.forEach((img, i) => {
      img.isPrimary = i === index;
    });
  }

  // การนำทาง
  nextStep() {
    // Mark fields as touched to show validation errors
    this.markStepFieldsAsTouched();
    
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        
        // Initialize map when entering step 4
        if (this.currentStep === 4) {
          setTimeout(() => this.initMap(), 100);
        }
      }
    }
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
        this.dormForm.get('term_price')?.markAsTouched(); // เปลี่ยนจาก daily_price
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

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!(this.dormForm.get('accommodation_type')?.valid &&
               this.dormForm.get('dorm_name')?.valid &&
               this.dormForm.get('address')?.valid &&
               this.dormForm.get('zone_id')?.valid);
      case 2:
        // ข้อมูลติดต่อไม่บังคับ แต่ถ้ากรอกเบอร์โทรต้องครบ 10 หลัก
        const phone = this.dormForm.get('contact_phone');
        if (phone?.value && phone?.invalid) {
          phone.markAsTouched();
          return false;
        }
        const email = this.dormForm.get('contact_email');
        if (email?.value && email?.invalid) {
          email.markAsTouched();
          return false;
        }
        return true;
      case 3:
        // ต้องมีประเภทห้อง, ราคาอย่างน้อย 1 ตัว, และค่าน้ำค่าไฟ
        const roomType = this.dormForm.get('room_type')?.value;
        const roomTypeOther = this.dormForm.get('room_type_other')?.value;
        const hasValidRoomType = roomType && (roomType !== 'อื่นๆ' || roomTypeOther);
        
        const monthly = this.dormForm.get('monthly_price')?.value;
        const term = this.dormForm.get('term_price')?.value; // เปลี่ยนจาก daily เป็น term
        const hasPrice = monthly || term;
        
        const hasElectricityType = this.dormForm.get('electricity_price_type')?.valid;
        const hasElectricity = this.dormForm.get('electricity_price')?.valid;
        const hasWaterType = this.dormForm.get('water_price_type')?.valid;
        const hasWaterPrice = this.dormForm.get('water_price')?.valid;
        
        return hasValidRoomType && hasPrice && hasElectricityType && hasElectricity && hasWaterType && hasWaterPrice;
      case 4:
        // ต้องมีรูปอย่างน้อย 3 รูป และมีพิกัด
        const hasEnoughImages = this.imageUrls.length >= this.minImages;
        const hasLocation = this.dormForm.get('latitude')?.value && this.dormForm.get('longitude')?.value;
        return hasEnoughImages && hasLocation;
      default:
        return false;
    }
  }

  async onSubmit() {
    if (this.dormForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      try {
        // อัปโหลดรูปขึ้น Supabase ก่อน (ถ้ายังไม่ได้อัปโหลด)
        if (this.imageUrls.length === 0 && this.images.length > 0) {
          await this.uploadImagesToSupabase();
        }
        
        // ถ้าอัปโหลดรูปไม่สำเร็จ ให้หยุด
        if (this.imageUrls.length === 0 && this.images.length > 0) {
          this.showToast('กรุณาอัปโหลดรูปก่อนส่งข้อมูล', 'error');
          return;
        }
        
        // สร้าง payload สำหรับส่ง JSON
        const payload = {
          ...this.dormForm.value,
          images: this.imageUrls,
          primary_image_index: this.images.findIndex(img => img.isPrimary)
        };
        
        console.log('📋 Form values before submission:', payload);
        console.log('📸 Images URLs:', this.imageUrls);
        
        // ส่ง JSON ไป backend
        console.log('🚀 Sending to:', `${this.backendUrl}/submissions`);
        await this.http.post(`${this.backendUrl}/submissions`, payload).toPromise();
        
        // แสดง success modal
        this.showSuccessModal = true;
        
      } catch (error: any) {
        console.error('❌ Error submitting form:', error);
        console.error('❌ Error details:', error.error);
        console.error('❌ Error message:', error.message);
        
        // แสดง error message จาก backend ถ้ามี
        const errorMessage = error.error?.message || error.error?.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง';
        this.showToast(errorMessage, 'error');
      } finally {
        this.isSubmitting = false;
      }
    } else {
      console.log('⚠️ Form validation failed or already submitting');
      console.log('Form valid:', this.dormForm.valid);
      console.log('Form errors:', this.dormForm.errors);
      console.log('Invalid fields:', this.getInvalidFields());
    }
  }

  getInvalidFields(): string[] {
    const invalid: string[] = [];
    const controls = this.dormForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(name);
      }
    }
    return invalid;
  }

  // Helper methods
  getStepTitle(): string {
    switch (this.currentStep) {
      case 1: return 'ข้อมูลหอพัก';
      case 2: return 'ข้อมูลติดต่อ';
      case 3: return 'ประเภทห้องและราคา';
      case 4: return 'รูปภาพและข้อมูลเพิ่มเติม';
      default: return '';
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
        'อื่นๆ'
      ];
    }
    return ['ห้องแอร์', 'ห้องคู่', 'ห้องพัดลม', 'อื่นๆ'];
  }

  getElectricityPriceTypes(): string[] {
    return [
      'ตามอัตราการไฟฟ้า',
      'คิดตามหน่วย (บาท/หน่วย)'
    ];
  }

  getWaterPriceTypes(): string[] {
    return [
      'ตามอัตราการประปา',
      'คิดตามหน่วย (บาท/หน่วย)',
      'คิดรายเดือน (บาท/เดือน)'
    ];
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return !!(this.dormForm.get('dorm_name')?.valid && 
               this.dormForm.get('address')?.valid && 
               this.dormForm.get('zone_id')?.valid);
      case 2:
        return true; // ข้อมูลติดต่อไม่บังคับ
      case 3:
        return true; // ตรวจสอบราคาใน validator แล้ว
      case 4:
        // ต้องมีรูปอย่างน้อย minImages รูป, มีพิกัด, และเลือกสิ่งอำนวยความสะดวกอย่างน้อย 5 อย่าง
        const hasEnoughImages = this.images.length >= this.minImages;
        const hasLocation = !!(this.dormForm.get('latitude')?.value && this.dormForm.get('longitude')?.value);
        const hasEnoughAmenities = this.getSelectedAmenities().length >= 5;
        return hasEnoughImages && hasLocation && hasEnoughAmenities;
      default:
        return false;
    }
  }

  getSelectedAmenities(): string[] {
    const amenitiesGroup = this.dormForm.get('amenities')?.value || {};
    return Object.keys(amenitiesGroup).filter(key => amenitiesGroup[key]);
  }

  // Map methods
  initMap() {
    if (this.map) return;

    maptilersdk.config.apiKey = environment.mapTilerApiKey;

    // Default center: มหาวิทยาลัยมหาสารคาม
    const defaultCenter: [number, number] = [103.2565, 16.2467];

    this.map = new maptilersdk.Map({
      container: this.mapContainer.nativeElement,
      style: maptilersdk.MapStyle.SATELLITE,
      center: defaultCenter,
      zoom: 14,
      geolocateControl: false // ปิด GeolocateControl ของ MapTiler
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
      latitude: lat
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
        }
      );
    } else {
      this.showToast('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง', 'error');
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 
      type === 'error' ? 'bg-red-500' : 
      'bg-blue-500'
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

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.router.navigate(['/']);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}