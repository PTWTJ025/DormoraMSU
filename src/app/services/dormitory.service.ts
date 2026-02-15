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
  monthly_price?: string;
  daily_price?: string;
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

export interface RoomType {
  room_type_id: number;
  // Backend currently does not return dorm_id in room types response
  // so make it optional to prevent undefined typing issues
  dorm_id?: number;
  // Backend returns room_name; keep both for compatibility
  name?: string;
  room_name?: string;
  bed_type: string;
  size_sqm?: number;
  monthly_price?: number;
  daily_price?: number;
  term_price?: number;
  summer_price?: number;
  // price_type removed: backend calculates from numeric prices
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DormDetail extends Dorm {
  manager_name: string;
  manager_phone?: string;
  primary_phone?: string; // Added field from API
  manager_line?: string;
  line_id?: string; // Added field from API
  water_bill?: string;
  water_rate?: string; // Added field from API
  water_type?: string; // Added field from API
  electric_bill?: string;
  electricity_rate?: string; // Added field from API
  electricity_type?: string; // Added field from API
  description?: string;
  dorm_description?: string; // Added field from API
  status_dorm?: string; // สถานะหอพัก: 'ว่าง' หรือ 'เต็ม'
  statusDorm?: string; // สถานะหอพัก (camelCase)
  
  // Owner contact information
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_secondary_phone?: string;
  owner_line_id?: string;
  owner_manager_name?: string;
  owner_photo_url?: string;
  
  images: { image_id?: number; dorm_id?: number; image_url: string; image_type?: string; is_primary?: boolean; upload_date?: string }[];
  amenities: { 
    dorm_amenity_id?: number; 
    dorm_id?: number;
    amenity_id?: number;
    name: string; 
    is_available: boolean;
    amenity_name?: string; // Alternative field name
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
  // Short-lived cache for eligibility checks (key: `${dormId}:${userId}`)
  private eligibilityCache = new Map<string, { value: {canReview: boolean, message?: string}, expiresAt: number }>();
  private readonly eligibilityTtlMs = 5 * 60 * 1000; // 5 minutes

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
  
  /** Get room types for a specific dormitory */
  getRoomTypes(dormId: number): Observable<RoomType[]> {
    // moved to new base: /edit-dormitory
    return this.http.get<any[]>(`${this.backendUrl}/edit-dormitory/${dormId}/room-types`).pipe(
      // Normalize backend fields so frontend can always use rt.name
      map((rows: any[]) => {
        const safeRows = Array.isArray(rows) ? rows : [];
        return safeRows.map((rt: any) => ({
          ...rt,
          // prefer explicit name, otherwise map from room_name
          name: rt?.name ?? rt?.room_name ?? '',
          // accept missing dorm_id - backend doesn't send it in this endpoint
          dorm_id: rt?.dorm_id,
        })) as RoomType[];
      }),
      tap((resp) => {
        console.log(`[DormitoryService] GET /edit-dormitory/${dormId}/room-types ->`, resp);
      }),
      catchError(err => {
        console.error(`[DormitoryService] Error fetching room types for dorm ${dormId}:`, err);
        return of([]);
      })
    );
  }
  
  /** Add a new room type */
  addRoomType(dormId: number, roomType: Partial<RoomType>): Observable<RoomType> {
    return this.http.post<RoomType>(`${this.backendUrl}/add-dormitory/${dormId}/room-types`, roomType);
  }

  /** Add a new room type (edit flow) - ตามสเปคใหม่ */
  addRoomTypeForEdit(dormId: number, roomType: Partial<RoomType>): Observable<RoomType> {
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
          this.http.post<RoomType>(`${this.backendUrl}/edit-dormitory/${dormId}/room-types`, roomType, { headers })
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
  
  /** Add multiple room types in one request (bulk) */
  addRoomTypesBulk(dormId: number, roomTypes: Array<Partial<RoomType>>): Observable<any> {
    return this.http.post(`${this.backendUrl}/add-dormitory/${dormId}/room-types/bulk`, { room_types: roomTypes });
  }
  
  /** Update a room type - ตามสเปคใหม่ */
  updateRoomType(roomTypeId: number, roomType: Partial<RoomType>): Observable<RoomType> {
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
          this.http.put<RoomType>(`${this.backendUrl}/edit-dormitory/room-types/${roomTypeId}`, roomType, { headers })
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
  
  /** Delete a room type - ตามสเปคใหม่ */
  deleteRoomType(roomTypeId: number): Observable<any> {
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
          this.http.delete(`${this.backendUrl}/edit-dormitory/room-types/${roomTypeId}`, { headers })
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
    return this.http.get<{ total: number; amenities: Amenity[] }>(`${this.backendUrl}/dormitories/amenities/all`).pipe(
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
    return this.http.get<any>(`${this.backendUrl}/dormitories/map/all`).pipe(
      map(response => {
        // Handle new API response format
        const dorms = response.dormitories || [];
        const mappedDorms = dorms.map((dorm: any) => ({
          dorm_id: dorm.id,
          dorm_name: dorm.name,
          address: dorm.address,
          latitude: dorm.position?.lat || null,
          longitude: dorm.position?.lng || null,
          zone_name: dorm.zone,
          thumbnail_url: dorm.image_url,
          main_image_url: dorm.image_url,
          min_price: dorm.price_range?.min,
          max_price: dorm.price_range?.max,
          rating: dorm.avg_rating ? Number(dorm.avg_rating) : (dorm.rating?.average || 0),
          price_display: dorm.price_range ? 
            `${dorm.price_range.min.toLocaleString()} - ${dorm.price_range.max.toLocaleString()} บาท/เดือน` : 
            'ติดต่อสอบถาม'
        }));
        
        return {
          dormitories: mappedDorms,
          total: response.pagination?.total || mappedDorms.length
        };
      }),
      catchError(err => {
        console.error('[DormitoryService] Error fetching dormitories for map:', err);
        return of({ dormitories: [], total: 0 });
      })
    );
  }

  /** Get dormitory popup data for map */
  getDormitoryPopup(dormId: number): Observable<DormDetail> {
    return this.http.get<any>(`${this.backendUrl}/dormitories/map/popup/${dormId}`).pipe(
      map(response => {
        // Handle new API response format
        const dorm = response;
        return {
          dorm_id: dorm.id,
          dorm_name: dorm.name,
          address: dorm.address,
          dorm_description: dorm.description,
          latitude: dorm.position?.lat || null,
          longitude: dorm.position?.lng || null,
          zone_name: dorm.zone,
          thumbnail_url: dorm.image_url,
          main_image_url: dorm.image_url,
          min_price: dorm.price_range?.min,
          max_price: dorm.price_range?.max,
          rating: dorm.avg_rating ? Number(dorm.avg_rating) : (dorm.rating?.average || 0),
          price_display: dorm.price_range ? 
            `${dorm.price_range.min.toLocaleString()} - ${dorm.price_range.max.toLocaleString()} บาท/เดือน` : 
            'ติดต่อสอบถาม',
          // Add other required fields for DormDetail
          manager_name: 'เจ้าของหอพัก',
          images: dorm.image_url ? [{ image_url: dorm.image_url }] : [],
          amenities: []
        } as DormDetail;
      }),
      catchError(err => {
        console.error(`[DormitoryService] Error fetching dormitory popup for dorm ${dormId}:`, err);
        throw err;
      })
    );
  }

  /** Check if user can review this dormitory (with short-lived cache) */
  checkReviewEligibility(dormId: number, userId?: number | string): Observable<{canReview: boolean, message?: string}> {
    const cacheKey = `${dormId}:${userId ?? 'anon'}`;

    // Return cached value if valid
    const now = Date.now();
    const cached = this.eligibilityCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return of(cached.value);
    }

    return this.http.get<any>(`${this.backendUrl}/reviews/dormitory/${dormId}/eligibility`).pipe(
      map(response => ({
        canReview: response.can_review || response.canReview || false,
        message: response.reason || response.message
      })),
      tap(result => {
        this.eligibilityCache.set(cacheKey, { value: result, expiresAt: now + this.eligibilityTtlMs });
      }),
      catchError(err => {
        console.error(`[DormitoryService] Error checking review eligibility for dorm ${dormId}:`, err);
        return of({ canReview: false, message: 'ไม่สามารถตรวจสอบสิทธิ์การรีวิวได้' });
      })
    );
  }

  /** Get reviews for a dormitory */
  getDormitoryReviews(dormId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.backendUrl}/reviews/dormitory/${dormId}`).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error fetching reviews for dorm ${dormId}:`, err);
        return of([]);
      })
    );
  }

  /** Create a new review - ส่งเฉพาะ comment (AI จะทำการ auto-rating) */
  createReview(dormId: number, reviewData: {comment: string}): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/reviews/dormitory/${dormId}`, reviewData).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error creating review for dorm ${dormId}:`, err);
        throw err;
      })
    );
  }

  /** Update an existing review */
  updateReview(reviewId: number, reviewData: {comment: string}): Observable<any> {
    return this.http.put<any>(`${this.backendUrl}/reviews/${reviewId}`, reviewData).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error updating review ${reviewId}:`, err);
        throw err;
      })
    );
  }

  /** Delete a review */
  deleteReview(reviewId: number): Observable<any> {
    return this.http.delete<any>(`${this.backendUrl}/reviews/${reviewId}`).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error deleting review ${reviewId}:`, err);
        throw err;
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

  /** Unified filter method - รองรับการกรองทั้งเดี่ยวและรวม */
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
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    // Zone IDs
    if (params.zoneIds && params.zoneIds.length > 0) {
      httpParams = httpParams.set('zoneIds', params.zoneIds.join(','));
    }
    
    // Price range
    if (params.minPrice !== undefined) {
      httpParams = httpParams.set('minPrice', params.minPrice.toString());
    }
    if (params.maxPrice !== undefined) {
      httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
    }
    
    // Rent type
    if (params.daily !== undefined) {
      httpParams = httpParams.set('daily', params.daily.toString());
    }
    if (params.monthly !== undefined) {
      httpParams = httpParams.set('monthly', params.monthly.toString());
    }
    
    // Rating stars
    if (params.stars && params.stars.length > 0) {
      httpParams = httpParams.set('stars', params.stars.join(','));
    }
    
    // Amenities
    if (params.amenityIds && params.amenityIds.length > 0) {
      httpParams = httpParams.set('amenityIds', params.amenityIds.join(','));
      if (params.amenityMatch) {
        httpParams = httpParams.set('amenityMatch', params.amenityMatch);
      }
    }
    
    // Additional filters
    if (params.location) {
      httpParams = httpParams.set('location', params.location);
    }
    if (params.onlyAvailable !== undefined) {
      httpParams = httpParams.set('onlyAvailable', params.onlyAvailable.toString());
    }
    if (params.bedType) {
      httpParams = httpParams.set('bedType', params.bedType);
    }
    if (params.roomName) {
      httpParams = httpParams.set('roomName', params.roomName);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    
    // Pagination
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.offset) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }
    
    return this.http.get<any>(`${this.backendUrl}/dormitories/filter`, { params: httpParams }).pipe(
      map(response => {
        // Handle both array response and object wrapper response
        if (Array.isArray(response)) {
          return response;
        } else if (response && response.dormitories) {
          return response;
        } else {
          console.warn('Unexpected response format from filter API:', response);
          return { dormitories: [], total: 0, limit: 0, offset: 0 };
        }
      }),
      catchError(err => {
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