import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import {
  DormCompareService,
  CompareDormItem,
} from '../../services/dorm-compare.service';
import {
  DormitoryService,
  DormDetail,
  RoomType,
} from '../../services/dormitory.service';
import { Subscription, forkJoin } from 'rxjs';

interface CompareDormData extends CompareDormItem {
  description: string;
  dailyPrice?: number;
  monthlyPrice?: number;
  termPrice?: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  ownerName: string;
  ownerPhone: string;
  ownerLineId?: string;
  distance: string;
  electricityCost: string;
  waterCost: string;
  roomTypes: RoomType[];
}

@Component({
  selector: 'app-dorm-compare',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './dorm-compare.component.html',
  styleUrls: ['./dorm-compare.component.css'],
})
export class DormCompareComponent implements OnInit, OnDestroy {
  compareDorms: CompareDormData[] = [];
  sortBy: string = 'rating';
  sortOrder: 'asc' | 'desc' = 'asc';
  isLoading: boolean = false;

  // Calculate column width based on number of dorms
  getColumnWidth(): string {
    const count = this.compareDorms.length;
    if (count <= 2) return 'w-1/2';
    if (count <= 3) return 'w-1/3';
    if (count <= 4) return 'w-1/4';
    if (count <= 5) return 'w-1/5';
    return 'w-1/6';
  }

  // Calculate table minimum width
  getTableMinWidth(): string {
    const count = this.compareDorms.length;
    const baseWidth = 200; // Width for first column (labels)
    const columnWidth = 150; // Width per dorm column
    const totalWidth = baseWidth + (count * columnWidth);
    return `${totalWidth}px`;
  }

  // Amenities lists
  internalAmenities = [
    // เครื่องใช้ไฟฟ้า
    'แอร์',
    'พัดลม',
    'TV',
    'ตู้เย็น',
    'ไมโครเวฟ',
    'เครื่องทำน้ำอุ่น',
    'เครื่องซักผ้า',
    // เฟอร์นิเจอร์
    'เตียงนอน',
    'ตู้เสื้อผ้า',
    'โต๊ะทำงาน',
    'โต๊ะเครื่องแป้ง',
    'โซฟา',
    'ซิงค์ล้างจาน',
    // ระบบรักษาความปลอดภัย
    'คีย์การ์ด',
    'กล้องวงจรปิด',
    // อื่น ๆ
    'อนุญาตให้เลี้ยงสัตว์',
    'ลิฟต์',
  ];

  externalAmenities = [
    'WIFI',
    'รปภ.',
    'ฟิตเนส',
    'ตู้กดน้ำ',
    'สระว่ายน้ำ',
    'ที่จอดรถ',
    'Lobby',
  ];

  private subscriptions: Subscription[] = [];

  Math = Math; // Make Math available in template

  constructor(
    private dormCompareService: DormCompareService,
    private dormitoryService: DormitoryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Set loading state immediately when component initializes
    this.isLoading = true;

    // Subscribe to compare IDs and load data from API
    const sub = this.dormCompareService.compareIds$.subscribe((ids) => {
      if (ids.length > 0) {
        this.loadCompareData(ids);
        // Set CSS variable for column count
        document.documentElement.style.setProperty('--dorm-count', ids.length.toString());
      } else {
        this.compareDorms = [];
        this.isLoading = false;
        document.documentElement.style.setProperty('--dorm-count', '3');
      }
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private loadCompareData(ids: number[]): void {
    this.isLoading = true;

    // จำลองการโหลดเพื่อให้เห็น skeleton (สำหรับ demo)
    // ใน production ให้เอาบรรทัดนี้ออก
    setTimeout(() => {
      // ใช้ API endpoint ใหม่ที่ดึงข้อมูลเปรียบเทียบทั้งหมดในครั้งเดียว
      this.dormitoryService.compareDormitories(ids).subscribe({
        next: (response) => {
          if (response.success && response.dormitories) {
            this.compareDorms = response.dormitories.map((dorm: any) => {
              // Map API response to CompareDormData format
              const priceRange = this.formatPriceRange(dorm.price_range);

              const mappedDorm = {
                id: dorm.id,
                name: dorm.name,
                image:
                  dorm.image_url ||
                  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
                price: priceRange.display,
                location: dorm.address,
                zone: dorm.zone?.name || 'ไม่ระบุโซน',
                description: dorm.description || 'ไม่มีคำอธิบาย',
                dailyPrice: this.extractDailyPrice(dorm.room_types),
                monthlyPrice: priceRange.min,
                termPrice: this.extractTermPrice(dorm.room_types),
                rating: dorm.avg_rating ? Number(dorm.avg_rating) : (dorm.rating?.average || 0),
                reviewCount: dorm.review_count ? Number(dorm.review_count) : (dorm.rating?.count || 0),
                amenities: dorm.amenities?.map((a: any) => a.name) || [],
                ownerName: 'เจ้าของหอพัก',
                ownerPhone: 'ติดต่อสอบถาม',
                distance: this.calculateDistance(
                  dorm.location?.lat,
                  dorm.location?.lng
                ),
                electricityCost: this.formatUtilityCost(
                  dorm.utilities?.electricity?.type,
                  dorm.utilities?.electricity?.rate
                ),
                waterCost: this.formatUtilityCost(
                  dorm.utilities?.water?.type,
                  dorm.utilities?.water?.rate
                ),
                roomTypes: dorm.room_types || [],
              };
              return mappedDorm;
            });

            this.sortDorms();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading compare data:', error);
          this.compareDorms = [];
          this.isLoading = false;
        },
      });
    }, 1500); // จำลองการโหลด 1.5 วินาที
  }

  private formatPriceRange(priceRange: any): {
    display: string;
    min?: number;
    max?: number;
  } {
    if (!priceRange || !priceRange.min) {
      return { display: 'ติดต่อสอบถาม' };
    }

    const min = priceRange.min;
    const max = priceRange.max;

    if (min === max) {
      return {
        display: `${min.toLocaleString()} บาท/เดือน`,
        min,
        max,
      };
    } else {
      return {
        display: `${min.toLocaleString()} - ${max.toLocaleString()} บาท/เดือน`,
        min,
        max,
      };
    }
  }

  private extractDailyPrice(roomTypes: any[]): number | undefined {
    if (!roomTypes || roomTypes.length === 0) return undefined;

    const dailyPrices = roomTypes
      .map((rt) => rt.daily_price)
      .filter((p): p is number => p != null && p > 0);

    return dailyPrices.length > 0 ? Math.min(...dailyPrices) : undefined;
  }

  private extractTermPrice(roomTypes: any[]): number | undefined {
    if (!roomTypes || roomTypes.length === 0) return undefined;

    const termPrices = roomTypes
      .map((rt) => rt.term_price || rt.summer_price)
      .filter((p): p is number => p != null && p > 0);

    return termPrices.length > 0 ? Math.min(...termPrices) : undefined;
  }

  private formatUtilityCost(type?: string, rate?: number | string): string {
    if (!type) return 'ไม่ระบุ';

    // Handle API response format
    if (type === 'คิดตามหน่วย' || type === 'per_unit') {
      return rate ? `${rate} บาท/หน่วย` : 'คิดตามหน่วย';
    } else if (type === 'รวมค่าเช่า' || type === 'included') {
      return 'รวมค่าเช่า';
    } else if (type === 'เหมาจ่าย' || type === 'fixed') {
      return rate ? `เหมาจ่าย ${rate} บาท/เดือน` : 'เหมาจ่าย';
    }

    return type;
  }

  private calculateDistance(lat?: number | null, lng?: number | null): string {
    // Simple placeholder - in real app, calculate from user's location
    if (!lat || !lng) return '-';

    // For now, return a placeholder
    return '-';
  }

  sortDorms(): void {
    this.compareDorms.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (this.sortBy) {
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'price':
          aValue = a.monthlyPrice || 0;
          bValue = b.monthlyPrice || 0;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          return 0;
      }

      if (this.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  onSortChange(): void {
    this.sortDorms();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortDorms();
  }

  goBack(): void {
    this.router.navigate(['/main']);
  }

  viewDormDetail(dormId: number): void {
    this.router.navigate(['/dorm-detail', dormId]);
  }

  removeFromCompare(dormId: number): void {
    this.dormCompareService.removeFromCompare(dormId);
  }

  clearAll(): void {
    this.dormCompareService.clearAllCompare();
  }

  getStars(rating: number): { filled: boolean }[] {
    const stars: { filled: boolean }[] = [];
    const actualRating = rating || 0;

    for (let i = 1; i <= 5; i++) {
      stars.push({ filled: i <= actualRating });
    }

    return stars;
  }

  getElectricityCost(dorm: CompareDormData): string {
    return dorm.electricityCost || 'ไม่ระบุ';
  }

  getWaterCost(dorm: CompareDormData): string {
    return dorm.waterCost || 'ไม่ระบุ';
  }

  getAmenityIcon(amenity: string): string {
    const iconMap: { [key: string]: string } = {
      แอร์: 'fa-snowflake',
      พัดลม: 'fa-fan',
      TV: 'fa-tv',
      เครื่องทำน้ำอุ่น: 'fa-hot-tub',
      ตู้เย็น: 'fa-igloo',
      ตู้เสื้อผ้า: 'fa-tshirt',
      เตียงนอน: 'fa-bed',
      โต๊ะทำงาน: 'fa-desktop',
      โต๊ะเครื่องแป้ง: 'fa-solid fa-wand-magic-sparkles',
      โซฟา: 'fa-couch',
      ซิงค์ล้างจาน: 'fa-sink',
      ไมโครเวฟ: 'fa-microphone',
      อนุญาตให้เลี้ยงสัตว์: 'fa-paw',
      เครื่องซักผ้า: 'fa-tshirt',
      คีย์การ์ด: 'fa-key',
      กล้องวงจรปิด: 'fa-video',
      ลิฟต์: 'fa-elevator',
      WIFI: 'fa-wifi',
      'รปภ.': 'fa-shield-alt',
      ฟิตเนส: 'fa-dumbbell',
      ตู้กดน้ำหยอดเหรียญ: 'fa-tint',
      สระว่ายน้ำ: 'fa-swimming-pool',
      ที่จอดรถ: 'fa-car',
      Lobby: 'fa-building',
    };
    return iconMap[amenity] || 'fa-list';
  }

  hasAmenity(dorm: CompareDormData, amenity: string): boolean {
    return dorm.amenities.includes(amenity);
  }

  // Helper methods for skeleton
  getSkeletonArray(count: number): number[] {
    return Array(count)
      .fill(0)
      .map((_, i) => i + 1);
  }

  getSkeletonColumns(): number[] {
    return this.getSkeletonArray(5); // Default 5 columns for skeleton
  }

  // Format date to Thai format
  formatThaiDate(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const thaiMonths = [
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม',
    ];

    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist Era

    return `${day} ${month} ${year}`;
  }

  // Handle image load error
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      // Container จะแสดง fallback icon ผ่าน CSS ::before
    }
  }

  // Handle image load success
  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'block';
    }
  }
}
