import { Component, Directive, ElementRef, EventEmitter, HostListener, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { DormitoryService, Dorm as APIDorm, Zone } from '../../services/dormitory.service';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ComparePopupComponent } from '../shared/compare-popup/compare-popup.component';

// UI model used in template (all required)
interface UIDorm {
  id: number;
  image: string;
  price: string;
  dailyPrice?: string;
  monthlyPrice?: string;
  name: string;
  location: string;
  zone: string;
  date: string;
  rating: number;
}

@Component({
  selector: 'app-dorm-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FormsModule, RouterModule, ComparePopupComponent],
  templateUrl: './dorm-list.component.html',
  styleUrls: ['./dorm-list.component.css']
})
export class DormListComponent implements OnInit {
  // Filter variables
  showPriceFilter = false;
  showFilterPopup = false;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  filterMinPrice: number | null = null;
  filterMaxPrice: number | null = null;
  selectedZone: string = '';
  sortOrder: string = '';
  searchQuery: string = '';

  // Filter properties
  filters = {
    daily: false,
    monthly: false,
    rating5: false,
    rating4: false,
    rating3: false,
    rating2: false,
    rating1: false
  };

  // API filtering state
  isFiltering = false;
  
  // Current filter state
  currentFilters = {
    zoneIds: [] as number[],
    minPrice: null as number | null,
    maxPrice: null as number | null,
    daily: false,
    monthly: false,
    stars: [] as number[],
    amenityIds: [] as number[],
    amenityMatch: 'any' as 'any' | 'all'
  };

  // Amenities array - จะถูกโหลดจาก API
  amenities: { id: number; name: string; available: boolean; checked: boolean }[] = [];

  // Zone options
  zones: Zone[] = [];

  // All dorms and filtered dorms
  dorms: UIDorm[] = [];
  filteredDorms: UIDorm[] = [];
  recommendedDorms: UIDorm[] = [];
  latestDorms: UIDorm[] = [];
  isLoading = true;
  isRecommendedPage = false;

  // Pagination variables
  displayedDorms: UIDorm[] = [];
  showLoadMoreButton = false;
  private readonly ITEMS_PER_PAGE = 20;

  private pendingLoads = 0;

  // เพิ่มตัวแปรสำหรับ similar search
  similarSearchParams: any = null;

  constructor(
    private dormitoryService: DormitoryService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {
    this.loadZones();
    this.loadAmenities();
  }

  ngOnInit() {
    // รับ query parameters
    this.route.queryParams.subscribe(params => {
      // Check if this is recommended page
      if (params['type'] === 'recommended') {
        this.isRecommendedPage = true;
      }
      
      if (params['type'] === 'similar' && params['from'] === 'dorm-detail') {
        // เก็บพารามิเตอร์สำหรับการค้นหาหอพักที่คล้ายกัน
        this.similarSearchParams = {
          currentDormId: parseInt(params['currentDormId']) || 0,
          similarName: params['similarName'] || '',
          zone: params['zone'] || '',
          minPrice: parseInt(params['minPrice']) || null,
          maxPrice: parseInt(params['maxPrice']) || null,
          amenities: params['amenities'] ? params['amenities'].split(',') : []
        };
        
        // ตั้งค่าโซนที่เลือกตามข้อมูลที่ส่งมา
        if (this.similarSearchParams.zone) {
          this.selectedZone = this.similarSearchParams.zone;
        }
        
        // ตั้งค่าช่วงราคาตามข้อมูลที่ส่งมา
        if (this.similarSearchParams.minPrice && this.similarSearchParams.maxPrice) {
          // ขยายช่วงราคา ±20% เพื่อหาหอพักในราคาใกล้เคียง
          const priceRange = this.similarSearchParams.maxPrice - this.similarSearchParams.minPrice;
          const buffer = Math.max(priceRange * 0.2, 1000); // อย่างน้อย 1000 บาท
          
          this.minPrice = Math.max(0, this.similarSearchParams.minPrice - buffer);
          this.maxPrice = this.similarSearchParams.maxPrice + buffer;
        }
        
      }
      
      this.loadDormitories();
    });
  }

  goBack() {
    window.history.back();
  }

  loadZones() {
    this.dormitoryService.getAllZones().subscribe({
      next: (zones) => {
        this.zones = zones;
      },
      error: (error) => {
        console.error('Error fetching zones:', error);
      }
    });
  }

  loadAmenities() {
    // เรียก API ที่ถูกต้อง: GET /api/dormitories/amenities
    this.dormitoryService.getAmenitiesList().subscribe({
      next: (amenityNames: string[]) => {
        // Backend ส่งมาเป็น array ของชื่อ: ["แอร์", "พัดลม", "WIFI", ...]
        // แปลงเป็นรูปแบบที่ component ใช้
        this.amenities = amenityNames.map((name, index) => ({
          id: index + 1, // ใช้ index เป็น ID ชั่วคราว (ไม่สำคัญเพราะเราส่งชื่อไปหลังบ้าน)
          name: name,
          available: true,
          checked: false
        }));
      },
      error: (error) => {
        console.error('Error fetching amenities:', error);
        this.amenities = [];
      }
    });
  }

  loadDormitories() {
    this.isLoading = true;
    this.pendingLoads = 2;
    // ดึงข้อมูล recommended และ latest เหมือนใน main
    this.dormitoryService.getRecommended().subscribe({
      next: (recommended: APIDorm[]) => {
        this.recommendedDorms = recommended.map(d => this.mapDormToUi(d));
        this.dorms = [...this.recommendedDorms]; // ใช้ recommended เป็นฐานข้อมูลเริ่มต้น
        this.applyFilters();
        this.updateDisplayedDorms();
        this.markLoadDone();
      },
      error: (error) => {
        console.error('Error fetching recommended dorms:', error);
        this.markLoadDone();
      }
    });

    this.dormitoryService.getLatest().subscribe({
      next: (latest: APIDorm[]) => {
        this.latestDorms = latest.map(d => this.mapDormToUi(d));
        
        // รวม latest เข้ากับ dorms และกำจัดข้อมูลซ้ำโดยใช้ dorm_id
        const allDorms = [...this.dorms, ...this.latestDorms];
        const uniqueDorms = allDorms.filter((dorm, index, self) => 
          index === self.findIndex(d => d.id === dorm.id)
        );
        
        this.dorms = uniqueDorms;
        this.applyFilters();
        this.updateDisplayedDorms();
        this.markLoadDone();
      },
      error: (error) => {
        console.error('Error fetching latest dorms:', error);
        this.markLoadDone();
      }
    });
  }

  private markLoadDone() {
    this.pendingLoads = Math.max(0, this.pendingLoads - 1);
    if (this.pendingLoads === 0) {
      this.isLoading = false;
    }
  }

  private mapDormToUi(d: APIDorm): UIDorm {

    let priceDisplay = '';

    // จัดการราคารายเดือน
    if (d.min_price != null && d.max_price != null) {
      const minVal = Number(d.min_price);
      const maxVal = Number(d.max_price);
      priceDisplay = (minVal === maxVal)
        ? `${minVal.toLocaleString()} บาท/เดือน`
        : `${minVal.toLocaleString()} - ${maxVal.toLocaleString()} บาท/เดือน`;
    } else if (d.monthly_price != null) {
      priceDisplay = `${Number(d.monthly_price).toLocaleString()} บาท/เดือน`;
    }

    // เพิ่มราคารายวันในบรรทัดที่สอง (ถ้ามี)
    if (d.daily_price) {
      priceDisplay += `\n${d.daily_price.toLocaleString()} บาท/วัน`;
    }

    // Format location display
    let locationDisplay = d.location_display || d.address || '';
    if (d.zone_name) {
      locationDisplay = locationDisplay ? `${locationDisplay} (${d.zone_name})` : d.zone_name;
    }

    // ใช้ avg_rating จาก API ใหม่ หรือ fallback ไป rating เก่า
    // แปลง string เป็น number ก่อน
    const avgRating = (d as any).avg_rating;
    const finalRating = avgRating ? Number(avgRating) : (d.rating || 0.0);

    const rawDate =
      d.updated_date ||
      (d as any).updated_at ||
      (d as any).updatedAt ||
      (d as any).created_at ||
      (d as any).createdAt ||
      (d as any).submitted_date ||
      '';

    return {
      id: d.dorm_id,
      image: d.thumbnail_url || d.main_image_url || 'assets/images/photo.png',
      price: priceDisplay,
      name: d.dorm_name,
      location: locationDisplay,
      zone: d.zone_name || 'ไม่ระบุโซน',
      date: rawDate ? this.formatThaiDate(String(rawDate)) : '',
      rating: finalRating
    };
  }

  private loadImagesForList(list: UIDorm[]): void {
    list.forEach(dorm => {
      if (dorm.image) {
        const img = new Image();
        img.src = dorm.image;
      }
    });
  }

  getPriceHtml(price: string | undefined): string {
    if (!price) return '';

    const lines = price.split('\n');
    let html = '';

    if (lines[0]) {
      const monthlyMatch = lines[0].match(/([\d,]+)(\s*-\s*[\d,]+)?\s*(บาท\/เดือน)/);
      if (monthlyMatch) {
        if (monthlyMatch[2]) {
          const [_, start, range, unit] = monthlyMatch;
          html += `<div class="price-monthly">
            <span class="font-english">${start}</span>
            <span class="font-english">${range}</span>
            <span class="font-thai unit">${unit}</span>
          </div>`;
        } else {
          const [_, number, __, unit] = monthlyMatch;
          html += `<div class="price-monthly">
            <span class="font-english">${number}</span>
            <span class="font-thai unit">${unit}</span>
          </div>`;
        }
      }
    }

    if (lines[1]) {
      const dailyMatch = lines[1].match(/([\d,]+)\s*(บาท\/วัน)/);
      if (dailyMatch) {
        const [_, number, unit] = dailyMatch;
        html += `<div class="price-daily">
          <span class="font-english">${number}</span>
          <span class="font-thai unit">${unit}</span>
        </div>`;
      }
    }

    return html;
  }

  getSafePriceHtml(price: string | undefined): SafeHtml {
    const html = this.getPriceHtml(price);
    return this.sanitizer.sanitize(1, html) || '';
  }

  getStars(rating: number | undefined): { filled: boolean }[] {
    const stars: { filled: boolean }[] = [];
    const actualRating = rating || 0;
    
    for (let i = 1; i <= 5; i++) {
      stars.push({ filled: i <= actualRating });
    }
    
    return stars;
  }

  togglePriceFilter(event: Event) {
    event.stopPropagation();
    this.showPriceFilter = !this.showPriceFilter;
  }

  applyPriceFilterOld() {
    this.applyFilters();
    this.showPriceFilter = false;
  }

  filterByZone(zone: string) {
    this.selectedZone = zone;
    this.applyFilters();
  }

  applySelectedSort() {
    if (this.sortOrder === 'asc') {
      // เรียงราคาต่ำสุดไปสูงสุด
      this.filteredDorms.sort((a, b) => this.getDormPrice(a) - this.getDormPrice(b));
    } else if (this.sortOrder === 'desc') {
      // เรียงราคาสูงสุดไปต่ำสุด
      this.filteredDorms.sort((a, b) => this.getDormPrice(b) - this.getDormPrice(a));
    } else if (this.sortOrder === 'rating-desc') {
      // เรียงดาวสูงสุดไปต่ำสุด (UX best practice)
      this.filteredDorms.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (this.sortOrder === 'rating-asc') {
      // เรียงดาวต่ำสุดไปสูงสุด
      this.filteredDorms.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }
    this.updateDisplayedDorms();
  }

  getDormPrice(dorm: UIDorm): number {
    if (!dorm.price) return 0;
    
    // หาราคารายเดือนจาก price string
    // รูปแบบ: "5,000 บาท/เดือน" หรือ "5,000 - 10,000 บาท/เดือน"
    const monthlyMatch = dorm.price.match(/([\d,]+)(\s*-\s*([\d,]+))?\s*บาท\/เดือน/);
    
    if (monthlyMatch) {
      const minPrice = parseInt(monthlyMatch[1].replace(/,/g, '')) || 0;
      
      // ถ้ามีช่วงราคา ให้ใช้ราคาเฉลี่ย (สมเหตุสมผลกว่าการใช้ราคาต่ำสุด)
      if (monthlyMatch[3]) {
        const maxPrice = parseInt(monthlyMatch[3].replace(/,/g, '')) || 0;
        return Math.round((minPrice + maxPrice) / 2);
      }
      
      return minPrice;
    }
    
    // ถ้าไม่เจอราคารายเดือน ให้ลองหาตัวเลขแรก
    const fallbackMatch = dorm.price.match(/([\d,]+)/);
    return fallbackMatch ? parseInt(fallbackMatch[1].replace(/,/g, '')) : 0;
  }

  isInPriceRange(dorm: UIDorm): boolean {
    if (this.minPrice === null && this.maxPrice === null) {
      return true;
    }

    const dormPrice = this.getDormPrice(dorm);

    if (this.minPrice !== null && dormPrice < this.minPrice) {
      return false;
    }

    if (this.maxPrice !== null && dormPrice > this.maxPrice) {
      return false;
    }

    return true;
  }

  applyFilters(closePopup: boolean = true) {
    this.isFiltering = true;
    
    // ถ้าเป็นการค้นหาหอพักที่คล้ายกัน ให้ใช้ similar search
    if (this.similarSearchParams) {
      this.applySimilarFilters();
      return;
    }

    // เก็บ amenity IDs ที่ user เลือก
    this.currentFilters.amenityIds = this.amenities
      .filter(amenity => amenity.checked)
      .map(amenity => amenity.id);

    // เก็บราคาจาก filter popup
    if (this.filterMinPrice !== null) {
      this.currentFilters.minPrice = this.filterMinPrice;
    }
    if (this.filterMaxPrice !== null) {
      this.currentFilters.maxPrice = this.filterMaxPrice;
    }

    // เก็บประเภทการเช่า
    this.currentFilters.daily = this.filters.daily;
    this.currentFilters.monthly = this.filters.monthly;

    // ปิด filter popup ถ้า closePopup = true
    if (closePopup) {
      this.showFilterPopup = false;
    }

    // เรียก unified filter
    this.applyUnifiedFilter();
  }

  private applyAPIFilters() {
    // เริ่มต้นด้วย recommended dorms - ดึงทั้งหมดโดยไม่จำกัดจำนวน
    this.dormitoryService.getRecommended(1000).subscribe({
      next: (dorms: APIDorm[]) => {
        this.dorms = dorms.map(d => this.mapDormToUi(d));
        
        // กรองตามโซนที่เลือก (ถ้ามี)
        if (this.selectedZone && this.selectedZone !== '') {
          this.filteredDorms = this.dorms.filter(dorm => dorm.zone === this.selectedZone);
        } else {
          this.filteredDorms = [...this.dorms];
        }
        
        // เรียงลำดับตามที่เลือก
        if (this.sortOrder === 'asc') {
          this.filteredDorms.sort((a, b) => this.getDormPrice(a) - this.getDormPrice(b));
        } else if (this.sortOrder === 'desc') {
          this.filteredDorms.sort((a, b) => this.getDormPrice(b) - this.getDormPrice(a));
        } else if (this.sortOrder === 'rating-desc') {
          this.filteredDorms.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (this.sortOrder === 'rating-asc') {
          this.filteredDorms.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        }
        
        this.updateDisplayedDorms();
        this.isFiltering = false;
      },
      error: (error) => {
        console.error('Error fetching recommended dorms:', error);
        this.isFiltering = false;
      }
    });
  }

  // Method สำหรับกรองหอพักที่คล้ายกัน
  applySimilarFilters(): void {
    if (!this.similarSearchParams) return;

    let filtered = [...this.dorms];

    // 1. กรองออกหอพักปัจจุบัน
    filtered = filtered.filter(dorm => dorm.id !== this.similarSearchParams.currentDormId);

    // 2. ให้คะแนนความคล้าย และเรียงตามคะแนน
    const scoredDorms = filtered.map(dorm => ({
      ...dorm,
      similarityScore: this.calculateSimilarityScore(dorm)
    }));

    // เรียงตามคะแนนความคล้าย (สูงไปต่ำ)
    scoredDorms.sort((a, b) => b.similarityScore - a.similarityScore);

    // ส่งกลับเฉพาะหอพักที่มีคะแนนความคล้าย > 0
    this.filteredDorms = scoredDorms
      .filter(dorm => dorm.similarityScore > 0)
      .map(({ similarityScore, ...dorm }) => dorm); // เอา similarityScore ออก
    
    this.updateDisplayedDorms();
  }

  // คำนวณคะแนนความคล้าย
  calculateSimilarityScore(dorm: UIDorm): number {
    let score = 0;
    const params = this.similarSearchParams;

    // 1. โซนเดียวกัน (+30 คะแนน)
    if (dorm.zone === params.zone) {
      score += 30;
    }

    // 2. ชื่อหอพักที่คล้ายกัน (+20 คะแนน)
    if (params.similarName && dorm.name) {
      const similarity = this.calculateNameSimilarity(dorm.name, params.similarName);
      score += similarity * 20;
    }

    // 3. ราคาในช่วงใกล้เคียง (+25 คะแนน)
    if (params.minPrice && params.maxPrice) {
      const dormPrice = this.getDormPrice(dorm);
      const priceScore = this.calculatePriceSimilarity(dormPrice, params.minPrice, params.maxPrice);
      score += priceScore * 25;
    }

    // 4. สิ่งอำนวยความสะดวกที่คล้ายกัน (+25 คะแนน)
    // Note: ในปัจจุบันเราไม่มีข้อมูล amenities ใน UIDorm 
    // ถ้าต้องการใช้ต้องเพิ่มข้อมูลนี้ในอนาคต

    return score;
  }

  // คำนวณความคล้ายของชื่อ (Simple string similarity)
  calculateNameSimilarity(name1: string, name2: string): number {
    const str1 = name1.toLowerCase();
    const str2 = name2.toLowerCase();
    
    // ถ้ามีคำเดียวกัน
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let commonWords = 0;
    for (const word1 of words1) {
      if (word1.length > 2 && words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        commonWords++;
      }
    }
    
    return commonWords / Math.max(words1.length, words2.length);
  }

  // คำนวณความคล้ายของราคา
  calculatePriceSimilarity(dormPrice: number, minPrice: number, maxPrice: number): number {
    const midPrice = (minPrice + maxPrice) / 2;
    const priceRange = maxPrice - minPrice;
    
    // ถ้าราคาอยู่ในช่วง ให้คะแนนเต็ม
    if (dormPrice >= minPrice && dormPrice <= maxPrice) {
      return 1;
    }
    
    // คำนวณระยะห่างจากช่วงราคา
    const distance = Math.min(Math.abs(dormPrice - minPrice), Math.abs(dormPrice - maxPrice));
    const maxDistance = priceRange; // ระยะห่างสูงสุดที่ยังให้คะแนน
    
    return Math.max(0, 1 - (distance / maxDistance));
  }

  getDormsByZone(): Record<string, UIDorm[]> {
    const grouped: Record<string, UIDorm[]> = {};

    this.zones.forEach(zone => {
      grouped[zone.zone_name] = [];
    });

    this.dorms.forEach(dorm => {
      if (dorm.zone && grouped[dorm.zone]) {
        grouped[dorm.zone].push(dorm);
      }
    });

    return grouped;
  }

  getActiveZones(): string[] {
    const grouped = this.getDormsByZone();
    return Object.entries(grouped)
      .filter(([_, dorms]) => dorms.length > 0)
      .map(([zone]) => zone);
  }

  toggleFilterPopup(event: Event) {
    event.stopPropagation();
    this.showFilterPopup = !this.showFilterPopup;
    if (this.showFilterPopup) {
      this.showPriceFilter = false;
    }
  }

  clearPriceFilter() {
    this.minPrice = null;
    this.maxPrice = null;
    this.applyFilters();
    this.showPriceFilter = false;
  }

  clearFilters() {
    // Reset all filter properties
    this.filters = {
      daily: false,
      monthly: false,
      rating5: false,
      rating4: false,
      rating3: false,
      rating2: false,
      rating1: false
    };
    
    // Reset amenities
    this.amenities.forEach(amenity => {
      amenity.checked = false;
    });
    
    // Reset filter prices
    this.filterMinPrice = null;
    this.filterMaxPrice = null;
    
    // Reset zone selection
    this.selectedZone = '';
    
    // Reset sort order
    this.sortOrder = '';
    
    // Reset current filters
    this.currentFilters = {
      zoneIds: [],
      minPrice: null,
      maxPrice: null,
      daily: false,
      monthly: false,
      stars: [],
      amenityIds: [],
      amenityMatch: 'any'
    };
    
    // ส่ง false เพื่อไม่ปิด popup
    this.applyFilters(false);
  }

  toggleAmenity(amenity: any) {
    amenity.checked = !amenity.checked;
  }

  // ===== NEW API FILTERING METHODS =====

  /** Search dormitories by name (real-time filter) */
  onSearchInput(event: any) {
    const query = event.target.value.trim();
    this.searchQuery = query;
    
    // กรองหอพักแบบ real-time ตามชื่อที่พิมพ์
    this.applySearchFilter();
  }

  /** Submit search (Enter key or search button) */
  onSearchSubmit() {
    if (!this.searchQuery || this.searchQuery.trim().length === 0) {
      return;
    }

    // ใช้ API search เพื่อค้นหาหอพักที่ตรงกับคำค้นหา
    this.isFiltering = true;
    
    this.dormitoryService.searchDormitories(this.searchQuery.trim(), 50).subscribe({
      next: (results) => {
        if (results.length > 0) {
          // ถ้าพบผลลัพธ์ ให้โหลดข้อมูลหอพักเหล่านั้น
          const dormIds = results.map(r => r.id);
          this.loadDormitoriesByIds(dormIds);
        } else {
          // ถ้าไม่พบผลลัพธ์ ให้แสดงข้อความ
          this.filteredDorms = [];
          this.updateDisplayedDorms();
          this.isFiltering = false;
        }
      },
      error: (error) => {
        console.error('Error searching dormitories:', error);
        this.isFiltering = false;
      }
    });
  }

  /** Apply search filter based on search query */
  private applySearchFilter() {
    if (!this.searchQuery || this.searchQuery.length === 0) {
      // ถ้าไม่มีคำค้นหา ให้แสดงหอพักทั้งหมด
      this.applyAPIFilters();
      return;
    }

    // กรองหอพักที่มีชื่อตรงกับคำค้นหา
    let filteredDorms = this.dorms.filter(dorm => 
      dorm.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );

    // กรองตามโซนที่เลือก (ถ้ามี)
    if (this.selectedZone && this.selectedZone !== '') {
      filteredDorms = filteredDorms.filter(dorm => dorm.zone === this.selectedZone);
    }

    this.filteredDorms = filteredDorms;
    
    // เรียงลำดับตามที่เลือก
    if (this.sortOrder === 'asc') {
      this.filteredDorms.sort((a, b) => this.getDormPrice(a) - this.getDormPrice(b));
    } else if (this.sortOrder === 'desc') {
      this.filteredDorms.sort((a, b) => this.getDormPrice(b) - this.getDormPrice(a));
    } else if (this.sortOrder === 'rating-desc') {
      this.filteredDorms.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (this.sortOrder === 'rating-asc') {
      this.filteredDorms.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }
    
    this.updateDisplayedDorms();
  }


  /** Clear search and show all dorms */
  clearSearch() {
    this.searchQuery = '';
    this.applyAPIFilters(); // กลับไปแสดงหอพักทั้งหมด
  }

  /** Load dormitories by IDs from search results */
  private loadDormitoriesByIds(dormIds: number[]) {
    // โหลดข้อมูลหอพักทีละตัว (หรือใช้ batch API ถ้ามี)
    const loadPromises = dormIds.map(id => 
      this.dormitoryService.getDormitoryById(id).toPromise()
    );

    Promise.all(loadPromises).then((dorms: (APIDorm | undefined)[]) => {
      // กรองหอพักที่โหลดสำเร็จ
      const validDorms = dorms.filter((dorm): dorm is APIDorm => dorm !== null && dorm !== undefined);
      
      this.dorms = validDorms.map(d => this.mapDormToUi(d));
      this.filteredDorms = [...this.dorms];
      this.updateDisplayedDorms();
      this.isFiltering = false;
    }).catch((error) => {
      console.error('Error loading dormitories:', error);
      this.isFiltering = false;
    });
  }


  /** Apply rent type filter */
  applyRentTypeFilter() {
    // ไม่ต้องทำอะไร - จะถูกเรียกเมื่อกด "ตกลง" ใน applyFilters()
  }

  /** Apply rating filter */
  applyRatingFilter() {
    // TODO: Backend ยังไม่รองรับการกรองตามดาว
    console.warn('Rating filter is not yet supported by backend API');
    
    // Reset rating filters
    this.filters.rating5 = false;
    this.filters.rating4 = false;
    this.filters.rating3 = false;
    this.filters.rating2 = false;
    this.filters.rating1 = false;
  }

  /** Apply price filter */
  applyPriceFilter() {
    // ตรวจสอบความถูกต้องของราคา
    if (this.filterMinPrice !== null && this.filterMaxPrice !== null) {
      if (this.filterMinPrice > this.filterMaxPrice) {
        alert('ราคาต่ำสุดต้องไม่มากกว่าราคาสูงสุด');
        return;
      }
    }
    
    // ตรวจสอบว่าราคาเป็นจำนวนบวก
    if (this.filterMinPrice !== null && this.filterMinPrice < 0) {
      alert('ราคาต้องเป็นจำนวนบวก');
      return;
    }
    
    if (this.filterMaxPrice !== null && this.filterMaxPrice < 0) {
      alert('ราคาต้องเป็นจำนวนบวก');
      return;
    }
    
    // ไม่ต้องทำอะไร - จะถูกเรียกเมื่อกด "ตกลง" ใน applyFilters()
  }

  /** Apply amenities filter */
  applyAmenitiesFilter() {
    // ไม่ต้องทำอะไร - จะถูกเรียกเมื่อกด "ตกลง" ใน applyFilters()
  }

  /** Apply unified filter using the new API */
  private applyUnifiedFilter() {
    this.isFiltering = true;
    
    // เตรียมพารามิเตอร์สำหรับ unified filter - ดึงทั้งหมดโดยไม่จำกัดจำนวน
    const filterParams: any = {
      limit: 1000
    };

    // เพิ่มพารามิเตอร์ตามเงื่อนไขที่เลือก
    if (this.currentFilters.zoneIds.length > 0) {
      filterParams.zoneIds = this.currentFilters.zoneIds;
    }
    if (this.currentFilters.minPrice !== null) {
      filterParams.minPrice = this.currentFilters.minPrice;
    }
    if (this.currentFilters.maxPrice !== null) {
      filterParams.maxPrice = this.currentFilters.maxPrice;
    }
    if (this.currentFilters.daily) {
      filterParams.daily = true;
    }
    if (this.currentFilters.monthly) {
      filterParams.monthly = true;
    }
    
    // ไม่ส่ง stars ไป API เพราะ backend อาจกรองไม่ถูกต้องกับทศนิยม
    // เราจะกรองเองที่ client-side แทน
    
    // ส่งชื่อ amenities แทน IDs (ตามที่ backend ต้องการ)
    if (this.currentFilters.amenityIds.length > 0) {
      const selectedAmenityNames = this.amenities
        .filter(a => this.currentFilters.amenityIds.includes(a.id))
        .map(a => a.name);
      
      if (selectedAmenityNames.length > 0) {
        filterParams.amenities = selectedAmenityNames.join(',');
      }
    }

    this.dormitoryService.filterDormitories(filterParams).subscribe({
      next: (response) => {
        // Handle both array response and object wrapper response
        let dormitories: any[] = [];
        if (Array.isArray(response)) {
          dormitories = response;
        } else if (response && response.dormitories) {
          dormitories = response.dormitories;
        } else {
          console.error('Invalid response format:', response);
          dormitories = [];
        }
        
        this.dorms = dormitories.map(d => this.mapDormToUi(d));
        
        // กรองตามโซนที่เลือก (ถ้ามี)
        if (this.selectedZone && this.selectedZone !== '') {
          this.filteredDorms = this.dorms.filter(dorm => dorm.zone === this.selectedZone);
        } else {
          this.filteredDorms = [...this.dorms];
        }
        
        // กรองตามดาวที่เลือก (Client-side) - ใช้ Math.floor เพื่อจับคู่ทศนิยม
        if (this.currentFilters.stars.length > 0) {
          this.filteredDorms = this.filteredDorms.filter(dorm => {
            const dormStarLevel = Math.floor(dorm.rating || 0); // 4.5 -> 4, 3.8 -> 3
            return this.currentFilters.stars.includes(dormStarLevel);
          });
        }
        
        // เรียงลำดับตามที่เลือก
        if (this.sortOrder === 'asc') {
          this.filteredDorms.sort((a, b) => this.getDormPrice(a) - this.getDormPrice(b));
        } else if (this.sortOrder === 'desc') {
          this.filteredDorms.sort((a, b) => this.getDormPrice(b) - this.getDormPrice(a));
        } else if (this.sortOrder === 'rating-desc') {
          this.filteredDorms.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (this.sortOrder === 'rating-asc') {
          this.filteredDorms.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        }
        
        this.updateDisplayedDorms();
        this.isFiltering = false;
      },
      error: (error) => {
        console.error('Error with unified filter:', error);
        this.isFiltering = false;
      }
    });
  }

  // ล้างการค้นหาหอพักที่คล้ายกัน
  clearSimilarSearch() {
    this.similarSearchParams = null;
    this.selectedZone = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.sortOrder = '';
    
    // รีเซ็ตฟิลเตอร์ทั้งหมด
    this.clearFilters();
    
    // โหลดข้อมูลใหม่
    this.loadDormitories();
  }

  // Update displayed dorms based on pagination
  updateDisplayedDorms() {
    // แสดงหอพักทั้งหมดทันทีโดยไม่จำกัดจำนวน
    this.displayedDorms = [...this.filteredDorms];
    this.showLoadMoreButton = false; // ซ่อนปุ่ม Load More เพราะแสดงทั้งหมดแล้ว
  }

  // Load more dorms when "ดูหอพักทั้งหมด" is clicked
  loadMoreDorms() {
    const currentLength = this.displayedDorms.length;
    const nextBatch = this.filteredDorms.slice(currentLength, currentLength + this.ITEMS_PER_PAGE);
    this.displayedDorms = [...this.displayedDorms, ...nextBatch];
    
    // Hide button if all dorms are displayed
    this.showLoadMoreButton = this.displayedDorms.length < this.filteredDorms.length;
  }

  // Format date to Thai format
  formatThaiDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist Era
    
    return `อัพเดทล่าสุด: ${day} ${month} ${year}`;
  }
}