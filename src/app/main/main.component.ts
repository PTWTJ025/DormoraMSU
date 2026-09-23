import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService, AdminProfile } from '../services/auth.service';
import { DormitoryService, Dorm } from '../services/dormitory.service';
import { NavbarComponent } from './navbar/navbar.component';
import { AboutComponent } from './about/about.component';
import { ComparePopupComponent } from './shared/compare-popup/compare-popup.component';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StatsService } from '../services/stats.service';
import { register } from 'swiper/element/bundle';

// Register Swiper Web Components
register();

// UI model used in template (all required)
export interface UIDorm {
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

export interface UIContractTransfer {
  id: number;
  dormName: string;
  zone: string;
  transferPrice: string;
  monthlyRent: string;
  roomType: string;
  ownerName: string;
  ownerAvatar: string;
  image: string;
  date: string;
}

type BannerSlide = {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  priceText?: string;
  dormId?: number;
};

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    ComparePopupComponent,
    AboutComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
})
export class MainComponent implements OnInit, OnDestroy, AfterViewInit {
  currentRoute: string = '';
  pendingApproval = false;

  // Banner slider images - will be populated from dormitories
  sliderImages: BannerSlide[] = [];
  currentSlide = 0;
  private slideInterval: number | undefined;

  // Scroll observer สำหรับ scroll reveal animation
  private scrollObserver?: IntersectionObserver;

  // Subscriptions สำหรับจัดการ memory leak
  private routerSubscription: Subscription | undefined;
  private authSubscription: Subscription | undefined;
  private refreshInterval: number | undefined;

  // Full lists
  recommendedDorms: UIDorm[] = [];
  latestDorms: UIDorm[] = [];

  // Loading states
  isLoadingRecommended = true;
  isLoadingLatest = true;

  // Displayed lists (limited to 4)
  displayedRecommended: UIDorm[] = [];
  displayedLatest: UIDorm[] = [];
  displayedContracts: UIContractTransfer[] = [];

  // Quick Search Shortcuts (ทางลัดค้นหาด่วน: Material Symbols + Pastel Colors ปลอดภัย 100% ไม่มีรูปเสีย)
  @ViewChild('categoryScroll') categoryScrollContainer?: ElementRef;
  @ViewChild('swiperContainer') swiperContainer?: ElementRef;

  categoryItems = [
    {
      name: 'หอพัก',
      icon: 'apartment',
      bgClass: 'bg-blue-50 text-blue-600 border-blue-100 group-hover/item:border-blue-300 group-hover/item:bg-blue-100/70',
      queryParams: { type: 'apartment' },
    },
    {
      name: 'คอนโด',
      icon: 'domain',
      bgClass: 'bg-purple-50 text-purple-600 border-purple-100 group-hover/item:border-purple-300 group-hover/item:bg-purple-100/70',
      queryParams: { type: 'condo' },
    },
    {
      name: 'บ้าน / ทาวน์โฮม',
      icon: 'cottage',
      bgClass: 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover/item:border-emerald-300 group-hover/item:bg-emerald-100/70',
      queryParams: { type: 'house' },
    },
    {
      name: 'ตึกแถว',
      icon: 'storefront',
      bgClass: 'bg-amber-50 text-amber-600 border-amber-100 group-hover/item:border-amber-300 group-hover/item:bg-amber-100/70',
      queryParams: { type: 'commercial' },
    },
    {
      name: 'ขายประกันหอ',
      icon: 'key',
      bgClass: 'bg-orange-50 text-orange-600 border-orange-100 group-hover/item:border-orange-300 group-hover/item:bg-orange-100/70',
      queryParams: { type: 'contract' },
    },
    {
      name: 'โซนขามเรียง',
      icon: 'school',
      bgClass: 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover/item:border-indigo-300 group-hover/item:bg-indigo-100/70',
      queryParams: { zone: 'ขามเรียง' },
    },
    {
      name: 'โซนท่าขอนยาง',
      icon: 'restaurant',
      bgClass: 'bg-rose-50 text-rose-600 border-rose-100 group-hover/item:border-rose-300 group-hover/item:bg-rose-100/70',
      queryParams: { zone: 'ท่าขอนยาง' },
    },
    {
      name: 'โซนหน้า ม.',
      icon: 'signpost',
      bgClass: 'bg-sky-50 text-sky-600 border-sky-100 group-hover/item:border-sky-300 group-hover/item:bg-sky-100/70',
      queryParams: { zone: 'หน้า ม.' },
    },
    {
      name: 'โซนดอนนา',
      icon: 'forest',
      bgClass: 'bg-teal-50 text-teal-600 border-teal-100 group-hover/item:border-teal-300 group-hover/item:bg-teal-100/70',
      queryParams: { zone: 'ดอนนา' },
    },
    {
      name: 'โซนในเมือง',
      icon: 'location_city',
      bgClass: 'bg-violet-50 text-violet-600 border-violet-100 group-hover/item:border-violet-300 group-hover/item:bg-violet-100/70',
      queryParams: { zone: 'ในเมือง' },
    },
  ];

  scrollCategories(direction: 'left' | 'right'): void {
    if (this.categoryScrollContainer) {
      const container = this.categoryScrollContainer.nativeElement;
      const scrollAmount = direction === 'left' ? -320 : 320;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  selectCategory(category: any): void {
    this.router.navigate(['/listings'], {
      queryParams: category.queryParams || { category: category.query },
    });
  }

  constructor(
    private router: Router,
    private authService: AuthService,
    private dormSvc: DormitoryService,
    private sanitizer: DomSanitizer,
    private statsService: StatsService,
    private el: ElementRef,
  ) {
    // แทนที่การ subscribe โดยตรง ด้วยการเก็บ subscription เพื่อ unsubscribe ใน ngOnDestroy
    this.routerSubscription = this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
      });
  }

  ngOnInit() {
    this.loadSliderImagesFromDorms();
    this.loadDormitories();

    // เริ่มตัวจับเวลารีเฟรชรายการแนะนำทุก 5 นาที
    this.startAutoRefresh();

    this.authSubscription = this.authService.currentUser$.subscribe(
      (user: AdminProfile | null | undefined) => {
        if (user) {
          // AdminProfile doesn't have pendingApproval property
          this.pendingApproval = false;
          // AdminProfile only has memberType: 'admin'
          if (user.memberType === 'admin') {
            // Admin stays on current page or navigate to admin dashboard
            // this.router.navigate(['/admin']);
          }
        }
      },
    );

    // Record visitor statistics
    this.statsService.recordVisitor().subscribe();
  }

  ngAfterViewInit(): void {
    this.initScrollReveal();
    this.initSwiper();
  }

  private initSwiper(): void {
    if (this.swiperContainer?.nativeElement) {
      const swiperEl = this.swiperContainer.nativeElement;
      const params = {
        slidesPerView: 1,
        speed: 600,
        loop: true,
        autoplay: {
          delay: 4500,
          disableOnInteraction: false,
        },
        pagination: {
          clickable: true,
        },
      };
      Object.assign(swiperEl, params);
      swiperEl.initialize();
    }
  }

  /**
   * Scroll Reveal Animation โดยใช้ Vanilla JS IntersectionObserver
   * ทำงานแบบเล่นครั้งเดียวเมื่อเลื่อนจอมาเจอ
   */
  private initScrollReveal(): void {
    if (typeof window === 'undefined') return;

    if (!('IntersectionObserver' in window)) {
      // Fallback: ถ้าเบราว์เซอร์ไม่รองรับให้แสดงเนื้อหาเลย
      const elements = this.el.nativeElement.querySelectorAll('.reveal');
      elements.forEach((el: HTMLElement) => el.classList.add('is-revealed'));
      return;
    }

    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }

    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            // เล่นแค่ครั้งเดียว เลิก observe ทันที
            this.scrollObserver?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08, // เห็น element 8% ให้เริ่มเฟดขึ้นมา
        rootMargin: '0px 0px -40px 0px', // ดักก่อนถึงขอบล่าง 40px เพื่อความนุ่มนวล
      }
    );

    const elements = this.el.nativeElement.querySelectorAll('.reveal');
    elements.forEach((el: HTMLElement) => this.scrollObserver?.observe(el));
  }

  private async loadSliderImagesFromDorms(): Promise<void> {
    this.sliderImages = [
      {
        src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
        alt: 'หอพักสไตล์โมเดิร์น',
        title: 'หอพักบ้านสุขใจ ขามเรียง',
        subtitle: 'โซนขามเรียง',
        priceText: '3,500 - 4,500 บาท/เดือน',
        dormId: 1
      },
      {
        src: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
        alt: 'อพาร์ตเมนต์ท่าขอนยาง',
        title: 'The Place ท่าขอนยาง',
        subtitle: 'โซนท่าขอนยาง',
        priceText: '4,000 บาท/เดือน',
        dormId: 2
      },
      {
        src: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
        alt: 'หอพักหน้าม.',
        title: 'หน้ามอ วิลเลจ',
        subtitle: 'โซนหน้า ม.',
        priceText: '3,800 บาท/เดือน',
        dormId: 3
      }
    ];
    this.startSlideshow();
  }

  private async loadDormitories() {
    this.isLoadingRecommended = true;
    this.isLoadingLatest = true;

    // Mock Recommended Dorms
    this.recommendedDorms = [
      { id: 1, name: 'หอพักบ้านสุขใจ', price: '3,500 - 4,500 บาท/เดือน', location: 'ม.ใหม่', zone: 'ขามเรียง', date: '25 ส.ค. 2569', rating: 4.5, image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80' },
      { id: 2, name: 'The Place', price: '4,000 บาท/เดือน', location: 'ม.ใหม่', zone: 'ท่าขอนยาง', date: '24 ส.ค. 2569', rating: 4.0, image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80' },
      { id: 3, name: 'หน้ามอ วิลเลจ', price: '3,800 บาท/เดือน', location: 'ม.ใหม่', zone: 'หน้า ม.', date: '22 ส.ค. 2569', rating: 4.8, image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80' },
      { id: 4, name: 'ดอร์มมี่ อพาร์ตเมนต์', price: '4,200 บาท/เดือน', location: 'ม.ใหม่', zone: 'ขามเรียง', date: '20 ส.ค. 2569', rating: 4.2, image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80' }
    ];
    this.displayedRecommended = this.recommendedDorms;
    this.isLoadingRecommended = false;

    // Mock Latest Dorms (Same as recommended for mock)
    this.latestDorms = [...this.recommendedDorms].reverse();
    this.displayedLatest = this.latestDorms;
    this.isLoadingLatest = false;

    // Mock Contracts
    this.displayedContracts = [
      { id: 1, dormName: 'หอพักบ้านสุขใจ (แอร์ ชั้น 3)', zone: 'ขามเรียง', transferPrice: '3,000', monthlyRent: '3,500', roomType: 'ห้องแอร์', ownerName: 'น้องมายด์ (นิสิต)', ownerAvatar: 'https://i.pravatar.cc/150?img=47', image: 'https://picsum.photos/seed/room1/800/600', date: '25 ส.ค. 2569' },
      { id: 2, dormName: 'The Place (แอร์ มุม)', zone: 'ท่าขอนยาง', transferPrice: '4,500', monthlyRent: '4,000', roomType: 'ห้องแอร์', ownerName: 'พี่นนท์', ownerAvatar: 'https://i.pravatar.cc/150?img=12', image: 'https://picsum.photos/seed/room2/800/600', date: '23 ส.ค. 2569' },
      { id: 3, dormName: 'หน้ามอ วิลเลจ (พัดลม)', zone: 'หน้า ม.', transferPrice: '2,000', monthlyRent: '2,500', roomType: 'ห้องพัดลม', ownerName: 'สมใจ', ownerAvatar: 'https://i.pravatar.cc/150?img=32', image: 'https://picsum.photos/seed/room3/800/600', date: '21 ส.ค. 2569' },
      { id: 4, dormName: 'ดอร์มมี่ อพาร์ตเมนต์', zone: 'ขามเรียง', transferPrice: '5,000', monthlyRent: '4,200', roomType: 'ห้องแอร์', ownerName: 'น้องฟ้า', ownerAvatar: 'https://i.pravatar.cc/150?img=5', image: 'https://picsum.photos/seed/room4/800/600', date: '19 ส.ค. 2569' }
    ];

    setTimeout(() => {
      this.initScrollReveal();
    }, 50);
  }

  startSlideshow(): void {
    // ปิด slideshow เดิมก่อน (ถ้ามี) เพื่อป้องกัน memory leak
    this.stopSlideshow();

    this.slideInterval = window.setInterval(() => {
      this.nextSlide();
    }, 3000);
  }

  stopSlideshow(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
      this.slideInterval = undefined;
    }
  }

  ngOnDestroy(): void {
    // ล้าง Scroll Observer
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver = undefined;
    }

    // ลบ slideshow interval เพื่อป้องกัน memory leak
    this.stopSlideshow();

    // ยกเลิก subscriptions เพื่อป้องกัน memory leak
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }

    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }

    // ล้างตัวจับเวลา auto refresh
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  nextSlide(): void {
    if (this.swiperContainer?.nativeElement?.swiper) {
      this.swiperContainer.nativeElement.swiper.slideNext();
    } else {
      this.currentSlide = (this.currentSlide + 1) % this.sliderImages.length;
    }
  }

  prevSlide(): void {
    if (this.swiperContainer?.nativeElement?.swiper) {
      this.swiperContainer.nativeElement.swiper.slidePrev();
    } else {
      this.currentSlide =
        (this.currentSlide - 1 + this.sliderImages.length) %
        this.sliderImages.length;
    }
  }

  getStars(rating: number | undefined): { filled: boolean }[] {
    const stars: { filled: boolean }[] = [];
    const actualRating = rating || 0;

    for (let i = 1; i <= 5; i++) {
      stars.push({ filled: i <= actualRating });
    }

    return stars;
  }

  isAuthPage(): boolean {
    return (
      this.currentRoute.includes('login') ||
      this.currentRoute.includes('register') ||
      this.currentRoute.includes('owner')
    );
  }

  getPriceHtml(price: string | undefined): string {
    if (!price) return '';

    // แยกราคารายเดือนและรายวัน (ถ้ามี)
    const lines = price.split('\n');
    let html = '';

    // ราคารายเดือน (บรรทัดแรก)
    if (lines[0]) {
      // แยกตัวเลขและหน่วย
      const monthlyMatch = lines[0].match(
        /([\d,]+)(\s*-\s*[\d,]+)?\s*(บาท\/เดือน)/,
      );
      if (monthlyMatch) {
        if (monthlyMatch[2]) {
          // กรณีช่วงราคา
          const [_, start, range, unit] = monthlyMatch;
          html += `<div class="price-monthly">
            <span class="font-english">${start}</span>
            <span class="font-english">${range}</span>
            <span class="font-thai unit">${unit}</span>
          </div>`;
        } else {
          // กรณีราคาเดียว
          const [_, number, __, unit] = monthlyMatch;
          html += `<div class="price-monthly">
            <span class="font-english">${number}</span>
            <span class="font-thai unit">${unit}</span>
          </div>`;
        }
      }
    }

    return html;
  }

  getSafePriceHtml(price: string | undefined): SafeHtml {
    const html = this.getPriceHtml(price);
    return this.sanitizer.sanitize(1, html) || '';
  }

  viewAllRecommended() {
    this.router.navigate(['/listings'], {
      queryParams: { type: 'recommended' },
    });
  }

  viewAllLatest() {
    this.router.navigate(['/listings'], { queryParams: { type: 'latest' } });
  }

  viewDormDetail(dorm: UIDorm) {
    this.router.navigate(['/detail', dorm.id]);
  }

  viewSlideDetail(slide: BannerSlide) {
    if (slide.dormId) {
      this.router.navigate(['/detail', slide.dormId]);
    }
  }

  onLogin() {
    this.router.navigate(['/login']);
  }

  onRegister() {
    // Require explicit type; do not navigate with null
    const type = 'member';
    this.router.navigate(['/register', type], {
      queryParams: { userType: type },
    });
  }

  private mapDormToUi(d: Dorm): UIDorm {
    let priceDisplay = '';

    // จัดการราคารายเดือน
    if (d.min_price != null && d.max_price != null) {
      const minVal = Number(d.min_price);
      const maxVal = Number(d.max_price);
      if (!Number.isNaN(minVal) && !Number.isNaN(maxVal)) {
        priceDisplay =
          minVal === maxVal
            ? `${minVal.toLocaleString()} บาท/เดือน`
            : `${minVal.toLocaleString()} - ${maxVal.toLocaleString()} บาท/เดือน`;
      }
    } else if (d.monthly_price != null) {
      const single = Number(d.monthly_price);
      if (!Number.isNaN(single)) {
        priceDisplay = `${single.toLocaleString()} บาท/เดือน`;
      }
    }

    // Format location display
    let locationDisplay = d.location_display || d.address || '';
    if (d.zone_name) {
      locationDisplay = locationDisplay
        ? `${locationDisplay} (${d.zone_name})`
        : d.zone_name;
    }

    // ใช้ avg_rating จาก API ใหม่ หรือ fallback ไป rating เก่า
    // แปลง string เป็น number ก่อน
    const avgRating = (d as any).avg_rating;
    const finalRating = avgRating ? Number(avgRating) : d.rating || 0.0;

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
      rating: finalRating,
    };
  }

  private loadImagesForList(list: UIDorm[]): void {
    // Preload images
    list.forEach((dorm) => {
      if (dorm.image) {
        const img = new Image();
        img.src = dorm.image;
      }
    });
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

  // เริ่มตัวจับเวลารีเฟรชรายการแนะนำอัตโนมัติ
  private startAutoRefresh() {
    // รีเฟรชทุก 5 นาที (300,000 มิลลิวินาที)
    this.refreshInterval = window.setInterval(() => {
      this.refreshRecommendedDorms();
    }, 300000);
  }

  // รีเฟรชเฉพาะรายการแนะนำ
  private async refreshRecommendedDorms() {
    // Mocked out
  }
}
