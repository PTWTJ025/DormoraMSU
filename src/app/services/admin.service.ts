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
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          this.http.get<Dormitory[]>(`${this.backendUrl}/admin/submissions`, { headers })
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * ดึงเฉพาะหอพักที่รอการอนุมัติ
   */
  getPendingDormitories(): Observable<Dormitory[]> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          this.http.get<Dormitory[]>(`${this.backendUrl}/admin/submissions?status=รออนุมัติ`, { headers })
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * อนุมัติหอพัก
   */
  approveDormitory(dormId: string): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          this.http.put(`${this.backendUrl}/dormitories/${dormId}/approval-status`, 
            { approval_status: 'อนุมัติแล้ว' }, 
            { headers })
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * ปฏิเสธหอพัก
   */
  rejectDormitory(dormId: string, reason: string): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          this.http.put(`${this.backendUrl}/dormitories/${dormId}/approval-status`, 
            { 
              approval_status: 'ปฏิเสธ',
              rejection_reason: reason 
            }, 
            { headers })
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * ดึงรายละเอียดหอพักสำหรับตรวจสอบ (Admin - ดูได้ทุกสถานะ)
   */
  getDormitoryDetail(dormId: string): Observable<DormitoryDetail> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          // ใช้ admin endpoint เพื่อดูได้ทุกสถานะ (pending, approved, rejected)
          this.http.get<any>(`${this.backendUrl}/admin/dormitories/${dormId}`, { headers })
            .subscribe({
              next: (data) => {
                // แปลง response format ให้ตรงกับ DormitoryDetail interface
                const detail: DormitoryDetail = {
                  dormitory: {
                    dorm_id: data.dorm_id || data.id,
                    dorm_name: data.dorm_name || data.name,
                    address: data.address,
                    dorm_description: data.dorm_description || data.description,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    electricity_type: data.electricity_type,
                    electricity_rate: data.electricity_rate || data.electricity_price,
                    water_type: data.water_type || data.water_price_type,
                    water_rate: data.water_rate || data.water_price,
                    approval_status: data.approval_status,
                    status_dorm: data.status_dorm,
                    min_price: data.min_price,
                    max_price: data.max_price,
                    zone_name: data.zone_name,
                    owner_username: data.owner_username,
                    owner_name: data.owner_name || data.manager_name,
                    owner_email: data.owner_email || data.contact_email,
                    owner_phone: data.owner_phone || data.primary_phone || data.contact_phone
                  },
                  images: data.images || [],
                  room_types: data.room_types || [],
                  amenities: data.amenities || { ภายใน: [], ภายนอก: [], common: [] }
                };
                subscriber.next(detail);
              },
              error: (err) => {
                console.error('[AdminService] Error fetching dormitory detail:', err);
                subscriber.error(err);
              },
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * อนุมัติ/ไม่อนุมัติหอพัก
   */
  updateDormitoryApproval(dormId: string | number, payload: { status: string; rejectionReason?: string }): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          
          // แปลง status เป็น approval_status ตามที่ Backend ต้องการ
          const backendPayload: any = {
            approval_status: payload.status === 'อนุมัติ' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'
          };
          
          if (payload.rejectionReason) {
            backendPayload.rejection_reason = payload.rejectionReason;
          }
          
          this.http.put(`${this.backendUrl}/dormitories/${dormId}/approval-status`, backendPayload, { headers })
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
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
   * สร้าง headers สำหรับการเรียก API (แบบ async)
   */
  private async getAuthHeadersAsync(): Promise<HttpHeaders> {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const token = await currentUser.getIdToken();
    
    return new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');
  }

  /**
   * สร้าง headers สำหรับการเรียก API (แบบ sync - deprecated)
   */
  private getAuthHeaders(): HttpHeaders {
    // ใช้ token จาก localStorage ถ้ามี (fallback)
    const firebaseToken = localStorage.getItem('firebaseToken');
    if (!firebaseToken) {
      throw new Error('Firebase token not found. Please use async methods instead.');
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
