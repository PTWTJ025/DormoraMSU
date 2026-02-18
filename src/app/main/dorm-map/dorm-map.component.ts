import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as maptilersdk from '@maptiler/sdk';
import { NavbarComponent } from '../navbar/navbar.component';
import {
  DormitoryService,
  Dorm,
  DormDetail,
} from '../../services/dormitory.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dorm-map',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './dorm-map.component.html',
  styleUrl: './dorm-map.component.css',
})
export class DormMapComponent implements OnInit, OnDestroy {
  private mockDorms: Dorm[] = [] as any;

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  dormitories: Dorm[] = [];
  selectedDorm: DormDetail | null = null;
  isLoading = true;
  error: string | null = null;
  totalDormitories: number = 0;

  private map: maptilersdk.Map | null = null;
  private markers: maptilersdk.Marker[] = [];
  private popup: maptilersdk.Popup | null = null;
  private subscription = new Subscription();

  private readonly defaultCenter: [number, number] = [98.9853, 18.7883];
  private readonly defaultZoom = 12;
  private isSatelliteView = true;

  constructor(private dormitoryService: DormitoryService) {
    maptilersdk.config.apiKey = environment.mapTilerApiKey;
  }

  ngOnInit(): void {
    this.loadDormitories();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroyMap();
  }

  private loadDormitories(): void {
    this.isLoading = true;
    this.error = null;

    this.subscription.add(
      this.dormitoryService.getAllDormitoriesForMap().subscribe({
        next: (result) => {
          const apiDorms = (result?.dormitories || []).filter(
            (d: Dorm) => d.latitude && d.longitude,
          );
          this.dormitories = apiDorms.length ? apiDorms : this.mockDorms;
          this.totalDormitories = result?.total || this.dormitories.length;
          this.isLoading = false;
          this.initializeMap();
        },
        error: () => {
          this.dormitories = this.mockDorms;
          this.totalDormitories = this.dormitories.length;
          this.isLoading = false;
          this.initializeMap();
        },
      }),
    );
  }

  private initializeMap(): void {
    if (!this.mapContainer?.nativeElement) {
      return;
    }

    try {
      let initialCenter = this.defaultCenter;
      let initialZoom = this.defaultZoom;

      if (this.dormitories.length > 0) {
        const validDorms = this.dormitories.filter(
          (dorm) => dorm.latitude && dorm.longitude,
        );
        if (validDorms.length > 0) {
          const lats = validDorms.map((dorm) => dorm.latitude!);
          const lngs = validDorms.map((dorm) => dorm.longitude!);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
          initialCenter = [centerLng, centerLat];
          initialZoom = 11;
        }
      }

      this.map = new maptilersdk.Map({
        container: this.mapContainer.nativeElement,
        style: maptilersdk.MapStyle.SATELLITE,
        center: initialCenter,
        zoom: initialZoom,
        maxZoom: 20,
        minZoom: 8,
      });

      this.addMapControls();

      this.map.on('load', () => {
        this.addMarkers();
      });

      this.map.on('error', (e) => {
        this.error = 'ไม่สามารถโหลดแผนที่ได้';
        this.isLoading = false;
      });

      this.map.on('styledata', () => {});
    } catch (error) {
      this.error = 'ไม่สามารถโหลดแผนที่ได้';
    }
  }

  private addMarkers(): void {
    if (!this.map) return;

    this.markers.forEach((m) => m.remove());
    this.markers = [];

    const bounds = new maptilersdk.LngLatBounds();

    this.dormitories.forEach((dorm) => {
      if (!dorm.latitude || !dorm.longitude) return;

      const marker = new maptilersdk.Marker({ color: '#FFCD22', scale: 0.9 })
        .setLngLat([dorm.longitude, dorm.latitude])
        .addTo(this.map!);

      marker.getElement().style.cursor = 'pointer';
      marker.getElement().addEventListener('click', () => {
        this.onMarkerClick(dorm);
      });

      bounds.extend([dorm.longitude, dorm.latitude]);
      this.markers.push(marker);
    });

    if (!bounds.isEmpty() && this.map) {
      const isMobile = window.innerWidth < 640;
      const padding = isMobile
        ? { top: 100, right: 20, bottom: 40, left: 20 }
        : { top: 80, right: 80, bottom: 80, left: 80 };

      this.map.fitBounds(bounds, {
        padding: padding,
        maxZoom: 15,
        duration: 800,
      });
    } else {
      this.map!.setCenter(this.defaultCenter);
      this.map!.setZoom(this.defaultZoom);
    }
  }

  private addMapControls(): void {
    if (!this.map) return;
    this.clearAllExistingControls();
    this.addSatelliteControl();
  }

  private onMarkerClick(dorm: Dorm): void {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }

    this.subscription.add(
      this.dormitoryService.getDormitoryPopup(dorm.dorm_id).subscribe({
        next: (dormDetail) => {
          console.log('[DormMap] Popup detail data:', dormDetail);
          this.selectedDorm = dormDetail;
          this.showPopup(dormDetail);
        },
        error: (err) => {
          console.error('[DormMap] Error loading dormitory popup:', err);
          console.log('[DormMap] Fallback basic popup data:', dorm);
          this.showBasicPopup(dorm);
        },
      }),
    );
  }

  private showPopup(dormDetail: DormDetail): void {
    if (!this.map || !dormDetail.latitude || !dormDetail.longitude) return;

    const popupContent = this.createPopupContent(dormDetail);
    const isMobile = window.innerWidth < 640;

    this.popup = new maptilersdk.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: isMobile ? '280px' : '320px',
    })
      .setLngLat([dormDetail.longitude, dormDetail.latitude])
      .setHTML(popupContent)
      .addTo(this.map!);
  }

  private showBasicPopup(dorm: Dorm): void {
    if (!this.map || !dorm.latitude || !dorm.longitude) return;

    const popupContent = this.createBasicPopupContent(dorm);
    const isMobile = window.innerWidth < 640;

    this.popup = new maptilersdk.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: isMobile ? '280px' : '320px',
    })
      .setLngLat([dorm.longitude, dorm.latitude])
      .setHTML(popupContent)
      .addTo(this.map!);
  }

  /** Popup Card — styled similar to screenshot (image + price + name + zone + rating) */
  private createPopupContent(dormDetail: DormDetail): string {
    const imageUrl =
      dormDetail.main_image_url || dormDetail.thumbnail_url || '';
    const priceDisplay = this.getPriceDisplay(dormDetail);
    const lat = dormDetail.latitude ?? null;
    const lng = dormDetail.longitude ?? null;
    const navUrl =
      lat != null && lng != null
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : '';

    return `
      <div style="font-family:'Noto Sans Thai','Inter',sans-serif; width:260px; background:#ffffff;">
        ${
          imageUrl
            ? `<img src="${imageUrl}" alt="${dormDetail.dorm_name || ''}"
               style="width:100%; height:150px; object-fit:cover; display:block;" />`
            : ''
        }
        <div style="padding:12px 14px 14px;">
          <div style="font-size:16px; font-weight:700; color:#111827; margin-bottom:4px;">
            ${priceDisplay}
          </div>
          <div style="font-size:14px; font-weight:600; color:#111827; line-height:1.4; margin-bottom:4px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
            ${dormDetail.dorm_name || '-'}
          </div>
          <div style="font-size:12px; color:#6b7280; margin-bottom:6px;">
            ${dormDetail.zone_name || 'ไม่ระบุโซน'}
          </div>
          ${
            navUrl
              ? `
          <div style="margin-top:6px;">
            <a href="${navUrl}" target="_blank" rel="noopener"
               style="display:flex; align-items:center; justify-content:center; gap:6px; padding:8px 10px; border-radius:999px; background:#2563eb; text-decoration:none; color:#ffffff; font-size:12px; font-weight:600;">
              <span>Google Maps</span>
              
            </a>
          </div>`
              : `
          <div style="margin-top:4px; font-size:11px; color:#9ca3af;">ไม่มีพิกัดสำหรับนำทาง</div>`
          }
        </div>
      </div>
    `;
  }

  /** Popup Card — Basic Fallback (ไม่มีรูป) */
  private createBasicPopupContent(dorm: Dorm): string {
    const priceDisplay = this.getPriceDisplay(dorm);
    const lat = dorm.latitude ?? null;
    const lng = dorm.longitude ?? null;
    const navUrl =
      lat != null && lng != null
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : '';

    return `
      <div style="font-family:'Noto Sans Thai','Inter',sans-serif; width:260px; background:#ffffff;">
        <div style="padding:12px 14px 14px;">
          <div style="font-size:16px; font-weight:700; color:#111827; margin-bottom:4px;">
            ${priceDisplay}
          </div>
          <div style="font-size:14px; font-weight:600; color:#111827; line-height:1.4; margin-bottom:4px;">
            ${dorm.dorm_name || '-'}
          </div>
          <div style="font-size:12px; color:#6b7280; margin-bottom:6px;">
            ${dorm.zone_name || 'ไม่ระบุโซน'}
          </div>
          ${
            navUrl
              ? `
          <div style="margin-top:6px;">
            <a href="${navUrl}" target="_blank" rel="noopener"
               style="display:flex; align-items:center; justify-content:center; gap:6px; padding:8px 10px; border-radius:999px; background:#2563eb; text-decoration:none; color:#ffffff; font-size:12px; font-weight:600;">
              <span>Google Maps</span>
            </a>
          </div>`
              : `
          <div style="margin-top:4px; font-size:11px; color:#9ca3af;">ไม่มีพิกัดสำหรับนำทาง</div>`
          }
        </div>
      </div>
    `;
  }

  private getPriceDisplay(dorm: Dorm | DormDetail): string {
    if (dorm.min_price && dorm.max_price) {
      return `${dorm.min_price.toLocaleString()} - ${dorm.max_price.toLocaleString()} บาท/เดือน`;
    } else if (dorm.price_display) {
      return dorm.price_display;
    } else {
      return 'ติดต่อสอบถาม';
    }
  }

  private clearAllExistingControls(): void {
    if (!this.map) return;

    const container = this.map.getContainer() as HTMLElement;

    container
      .querySelectorAll('.maplibregl-ctrl-zoom, .mapboxgl-ctrl-zoom')
      .forEach((el) => el.parentElement?.removeChild(el));

    container
      .querySelectorAll('.maplibregl-ctrl-compass, .mapboxgl-ctrl-compass')
      .forEach((el) => {
        const parent = el.closest(
          '.maplibregl-ctrl-group, .mapboxgl-ctrl-group',
        );
        if (parent) parent.parentElement?.removeChild(parent);
      });

    container
      .querySelectorAll('.maplibregl-ctrl-geolocate, .mapboxgl-ctrl-geolocate')
      .forEach((el) => {
        const parent = el.closest(
          '.maplibregl-ctrl-group, .mapboxgl-ctrl-group',
        );
        if (parent) parent.parentElement?.removeChild(parent);
      });

    container
      .querySelectorAll('[title*="ดาวเทียม"], [title*="satellite"]')
      .forEach((el) => {
        const parent = el.closest(
          '.maplibregl-ctrl-group, .mapboxgl-ctrl-group',
        );
        if (parent) parent.parentElement?.removeChild(parent);
      });
  }

  private addSatelliteControl(): void {
    if (!this.map) return;
    const component = this;

    const satelliteControl = {
      _container: undefined as HTMLElement | undefined,
      onAdd(map: maptilersdk.Map) {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'maplibregl-ctrl-icon flex items-center justify-center';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.padding = '0';
        btn.title = component.isSatelliteView ? 'แผนที่ถนน' : 'ภาพถ่ายดาวเทียม';

        const renderIcon = () => {
          btn.innerHTML = component.isSatelliteView
            ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
               </svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 0 1-1.652.928l-.679-.906a1.125 1.125 0 0 0-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 0 0-8.862 12.872M12.75 3.031a9 9 0 0 1 6.69 14.036m0 0-.177-.529A2.25 2.25 0 0 0 17.128 15H16.5l-.324-.324a1.453 1.453 0 0 0-2.328.377l-.036.073a1.586 1.586 0 0 1-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 0 1-5.276 3.67m0 0a9 9 0 0 1-10.275-4.835M15.75 9c0 .896-.393 1.7-1.016 2.25" />
               </svg>`;
        };

        renderIcon();

        btn.addEventListener('click', () => {
          component.toggleMapStyle();
          btn.title = component.isSatelliteView
            ? 'แผนที่ถนน'
            : 'ภาพถ่ายดาวเทียม';
          renderIcon();
        });

        container.appendChild(btn);
        (this as any)._container = container;
        return container;
      },
      onRemove() {
        const c = (this as any)._container as HTMLElement | undefined;
        if (c && c.parentNode) c.parentNode.removeChild(c);
      },
    };

    this.map.addControl(satelliteControl, 'top-right');
  }

  private toggleMapStyle(): void {
    if (!this.map) return;

    this.isSatelliteView = !this.isSatelliteView;

    if (this.isSatelliteView) {
      this.map.setStyle(maptilersdk.MapStyle.SATELLITE);
    } else {
      this.map.setStyle(maptilersdk.MapStyle.STREETS);
    }
  }

  private destroyMap(): void {
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  getTotalDormitories(): number {
    return this.totalDormitories;
  }

  retryLoad(): void {
    this.loadDormitories();
  }
}
