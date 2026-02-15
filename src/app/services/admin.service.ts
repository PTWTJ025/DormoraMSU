import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminProfile {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  photoURL: string;
  memberType: string;
}

export interface Dormitory {
  dorm_id: string;
  dorm_name: string;
  owner_username: string;
  owner_name: string;
  address: string;
  approval_status: 'อนุมัติ' | 'รออนุมัติ' | 'ไม่อนุมัติ';
  submitted_date: string;
  zone_name: string;
  main_image_url: string;
  description?: string;
  room_types?: any[];
  utilities?: any;
  images?: string[];
  facilities?: string[];
}

export interface DormitoryDetail {
  dormitory: {
    dorm_id: number;
    dorm_name: string;
    address: string;
    dorm_description: string;
    latitude: number;
    longitude: number;
    electricity_type: string;
    electricity_rate: number | null;
    water_type: string;
    water_rate: number | null;
    approval_status: string;
    status_dorm: string;
    min_price: number;
    max_price: number;
    zone_name: string;
    owner_username: string;
    owner_name: string;
    owner_email: string;
    owner_phone: string;
  };
  images: Array<{
    image_id: number;
    image_url: string;
    is_primary: boolean;
    description: string;
  }>;
  room_types: Array<{
    room_type_id: number;
    room_name: string;
    bed_type: string;
    monthly_price: number | null;
    daily_price: number | null;
    summer_price: number | null;
    term_price: number | null;
  }>;
  amenities: {
    ภายใน: Array<{
      amenity_id: number;
      amenity_name: string;
      is_available: boolean;
    }>;
    ภายนอก: Array<{
      amenity_id: number;
      amenity_name: string;
      is_available: boolean;
    }>;
    common: Array<{
      amenity_id: number;
      amenity_name: string;
      is_available: boolean;
    }>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private backendUrl = environment.backendApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * เข้าสู่ระบบแอดมิน
   */
  adminLogin(firebaseToken: string): Observable<AdminProfile> {
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${firebaseToken}`)
      .set('Content-Type', 'application/json');
    
    return this.http.post<AdminProfile>(`${this.backendUrl}/auth/admin-login`, {}, { headers });
  }

  /**
   * ดึงหอพักทั้งหมด (ทั้งอนุมัติและรออนุมัติ)
   */
  getAllDormitories(): Observable<Dormitory[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Dormitory[]>(`${this.backendUrl}/admin/dormitories/all`, { headers });
  }

  /**
   * ดึงเฉพาะหอพักที่รอการอนุมัติ
   */
  getPendingDormitories(): Observable<Dormitory[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Dormitory[]>(`${this.backendUrl}/admin/dormitories/pending`, { headers });
  }

  /**
   * อนุมัติหอพัก
   */
  approveDormitory(dormId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.backendUrl}/admin/dormitories/${dormId}/approve`, {}, { headers });
  }

  /**
   * ปฏิเสธหอพัก
   */
  rejectDormitory(dormId: string, reason: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.backendUrl}/admin/dormitories/${dormId}/reject`, 
      { reason: reason }, 
      { headers });
  }

  /**
   * ดึงรายละเอียดหอพักสำหรับตรวจสอบ
   */
  getDormitoryDetail(dormId: string): Observable<DormitoryDetail> {
    const headers = this.getAuthHeaders();
    return this.http.get<DormitoryDetail>(`${this.backendUrl}/admin/dormitories/${dormId}`, { headers });
  }

  /**
   * อนุมัติ/ไม่อนุมัติหอพัก
   */
  updateDormitoryApproval(dormId: string | number, payload: { status: string; rejectionReason?: string }): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.backendUrl}/admin/dormitories/${dormId}/approval`, payload, { headers });
  }

  /**
   * แก้ไขหอพักโดยแอดมิน (ข้อมูลทั้งหมด)
   */
  updateDormitory(dormId: string | number, payload: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.backendUrl}/admin/dormitories/${dormId}`, payload, { headers });
  }

  /**
   * ลบหอพัก
   */
  deleteDormitory(dormId: string, confirm: boolean = false): Observable<any> {
    const headers = this.getAuthHeaders();
    const params = confirm ? { confirm: 'true' } : {};
    return this.http.delete(`${this.backendUrl}/admin/dormitories/${dormId}`, { 
      headers, 
      params: params
    });
  }

  /**
   * สร้าง headers สำหรับการเรียก API
   */
  private getAuthHeaders(): HttpHeaders {
    const adminProfile = localStorage.getItem('adminProfile');
    if (!adminProfile) {
      throw new Error('Admin profile not found');
    }

    // ในกรณีนี้เราต้องการ Firebase token สำหรับการเรียก API
    // แต่เนื่องจากเราเก็บ adminProfile ไว้แล้ว เราอาจต้องเก็บ token แยก
    // หรือใช้วิธีอื่นในการดึง token
    const firebaseToken = localStorage.getItem('firebaseToken');
    if (!firebaseToken) {
      throw new Error('Firebase token not found');
    }

    return new HttpHeaders()
      .set('Authorization', `Bearer ${firebaseToken}`)
      .set('Content-Type', 'application/json');
  }

  // ตรวจสอบสมาชิกในหอพักก่อนลบ
  checkDormitoryMembers(dormId: string | number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.backendUrl}/admin/dormitories/${dormId}/check-members`, { headers });
  }

}
