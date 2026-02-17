import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Zone {
  zone_id: number;
  zone_name: string;
  description?: string;
}

export interface Dorm {
  dorm_id: number;
  dorm_name: string;
  address: string;
  dorm_description?: string;  // Made optional to match DormDetail
  latitude: number | null;
  longitude: number | null;
  
  // เพิ่ม zone_name ที่ backend ส่งมา
  zone_name?: string;
  
  thumbnail_url?: string;
  price_display?: string;
  location_display?: string;
  updated_date?: string;
  rating?: number;
  
  // เพิ่มช่วงราคาใหม่สำหรับการแสดงราคาเป็นช่วง
  min_price?: number;
  max_price?: number;
  
  // UI alias fields (optional for template)
  image?: string;
  price?: string;
  name?: string;
  location?: string;
  date?: string;
  monthly_price?: number; // เปลี่ยนจาก string เป็น number
  daily_price?: number; // เปลี่ยนจาก string เป็น number
  main_image_url?: string;
  
  // เพิ่ม fields อื่นๆ ที่ backend ส่งมา (ตาม dormitoryController.js)
  bed_type?: string;
  rental_type?: string;
  electricity_type?: string;
  electricity_rate?: string;
  water_type?: string;
  water_rate?: string;
  approval_status?: string;
  
  // Contact info
  manager_name?: string;
  primary_phone?: string;
  secondary_phone?: string;
  line_id?: string;
  contact_email?: string;
}

export interface DormImage {
  image_id: number;
  image_url: string;
}


export interface DormDetail extends Dorm {
  // Contact information
  manager_name?: string;
  manager_phone?: string;
  primary_phone?: string;
  manager_line?: string;
  line_id?: string;
  
  // Owner contact information
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_secondary_phone?: string;
  owner_line_id?: string;
  owner_manager_name?: string;
  owner_photo_url?: string;
  
  // Pricing (ใช้ชื่อฟิลด์ตาม API)
  monthly_price?: number;
  daily_price?: number;
  summer_price?: number;
  deposit?: number;
  
  // Utilities (ใช้ชื่อฟิลด์ตาม API)
  electricity_price?: number;
  water_price?: number;
  water_price_type?: 'per_unit' | 'flat_rate';
  
  // Legacy fields (backward compatibility)
  water_bill?: string;
  water_rate?: string;
  water_type?: string;
  electric_bill?: string;
  electricity_rate?: string;
  electricity_type?: string;
  
  // Description (ใช้ชื่อฟิลด์ตาม API)
  description?: string;
  dorm_description?: string; // Legacy field
  room_type?: string;
  
  // Status
  status_dorm?: string; // สถานะหอพัก: 'ว่าง' หรือ 'เต็ม'
  statusDorm?: string; // สถานะหอพัก (camelCase)
  
  // Images and amenities
  images: { image_id?: number; dorm_id?: number; image_url: string; image_type?: string; is_primary?: boolean; upload_date?: string }[];
  amenities: { 
    dorm_amenity_id?: number; 
    dorm_id?: number;
    amenity_id?: number;
    name?: string; 
    amenity_name?: string; // ชื่อฟิลด์ที่ API ส่งมา
    is_available?: boolean;
  }[];
}

export interface Amenity {
  amenity_id: number;
  name: string;
  amenity_type?: 'standard' | 'custom';
  category?: string;
  is_active?: boolean;
  description?: string;
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class DormitoryService {
  private backendUrl = environment.backendApiUrl;

  constructor(private http: HttpClient) {}

  /** Get random recommended dormitories with better logic */
  getRecommended(limit?: number): Observable<Dorm[]> {
    let params = new HttpParams();
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    
    // ใช้ API ที่มีอยู่ แต่เพิ่มการเรียงลำดับตามคะแนนและความนิยม
    return this.http.get<any>(`${this.backendUrl}/dormitories/recommended`, { params }).pipe(
      map(resp => {
        const dorms = Array.isArray(resp) ? resp : (resp.dormitories ?? []);
        
        // เรียงลำดับตามเกณฑ์ที่สมเหตุสมผล:
        // 1. คะแนนรีวิวสูง (rating >= 4.0)
        // 2. มีรูปภาพ (thumbnail_url หรือ main_image_url)
        // 3. ราคาไม่แพงเกินไป (ราคาเฉลี่ย <= 8000 บาท)
        return dorms.sort((a: any, b: any) => {
          // คำนวณคะแนนความน่าสนใจ
          const scoreA = this.calculateRecommendationScore(a);
          const scoreB = this.calculateRecommendationScore(b);
          
          return scoreB - scoreA; // เรียงจากคะแนนสูงไปต่ำ
        });
      })
    );
  }
  
  /** คำนวณคะแนนความน่าสนใจสำหรับการแนะนำ */
  private calculateRecommendationScore(dorm: any): number {
    let score = 0;
    
    // 1. คะแนนรีวิว (40% ของคะแนนรวม)
    const rating = dorm.avg_rating || dorm.rating || 0;
    score += (rating / 5) * 40;
    
    // 2. มีรูปภาพ (20% ของคะแนนรวม)
    if (dorm.thumbnail_url || dorm.main_image_url) {
      score += 20;
    }
    
    // 3. ราคาเหมาะสม (25% ของคะแนนรวม)
    const avgPrice = this.calculateAveragePrice(dorm);
    if (avgPrice > 0) {
      // ราคา 3000-6000 บาท ได้คะแนนเต็ม
      // ราคาต่ำกว่า 3000 หรือสูงกว่า 10000 ได้คะแนนน้อย
      if (avgPrice >= 3000 && avgPrice <= 6000) {
        score += 25;
      } else if (avgPrice >= 2000 && avgPrice <= 8000) {
        score += 15;
      } else if (avgPrice >= 1000 && avgPrice <= 10000) {
        score += 10;
      }
    }
    
    // 4. ข้อมูลครบถ้วน (15% ของคะแนนรวม)
    let completeness = 0;
    if (dorm.dorm_name && dorm.dorm_name.trim()) completeness += 5;
    if (dorm.address && dorm.address.trim()) completeness += 3;
    if (dorm.zone_name && dorm.zone_name.trim()) completeness += 3;
    if (dorm.dorm_description && dorm.dorm_description.trim()) completeness += 2;
    if (dorm.latitude && dorm.longitude) completeness += 2;
    
    score += completeness;
    
    return score;
  }
  
  /** คำนวณราคาเฉลี่ย */
  private calculateAveragePrice(dorm: any): number {
    if (dorm.min_price && dorm.max_price) {
      return (Number(dorm.min_price) + Number(dorm.max_price)) / 2;
    } else if (dorm.monthly_price) {
      return Number(dorm.monthly_price);
    }
    return 0;
  }

  /** Get latest updated dormitories (sorted by updated_date DESC) */
  getLatest(limit?: number): Observable<Dorm[]> {
    let params = new HttpParams();
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<any>(`${this.backendUrl}/dormitories/latest`, { params }).pipe(
      map(resp => Array.isArray(resp) ? resp : (resp.dormitories ?? []))
    );
  }

  getImages(dormId: number): Observable<DormImage[]> {
    // moved to new base: /edit-dormitory
    return this.http.get<DormImage[]>(`${this.backendUrl}/edit-dormitory/${dormId}/images`).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error fetching images for dorm ${dormId}:`, err);
        return of([]);
      })
    );
  }

  /** Get images for edit (Edit flow) - ตามสเปคใหม่ */
  getImagesForEdit(dormId: number): Observable<DormImage[]> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) {
            subscriber.error(new Error('กรุณาเข้าสู่ระบบ'));
            return;
          }
          const token = await currentUser.getIdToken();
          const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
          this.http.get<DormImage[]>(`${this.backendUrl}/edit-dormitory/${dormId}/images`, { headers })
            .pipe(
              catchError(err => {
                console.error(`[DormitoryService] Error fetching images for edit dorm ${dormId}:`, err);
                return of([]);
              })
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      // teardown
      return () => {};
    });
  }
  
  /** Get all amenities from the database */
  getAllAmenities(): Observable<Amenity[]> {
    return this.http.get<{ total: number; amenities: Amenity[] }>(`${this.backendUrl}/dormitories/amenities`).pipe(
      map(response => response.amenities || []),
      catchError(err => {
        console.error('[DormitoryService] Error fetching all amenities:', err);
        return of([]);
      })
    );
  }
  /** Get list of amenity names from backend (for filter UI) */
  getAmenitiesList(): Observable<string[]> {
    return this.http.get<string[]>(`${this.backendUrl}/dormitories/amenities`).pipe(
      catchError(err => {
        console.error('[DormitoryService] Error fetching amenities list:', err);
        return of([]);
      })
    );
  }

  // ดึงรายการหอพักทั้งหมด
  getAllDormitories(params?: {
    zone_id?: number;
    min_price?: number;
    max_price?: number;
    limit?: number;
    offset?: number;
  }): Observable<Dorm[]> {
    let httpParams = new HttpParams();
    
    if (params?.zone_id) {
      httpParams = httpParams.set('zone_id', params.zone_id.toString());
    }
    if (params?.min_price) {
      httpParams = httpParams.set('min_price', params.min_price.toString());
    }
    if (params?.max_price) {
      httpParams = httpParams.set('max_price', params.max_price.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.offset) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }
    
    return this.http.get<Dorm[]>(`${this.backendUrl}/dormitories`, { params: httpParams });
  }

  // ดึงรายละเอียดหอพักตาม ID
  getDormitoryById(dormId: number): Observable<DormDetail> {
    return this.http.get<DormDetail>(`${this.backendUrl}/dormitories/${dormId}`).pipe(
      map(dorm => {
        // Convert coordinates to numbers
        if (dorm.latitude) {
          dorm.latitude = typeof dorm.latitude === 'string' ? parseFloat(dorm.latitude) : dorm.latitude;
        }
        if (dorm.longitude) {
          dorm.longitude = typeof dorm.longitude === 'string' ? parseFloat(dorm.longitude) : dorm.longitude;
        }
        return dorm;
      })
    );
  }

  /** Get all zones */
  getAllZones(): Observable<Zone[]> {
    return this.http.get<Zone[]>(`${this.backendUrl}/zones`).pipe(
      catchError(err => {
        console.error('[DormitoryService] Error fetching zones:', err);
        return of([]);
      })
    );
  }

  // Map API endpoints
  /** Get all dormitories for map display with coordinates */
  getAllDormitoriesForMap(): Observable<{dormitories: Dorm[], total: number}> {
    // ใช้ endpoint /dormitories ปกติ แล้ว map ให้เหมาะกับการแสดงบนแผนที่
    return this.http.get<any>(`${this.backendUrl}/dormitories`).pipe(
      map((response: any) => {
        // รองรับทั้งกรณี backend ส่งมาเป็น array ตรง ๆ หรือห่อใน object
        const dorms: any[] = Array.isArray(response)
          ? response
          : response?.dormitories || [];

        const mappedDorms: Dorm[] = (dorms || []).map((d: any) => {
          // แปลง latitude / longitude ให้เป็น number เสมอ
          let lat: number | null = d.latitude ?? null;
          let lng: number | null = d.longitude ?? null;

          if (typeof lat === 'string') {
            const parsed = parseFloat(lat);
            lat = Number.isNaN(parsed) ? null : parsed;
          }
          if (typeof lng === 'string') {
            const parsed = parseFloat(lng);
            lng = Number.isNaN(parsed) ? null : parsed;
          }

          return {
            dorm_id: d.dorm_id ?? d.id,
            dorm_name: d.dorm_name ?? d.name,
            address: d.address,
            latitude: lat,
            longitude: lng,
            zone_name: d.zone_name ?? d.zone,
            thumbnail_url: d.thumbnail_url || d.main_image_url || d.image_url,
            main_image_url: d.main_image_url || d.thumbnail_url || d.image_url,
            min_price: d.min_price,
            max_price: d.max_price,
            rating: d.avg_rating ? Number(d.avg_rating) : d.rating || 0,
            price_display:
              d.min_price && d.max_price
                ? `${Number(d.min_price).toLocaleString()} - ${Number(
                    d.max_price
                  ).toLocaleString()} บาท/เดือน`
                : d.price_display || 'ติดต่อสอบถาม',
          } as Dorm;
        });

        const total =
          (Array.isArray(response) ? response.length : response?.total) ??
          mappedDorms.length;

        return {
          dormitories: mappedDorms,
          total,
        };
      }),
      catchError((err) => {
        console.error(
          '[DormitoryService] Error fetching dormitories for map:',
          err
        );
        return of({ dormitories: [], total: 0 });
      })
    );
  }


  /** Compare dormitories - Get comparison data for multiple dormitories */
  compareDormitories(dormIds: number[]): Observable<any> {
    const idsParam = dormIds.join(',');
    return this.http.get<any>(`${this.backendUrl}/dormitories/compare?ids=${idsParam}`).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error comparing dormitories:`, err);
        throw err;
      })
    );
  }

  // ===== NEW UNIFIED FILTER API METHOD =====

  /** Search dormitories by name (autocomplete) */
  searchDormitories(query: string, limit: number = 10): Observable<{id: number, name: string}[]> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString());
    
    return this.http.get<any[]>(`${this.backendUrl}/dormitories/search`, { params }).pipe(
      catchError(err => {
        console.error('[DormitoryService] Error searching dormitories:', err);
        return of([]);
      })
    );
  }

  /** Unified filter method - map frontend filters -> backend /dormitories/filter */
  filterDormitories(params: {
    zoneIds?: number[];
    minPrice?: number;
    maxPrice?: number;
    daily?: boolean;
    monthly?: boolean;
    stars?: number[];
    amenityIds?: number[];
    amenityMatch?: 'any' | 'all';
    location?: string;
    onlyAvailable?: boolean;
    bedType?: string;
    roomName?: string;
    status?: string;
    limit?: number;
    offset?: number;
    // ใหม่: ส่งชื่อสิ่งอำนวยความสะดวกตามที่ backend ต้องการ
    amenities?: string | string[];
    // เผื่อกรณีมีการส่ง price_type/room_type ตรง ๆ
    price_type?: 'monthly' | 'daily';
    room_type?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();

    // --- โซน ---
    // Backend คาดหวัง zone_id (เดี่ยว) หรือจะรองรับ comma-separated ก็ได้
    if (params.zoneIds && params.zoneIds.length > 0) {
      httpParams = httpParams.set('zone_id', params.zoneIds.join(','));
    }

    // --- ช่วงราคา ---
    if (params.minPrice !== undefined && params.minPrice !== null) {
      httpParams = httpParams.set('min_price', params.minPrice.toString());
    }
    if (params.maxPrice !== undefined && params.maxPrice !== null) {
      httpParams = httpParams.set('max_price', params.maxPrice.toString());
    }

    // --- ประเภทค่าเช่า: monthly / daily ---
    let priceType = params.price_type;
    if (!priceType) {
      if (params.monthly && !params.daily) {
        priceType = 'monthly';
      } else if (params.daily && !params.monthly) {
        priceType = 'daily';
      }
    }
    if (priceType) {
      httpParams = httpParams.set('price_type', priceType);
    }

    // --- ประเภทห้อง (optional) ---
    if (params.room_type) {
      httpParams = httpParams.set('room_type', params.room_type);
    } else if (params.bedType) {
      // fallback: ใช้ bedType เป็น room_type ถ้า UI ยังใช้ชื่อเดิม
      httpParams = httpParams.set('room_type', params.bedType);
    }

    // --- สิ่งอำนวยความสะดวก (ชื่อ) ---
    let amenityNames: string[] = [];

    if (params.amenities) {
      if (Array.isArray(params.amenities)) {
        amenityNames = params.amenities;
      } else {
        amenityNames = params.amenities
          .split(',')
          .map((n) => n.trim())
          .filter((n) => n.length > 0);
      }
    }

    // หมายเหตุ: current implementation ใช้ชื่อ amenity จาก component อยู่แล้ว
    amenityNames.forEach((name) => {
      httpParams = httpParams.append('amenities', name);
    });

    // --- Pagination ---
    if (params.limit !== undefined && params.limit !== null) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.offset !== undefined && params.offset !== null) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }

    return this.http
      .get<any>(`${this.backendUrl}/dormitories/filter`, { params: httpParams })
      .pipe(
        map((response) => {
          // Handle both array response and object wrapper response
          if (Array.isArray(response)) {
            return response;
          } else if (response && response.dormitories) {
            return response;
          } else {
            console.warn(
              'Unexpected response format from filter API:',
              response
            );
            return { dormitories: [], total: 0, limit: 0, offset: 0 };
          }
        }),
        catchError((err) => {
          console.error('[DormitoryService] Error filtering dormitories:', err);
          return of({ dormitories: [], total: 0, limit: 0, offset: 0 });
        })
      );
  }

  /** Get amenity mapping for frontend */
  getAmenityMapping(): {[key: string]: number} {
    return {
      'aircon': 1,      // แอร์
      'fan': 2,         // พัดลม
      'tv': 3,          // TV
      'fridge': 4,      // ตู้เย็น
      'bed': 5,         // เตียงนอน
      'wifi': 6,        // WIFI
      'wardrobe': 7,    // ตู้เสื้อผ้า
      'desk': 8,        // โต๊ะทำงาน
      'microwave': 9,   // ไมโครเวฟ
      'waterHeater': 10, // เครื่องทำน้ำอุ่น
      'sink': 11,       // ซิงค์ล้างจาน
      'dressingTable': 12, // โต๊ะเครื่องแป้ง
      'cctv': 13,       // กล้องวงจรปิด
      'security': 14,   // รปภ.
      'elevator': 15,   // ลิฟต์
      'parking': 16,    // ที่จอดรถ
      'fitness': 17,    // ฟิตเนส
      'lobby': 18,      // Lobby
      'waterDispenser': 19, // ตู้น้ำหยอดเหรียญ
      'swimmingPool': 20,   // สระว่ายน้ำ
      'parcelShelf': 21,    // ที่วางพัสดุ
      'petsAllowed': 22,    // อนุญาตให้เลี้ยงสัตว์
      'keyCard': 23,        // คีย์การ์ด
      'washingMachine': 24  // เครื่องซักผ้า
    };
  }
} 