import { Component, OnInit, OnDestroy } from '@angular/core';
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
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
})
export class MainComponent implements OnInit, OnDestroy {
  currentRoute: string = '';
  pendingApproval = false;

  // Banner slider images - will be populated from dormitories
  sliderImages: BannerSlide[] = [];
  currentSlide = 0;
  private slideInterval: number | undefined;

  // Subscriptions สำหรับจัดการ memory leak
  private routerSubscription: Subscription | undefined;
  private authSubscription: Subscription | undefined;

  // Full lists
  recommendedDorms: UIDorm[] = [];
  latestDorms: UIDorm[] = [];

  // Loading states
  isLoadingRecommended = true;
  isLoadingLatest = true;

  // Displayed lists (limited to 4)
  displayedRecommended: UIDorm[] = [];
  displayedLatest: UIDorm[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private dormSvc: DormitoryService,
    private sanitizer: DomSanitizer,
    private statsService: StatsService,
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

  private async loadSliderImagesFromDorms(): Promise<void> {
    try {
      // Try to gather a broad pool: recommended + latest, fallback to all
      const [recommended, latest] = await Promise.all([
        this.dormSvc.getRecommended().toPromise(),
        this.dormSvc.getLatest().toPromise(),
      ]);

      let pool: Dorm[] = [];
      if (Array.isArray(recommended)) pool = pool.concat(recommended);
      if (Array.isArray(latest)) pool = pool.concat(latest);

      // If pool empty, fallback to a general fetch (limit for performance)
      if (pool.length === 0) {
        const all = await this.dormSvc
          .getAllDormitories({ limit: 50 })
          .toPromise();
        if (Array.isArray(all)) pool = all;
      }

      // Build candidate slides with metadata (name, zone)
      const candidates: Array<BannerSlide | null> = pool
        .map((d) => {
          const src = d.main_image_url || d.thumbnail_url || '';
          if (!src) return null;
          let subtitle = '';
          const zoneText = d.zone_name ? `โซน${d.zone_name}` : 'โซนไม่ระบุ';

          // แสดงแค่โซนเท่านั้น ไม่ต้องแสดงระยะทาง
          subtitle = zoneText;

          // Compute price text: prefer monthly; else daily
          let priceText: string | undefined;
          if (d.min_price != null && d.max_price != null) {
            const minVal = Number(d.min_price);
            const maxVal = Number(d.max_price);
            if (!Number.isNaN(minVal) && !Number.isNaN(maxVal)) {
              priceText =
                minVal === maxVal
                  ? `${minVal.toLocaleString()} บาท/เดือน`
                  : `${minVal.toLocaleString()}-${maxVal.toLocaleString()} บาท/เดือน`;
            }
          } else if ((d as any).monthly_price != null) {
            const single = Number((d as any).monthly_price);
            if (!Number.isNaN(single)) {
              priceText = `${single.toLocaleString()} บาท/เดือน`;
            }
          } else if ((d as any).daily_price != null) {
            const daily = Number((d as any).daily_price);
            if (!Number.isNaN(daily)) {
              priceText = `${daily.toLocaleString()} บาท/วัน`;
            }
          }
          const slide: BannerSlide = {
            src,
            alt: d.dorm_name || 'Dormitory',
            title: d.dorm_name || 'หอพัก',
            subtitle,
            priceText,
            dormId: d.dorm_id,
          };
          return slide;
        })
        .filter((x): x is BannerSlide => x !== null);

      // Debug logs: แสดงผลข้อมูลสไลด์ที่คำนวณได้
      // removed debug logs

      // If still empty, keep existing behavior by showing nothing (UI handles empty),
      // or use a local placeholder as a single slide
      if (candidates.length === 0) {
        this.sliderImages = [
          {
            src: 'assets/images/photo.png',
            alt: 'Dormitory',
            title: 'Dormora MSU',
            subtitle: 'ค้นหาหอที่ใช่สำหรับคุณ',
          },
        ];
      } else {
        // Deduplicate by src
        const uniqueMap = new Map<string, BannerSlide>();
        for (const c of candidates) {
          if (c && !uniqueMap.has(c.src)) uniqueMap.set(c.src, c);
        }
        const unique = Array.from(uniqueMap.values());
        // Shuffle
        for (let i = unique.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [unique[i], unique[j]] = [unique[j], unique[i]];
        }
        // Take up to 6 random images for the banner
        const selected = unique.slice(0, Math.min(6, unique.length));
        this.sliderImages = selected;
      }

      // Start slideshow after images are ready
      this.startSlideshow();
    } catch (err) {
      // Fallback to a single placeholder to avoid empty slider state
      this.sliderImages = [
        {
          src: 'assets/images/photo.png',
          alt: 'Dormitory',
          title: 'DormRoomaroo',
          subtitle: 'ค้นหาหอที่ใช่สำหรับคุณ',
        },
      ];
      this.startSlideshow();
    }
  }

  private async loadDormitories() {
    this.isLoadingRecommended = true;
    this.isLoadingLatest = true;

    try {
      const recommended = await this.dormSvc.getRecommended().toPromise();
      if (recommended) {
        this.recommendedDorms = recommended.map((d) => this.mapDormToUi(d));
        this.displayedRecommended = this.recommendedDorms.slice(0, 4);
        this.loadImagesForList(this.displayedRecommended);
      }
    } catch (error) {
      // Silent error handling
    } finally {
      this.isLoadingRecommended = false;
    }

    try {
      const latest = await this.dormSvc.getLatest().toPromise();
      if (latest) {
        this.latestDorms = latest.map((d) => this.mapDormToUi(d));
        this.displayedLatest = this.latestDorms.slice(0, 4);
        this.loadImagesForList(this.displayedLatest);
      }
    } catch (error) {
      // Silent error handling
    } finally {
      this.isLoadingLatest = false;
    }
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
    // ลบ slideshow interval เพื่อป้องกัน memory leak
    this.stopSlideshow();

    // ยกเลิก subscriptions เพื่อป้องกัน memory leak
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }

    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.sliderImages.length;
  }

  prevSlide(): void {
    this.currentSlide =
      (this.currentSlide - 1 + this.sliderImages.length) %
      this.sliderImages.length;
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

    // ราคารายวัน (บรรทัดที่สอง ถ้ามี)
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

  viewAllRecommended() {
    this.router.navigate(['/dorm-list'], {
      queryParams: { type: 'recommended' },
    });
  }

  viewAllLatest() {
    this.router.navigate(['/dorm-list'], { queryParams: { type: 'latest' } });
  }

  viewDormDetail(dorm: UIDorm) {
    this.router.navigate(['/dorm-detail', dorm.id]);
  }

  viewSlideDetail(slide: BannerSlide) {
    if (slide.dormId) {
      this.router.navigate(['/dorm-detail', slide.dormId]);
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

    // เพิ่มราคารายวันในบรรทัดที่สอง (ถ้ามี)
    if (d.daily_price) {
      priceDisplay += `\n${d.daily_price.toLocaleString()} บาท/วัน`;
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
}
