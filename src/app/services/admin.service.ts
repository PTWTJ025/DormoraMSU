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
  approval_status:
    | 'approved'
    | 'pending'
    | 'rejected'
    | 'อนุมัติ'
    | 'รออนุมัติ'
    | 'ไม่อนุมัติ';
  submitted_date: string;
  zone_name: string;
  main_image_url: string;
  thumbnail_url?: string;
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
    accommodation_type?: string;
    zone_id?: number;
    description?: string;
    room_type?: string;
    room_type_other?: string;
    min_price?: number;
    max_price?: number;
    monthly_price?: number;
    daily_price?: number;
    term_price?: number;
    summer_price?: number;
    deposit?: number;
    electricity_type: string;
    electricity_rate: number | null;
    water_type: string;
    water_rate: number | null;
    approval_status: string;
    status_dorm: string;
    zone_name: string;
    owner_username: string;
    owner_name: string;
    owner_email: string;
    owner_phone: string;
    manager_name?: string;
    primary_phone?: string;
    contact_email?: string;
    line_id?: string;
    owner_line_id?: string;
    electricity_price?: number;
    water_price_type?: string;
    water_price?: number;
    images?: Array<{
      image_id: number;
      image_url: string;
      is_primary: boolean;
      description: string;
    }>;
    room_types?: Array<{
      room_type_id: number;
      room_name: string;
      bed_type: string;
      monthly_price: number | null;
      daily_price: number | null;
      summer_price: number | null;
      term_price: number | null;
    }>;
    amenities?: {
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
  };
  // เพิ่มฟิลด์ระดับบนสุดเพื่อให้ template เข้าถึงได้ง่าย
  water_price?: number;
  water_price_type?: string;
  electricity_price?: number;
  images?: Array<{
    image_id: number;
    image_url: string;
    is_primary: boolean;
    description: string;
  }>;
  room_types?: Array<{
    room_type_id: number;
    room_name: string;
    bed_type: string;
    monthly_price: number | null;
    daily_price: number | null;
    summer_price: number | null;
    term_price: number | null;
  }>;
  amenities?: {
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
  providedIn: 'root',
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

    return this.http.post<AdminProfile>(
      `${this.backendUrl}/auth/admin-login`,
      {},
      { headers },
    );
  }

  /**
   * ดึงหอพักทั้งหมด (ทั้งอนุมัติและรออนุมัติ)
   */
  getAllDormitories(): Observable<Dormitory[]> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          this.http
            .get<any[]>(`${this.backendUrl}/admin/dormitories/all`, { headers })
            .subscribe({
              next: (data) => {
                // Map ข้อมูลเพื่อดึง main_image_url และ thumbnail_url
                const mappedData = data.map((dorm) => ({
                  ...dorm,
                  main_image_url: dorm.main_image_url || '',
                  thumbnail_url: dorm.main_image_url || '',
                }));
                subscriber.next(mappedData);
              },
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
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
          this.http
            .get<
              any[]
            >(`${this.backendUrl}/admin/dormitories/pending`, { headers })
            .subscribe({
              next: (data) => {
                // Map ข้อมูลเพื่อดึง main_image_url และ thumbnail_url
                const mappedData = data.map((dorm) => ({
                  ...dorm,
                  main_image_url: dorm.main_image_url || '',
                  thumbnail_url: dorm.main_image_url || '',
                }));
                subscriber.next(mappedData);
              },
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * ดึงเฉพาะหอพักที่ถูกปฏิเสธ
   */
  getRejectedDormitories(): Observable<Dormitory[]> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          this.http
            .get<
              any[]
            >(`${this.backendUrl}/admin/dormitories/rejected`, { headers })
            .subscribe({
              next: (data) => {
                // Map ข้อมูลเพื่อดึง main_image_url และ thumbnail_url
                const mappedData = data.map((dorm) => ({
                  ...dorm,
                  main_image_url: dorm.main_image_url || '',
                  thumbnail_url: dorm.main_image_url || '',
                }));
                subscriber.next(mappedData);
              },
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * Helper method: ดึง main image URL จาก images array
   */
  private extractMainImageUrl(images: any): string {
    // ถ้าไม่มี images หรือเป็น null
    if (!images) {
      return '';
    }

    // ถ้าเป็น array of objects
    if (Array.isArray(images)) {
      // หารูปที่เป็น primary ก่อน
      const primaryImage = images.find(
        (img) => img.is_primary === true || img.is_primary === 1,
      );
      if (primaryImage?.image_url) {
        return primaryImage.image_url;
      }

      // ถ้าไม่มี primary ให้เอารูปแรก
      if (images.length > 0 && images[0]?.image_url) {
        return images[0].image_url;
      }
    }

    // ถ้าเป็น string อยู่แล้ว
    if (typeof images === 'string') {
      return images;
    }

    return '';
  }

  /**
   * อนุมัติหอพัก
   */
  approveDormitory(dormId: string): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          this.http
            .put(
              `${this.backendUrl}/admin/dormitories/${dormId}/approval`,
              { status: 'approved' },
              { headers },
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
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
          this.http
            .put(
              `${this.backendUrl}/admin/dormitories/${dormId}/approval`,
              {
                status: 'rejected',
                rejection_reason: reason,
              },
              { headers },
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
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
          this.http
            .get<any>(`${this.backendUrl}/admin/dormitories/${dormId}`, {
              headers,
            })
            .subscribe({
              next: (data) => {
                // แปลง response format ให้ตรงกับ DormitoryDetail interface
                console.log('🔍 [AdminService] Raw API Response:', data);

                const detail: DormitoryDetail = {
                  dormitory: {
                    dorm_id: data.dorm_id || data.id,
                    dorm_name: data.dorm_name || data.name,
                    address: data.address,
                    dorm_description: data.dorm_description || data.description,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    accommodation_type: data.accommodation_type,
                    zone_id: data.zone_id,
                    description: data.description || data.dorm_description,
                    room_type: data.room_type,
                    room_type_other: data.room_type_other,
                    min_price: data.min_price,
                    max_price: data.max_price,
                    monthly_price: data.monthly_price || data.min_price,
                    daily_price: data.daily_price || data.term_price,
                    term_price: data.term_price || data.daily_price,
                    summer_price: data.summer_price,
                    deposit: data.deposit,
                    electricity_type: data.electricity_type || data.electricity_price_type,
                    electricity_rate: data.electricity_price,
                    water_type: data.water_type || data.water_price_type,
                    water_rate: data.water_price,
                    approval_status: data.approval_status,
                    status_dorm: data.status_dorm,
                    zone_name: data.zone_name,
                    owner_username: data.owner_username,
                    // แก้ไขการ mapping ให้ตรงกับ DB
                    owner_name: data.owner_name || data.manager_name || data.contact_name,
                    owner_email: data.owner_email || data.contact_email,
                    owner_phone: data.owner_phone || data.primary_phone || data.contact_phone,
                    owner_line_id: data.owner_line_id || data.line_id,
                    electricity_price: data.electricity_price,
                    water_price_type: data.water_price_type,
                    water_price: data.water_price,
                    images: data.images || [],
                    room_types: data.room_types || [],
                    amenities: data.amenities || []
                  },
                };

                console.log('✅ [AdminService] Processed Detail:', detail);
                subscriber.next(detail);
              },
              error: (err) => {
                subscriber.error(err);
              },
              complete: () => subscriber.complete(),
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * เพิ่มรูปภาพหอพักใหม่ (จาก draft URL)
   * POST /api/admin/dormitories/:dormId/images
   */
  addDormitoryImage(
    dormId: string | number,
    payload: { image_url: string; is_primary: boolean }
  ): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();

          this.http
            .post(
              `${this.backendUrl}/admin/dormitories/${dormId}/images`,
              payload,
              { headers }
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
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
  updateDormitoryApproval(
    dormId: string | number,
    payload: { status: string; rejectionReason?: string },
  ): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();

          // แปลง status เป็นรูปแบบที่ API ต้องการ
          const backendPayload: any = {
            status: payload.status === 'อนุมัติ' ? 'approved' : 'rejected',
          };

          if (payload.rejectionReason) {
            backendPayload.rejection_reason = payload.rejectionReason;
          }

          this.http
            .put(
              `${this.backendUrl}/admin/dormitories/${dormId}/approval`,
              backendPayload,
              { headers },
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
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
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          this.http
            .put(`${this.backendUrl}/admin/dormitories/${dormId}`, payload, {
              headers,
            })
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * ลบหอพัก
   */
  deleteDormitory(dormId: string, confirm: boolean = false): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          const params = confirm ? { confirm: 'true' } : {};
          this.http
            .delete(`${this.backendUrl}/admin/dormitories/${dormId}`, {
              headers,
              params: params as any,
            })
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
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
      throw new Error(
        'Firebase token not found. Please use async methods instead.',
      );
    }

    return new HttpHeaders()
      .set('Authorization', `Bearer ${firebaseToken}`)
      .set('Content-Type', 'application/json');
  }

  // ตรวจสอบสมาชิกในหอพักก่อนลบ
  checkDormitoryMembers(dormId: string | number): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          this.http
            .get(
              `${this.backendUrl}/admin/dormitories/${dormId}/check-members`,
              { headers },
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * ลบรูปภาพหอพัก
   */
  deleteDormitoryImage(
    dormId: string | number,
    imageId: number,
  ): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const headers = await this.getAuthHeadersAsync();
          this.http
            .delete(
              `${this.backendUrl}/admin/dormitories/${dormId}/images/${imageId}`,
              {
                headers,
              },
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  /**
   * ดึงรายการโซนทั้งหมด
   */
  getZones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.backendUrl}/zones`);
  }

  /**
   * ดึงรายการสิ่งอำนวยความสะดวกทั้งหมด
   */
  getAmenities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.backendUrl}/dormitories/amenities`);
  }
}
