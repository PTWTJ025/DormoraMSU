import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// เก็บเฉพาะ ID ของหอพักที่ต้องการเปรียบเทียบ
// ข้อมูลจริงจะดึงจาก API เมื่อเข้าหน้าเปรียบเทียบ
export interface CompareDormItem {
  id: number;
  name: string;
  image: string;
  price: string;
  location: string;
  zone: string;
}

@Injectable({
  providedIn: 'root'
})
export class DormCompareService {
  private readonly STORAGE_KEY = 'dorm_compare_ids';
  private readonly MAX_COMPARE_ITEMS = 5;
  
  // เก็บเฉพาะ IDs ของหอพักที่เลือก
  public compareIds$ = new BehaviorSubject<number[]>([]);
  // เก็บข้อมูลพื้นฐานสำหรับแสดงใน popup (optional)
  public compareItems$ = new BehaviorSubject<CompareDormItem[]>([]);
  public showComparePopup$ = new BehaviorSubject<boolean>(false);

  constructor() {
    // โหลดข้อมูลจาก localStorage เมื่อ service เริ่มทำงาน
    this.loadFromStorage();
    
    // ล้างข้อมูลเก่าที่อาจมีปัญหา (ถ้าต้องการ)
    // this.clearStorage();
  }

  /**
   * เพิ่มหอพักเข้าสู่รายการเปรียบเทียบ
   */
  addToCompare(dormItem: CompareDormItem): boolean {
    const currentIds = this.compareIds$.value;
    const currentItems = this.compareItems$.value;
    
    // ตรวจสอบว่ามีอยู่แล้วหรือไม่
    if (currentIds.includes(dormItem.id)) {
      console.log('[DormCompareService] หอพักนี้อยู่ในรายการเปรียบเทียบแล้ว');
      return false;
    }
    
    // ตรวจสอบจำนวนสูงสุด
    if (currentIds.length >= this.MAX_COMPARE_ITEMS) {
      console.log('[DormCompareService] ไม่สามารถเพิ่มได้เกิน 5 หอพัก');
      return false;
    }
    
    // เพิ่มหอพักใหม่
    const newIds = [...currentIds, dormItem.id];
    const newItems = [...currentItems, dormItem];
    
    this.compareIds$.next(newIds);
    this.compareItems$.next(newItems);
    this.saveToStorage(newIds, newItems);
    
    // แสดง popup ทันทีเมื่อเพิ่มหอพัก
    this.showComparePopup$.next(true);
    
    console.log('[DormCompareService] เพิ่มหอพักเข้าสู่รายการเปรียบเทียบ:', dormItem.name);
    return true;
  }

  /**
   * ลบหอพักออกจากรายการเปรียบเทียบ
   */
  removeFromCompare(dormId: number): void {
    const currentIds = this.compareIds$.value;
    const currentItems = this.compareItems$.value;
    
    const newIds = currentIds.filter(id => id !== dormId);
    const newItems = currentItems.filter(item => item.id !== dormId);
    
    this.compareIds$.next(newIds);
    this.compareItems$.next(newItems);
    this.saveToStorage(newIds, newItems);
    
    // ถ้าไม่มีหอพักเหลือแล้ว ให้ซ่อน popup
    if (newIds.length === 0) {
      this.showComparePopup$.next(false);
    }
    
    console.log('[DormCompareService] ลบหอพักออกจากรายการเปรียบเทียบ:', dormId);
  }

  /**
   * ลบหอพักทั้งหมดออกจากการเปรียบเทียบ
   */
  clearAllCompare(): void {
    this.compareIds$.next([]);
    this.compareItems$.next([]);
    this.saveToStorage([], []);
    this.showComparePopup$.next(false);
    
    console.log('[DormCompareService] ล้างรายการเปรียบเทียบทั้งหมด');
  }

  /**
   * ตรวจสอบว่าหอพักอยู่ในรายการเปรียบเทียบหรือไม่
   */
  isInCompare(dormId: number): boolean {
    return this.compareIds$.value.includes(dormId);
  }

  /**
   * ตรวจสอบว่าสามารถเพิ่มหอพักได้อีกหรือไม่
   */
  canAddMore(): boolean {
    return this.compareIds$.value.length < this.MAX_COMPARE_ITEMS;
  }

  /**
   * ตรวจสอบว่ามีหอพักเพียงพอสำหรับเปรียบเทียบหรือไม่ (ขั้นต่ำ 2 หอพัก)
   */
  canCompare(): boolean {
    return this.compareIds$.value.length >= 2;
  }
  
  /**
   * ดึง IDs ของหอพักที่เลือกเปรียบเทียบ
   */
  getCompareIds(): number[] {
    return this.compareIds$.value;
  }

  /**
   * ซ่อน popup
   */
  hideComparePopup(): void {
    this.showComparePopup$.next(false);
  }

  /**
   * แสดง popup
   */
  showComparePopup(): void {
    if (this.compareItems$.value.length > 0) {
      this.showComparePopup$.next(true);
    }
  }

  /**
   * ล้างข้อมูล localStorage ทั้งหมด (สำหรับแก้ไขปัญหา)
   */
  clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('dorm_compare_items');
      this.compareIds$.next([]);
      this.compareItems$.next([]);
      this.showComparePopup$.next(false);
      console.log('[DormCompareService] ล้างข้อมูล localStorage เรียบร้อย');
    } catch (error) {
      console.error('[DormCompareService] Error clearing localStorage:', error);
    }
  }

  /**
   * บันทึกข้อมูลลง localStorage
   */
  private saveToStorage(ids: number[], items: CompareDormItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
      // เก็บข้อมูลพื้นฐานไว้สำหรับแสดงใน popup (optional)
      localStorage.setItem('dorm_compare_items', JSON.stringify(items));
    } catch (error) {
      console.error('[DormCompareService] Error saving to localStorage:', error);
    }
  }

  /**
   * โหลดข้อมูลจาก localStorage
   */
  private loadFromStorage(): void {
    try {
      const storedIds = localStorage.getItem(this.STORAGE_KEY);
      const storedItems = localStorage.getItem('dorm_compare_items');
      
      if (storedIds) {
        const ids = JSON.parse(storedIds);
        this.compareIds$.next(ids);
        
        // โหลดข้อมูลพื้นฐานถ้ามี
        if (storedItems) {
          const items = JSON.parse(storedItems);
          this.compareItems$.next(items);
        }
        
        // ถ้ามีข้อมูล ให้แสดง popup
        if (ids.length > 0) {
          this.showComparePopup$.next(true);
        }
      }
    } catch (error) {
      console.error('[DormCompareService] Error loading from localStorage:', error);
    }
  }
}
