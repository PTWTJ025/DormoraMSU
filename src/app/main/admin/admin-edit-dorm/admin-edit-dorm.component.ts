import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

interface Zone {
  zone_id: number;
  zone_name: string;
}

interface Amenity {
  name: string;
  available: boolean;
}

@Component({
  selector: 'app-admin-edit-dorm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-edit-dorm.component.html',
  styleUrls: ['./admin-edit-dorm.component.css']
})
export class AdminEditDormComponent implements OnInit, OnDestroy {
  dormForm!: FormGroup;
  dormId!: number;
  isLoading = true;
  isSubmitting = false;
  zones: Zone[] = [];
  amenities: Amenity[] = [];
  
  // Map properties
  map: maptilersdk.Map | null = null;
  marker: maptilersdk.Marker | null = null;
  currentMapStyle: 'satellite' | 'streets' = 'satellite';
  
  private backendUrl = environment.backendApiUrl;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.dormId = Number(this.route.snapshot.paramMap.get('dormId'));
    if (!this.dormId) {
      this.router.navigate(['/admin']);
      return;
    }

    this.initForm();
    this.loadZones();
    this.loadDormData();
  }

  initForm() {
    this.dormForm = this.fb.group({
      // ข้อมูลหอพัก
      dorm_name: ['', [Validators.required, Validators.minLength(3)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      zone_id: ['', Validators.required],
      dorm_description: [''],
      
      // พิกัด
      latitude: [null, Validators.required],
      longitude: [null, Validators.required],
      
      // ประเภทห้อง
      room_type: ['', Validators.required],
      
      // ราคา
      monthly_price: [''],
      daily_price: [''],
      summer_price: [''],
      deposit: [''],
      
      // ค่าน้ำค่าไฟ
      electricity_price: ['', Validators.required],
      water_price_type: ['', Validators.required],
      water_price: [{ value: '', disabled: true }, Validators.required],
      
      // สถานะอนุมัติ
      approval_status: ['']
    });

    // ฟังการเปลี่ยนแปลงของ water_price_type
    this.dormForm.get('water_price_type')?.valueChanges.subscribe(value => {
      const waterPriceControl = this.dormForm.get('water_price');
      if (value && value !== 'ตามอัตราการประปา') {
        waterPriceControl?.enable();
      } else {
        waterPriceControl?.disable();
        waterPriceControl?.setValue('');
      }
    });
  }

  loadZones() {
    this.http.get<Zone[]>(`${this.backendUrl}/zones`)
      .subscribe({
        next: (zones) => {
          this.zones = zones;
        },
        error: (error) => {
          console.error('Error loading zones:', error);
        }
      });
  }

  loadDormData() {
    this.http.get<any>(`${this.backendUrl}/admin/dormitories/${this.dormId}`)
      .subscribe({
        next: (dormData) => {
          this.populateForm(dormData);
          this.isLoading = false;
          
          // Initialize map after data is loaded
          setTimeout(() => this.initMap(), 100);
        },
        error: (error) => {
          console.error('Error loading dorm data:', error);
          this.isLoading = false;
          
          if (error.status === 404) {
            alert('ไม่พบข้อมูลหอพัก');
            this.router.navigate(['/admin']);
          } else if (error.status === 403) {
            alert('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
            this.router.navigate(['/admin']);
          }
        }
      });
  }

  populateForm(data: any) {
    this.dormForm.patchValue({
      dorm_name: data.dorm_name || '',
      address: data.address || '',
      zone_id: data.zone_id || '',
      dorm_description: data.dorm_description || '',
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      room_type: data.room_type || '',
      monthly_price: data.monthly_price || '',
      daily_price: data.daily_price || '',
      summer_price: data.summer_price || '',
      deposit: data.deposit || '',
      electricity_price: data.electricity_price || '',
      water_price_type: data.water_price_type || '',
      water_price: data.water_price || '',
      approval_status: data.approval_status || ''
    });
  }

  // Map methods
  initMap() {
    if (this.map || !this.dormForm.value.latitude || !this.dormForm.value.longitude) return;

    maptilersdk.config.apiKey = environment.mapTilerApiKey;

    const lat = this.dormForm.value.latitude;
    const lng = this.dormForm.value.longitude;

    this.map = new maptilersdk.Map({
      container: 'edit-map',
      style: maptilersdk.MapStyle.SATELLITE,
      center: [lng, lat],
      zoom: 14,
      geolocateControl: false
    });

    this.marker = new maptilersdk.Marker({ draggable: true, color: '#FFCD22' })
      .setLngLat([lng, lat])
      .addTo(this.map);

    this.marker.on('dragend', () => {
      const lngLat = this.marker!.getLngLat();
      this.updateLocation(lngLat.lng, lngLat.lat);
    });

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
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          
          if (this.map && this.marker) {
            this.map.setCenter([lng, lat]);
            this.marker.setLngLat([lng, lat]);
            this.updateLocation(lng, lat);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้');
        }
      );
    } else {
      alert('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
    }
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

  // Form submission
  onSubmit() {
    if (this.dormForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      // สร้าง payload ส่งเฉพาะ field ที่อนุญาตให้แก้ไข
      const allowedFields = [
        'dorm_name', 'address', 'dorm_description', 'latitude', 'longitude',
        'electricity_price', 'water_price_type', 'water_price',
        'zone_id', 'monthly_price', 'daily_price', 'summer_price', 
        'deposit', 'room_type'
      ];
      
      const payload: any = {};
      allowedFields.forEach(field => {
        if (this.dormForm.get(field)?.value !== null && 
            this.dormForm.get(field)?.value !== undefined) {
          payload[field] = this.dormForm.get(field)?.value;
        }
      });

      this.http.put(`${this.backendUrl}/admin/dormitories/${this.dormId}`, payload)
        .subscribe({
          next: (response) => {
            alert('อัปเดตข้อมูลหอพักเรียบร้อยแล้ว');
            this.router.navigate(['/admin']);
          },
          error: (error) => {
            console.error('Error updating dorm:', error);
            
            if (error.status === 400) {
              alert('ไม่มีข้อมูลที่ต้องอัปเดต');
            } else if (error.status === 403) {
              alert('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถดำเนินการนี้ได้');
            } else if (error.status === 404) {
              alert('ไม่พบข้อมูลผู้ใช้');
            } else {
              alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูลหอพัก');
            }
            
            this.isSubmitting = false;
          },
          complete: () => {
            this.isSubmitting = false;
          }
        });
    }
  }

  // Update approval status
  onUpdateApprovalStatus() {
    const status = this.dormForm.get('approval_status')?.value;
    if (!status) {
      alert('กรุณาเลือกสถานะการอนุมัติ');
      return;
    }

    this.http.put(`${this.backendUrl}/admin/dormitories/${this.dormId}/approval`, 
      { status: status })
      .subscribe({
        next: (response) => {
          alert('สถานะการอนุมัติหอพักถูกปรับปรุงเรียบร้อยแล้ว');
          this.router.navigate(['/admin']);
        },
        error: (error) => {
          console.error('Error updating approval status:', error);
          alert('เกิดข้อผิดพลาดในการอัปเดตสถานะการอนุมัติ');
        }
      });
  }

  // Navigation
  goBack() {
    this.router.navigate(['/admin']);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}
