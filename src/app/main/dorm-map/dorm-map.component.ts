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
import { DormitoryService, Dorm, DormDetail } from '../../services/dormitory.service';
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

  private map: maptilersdk.Map | null = null;
  private markers: maptilersdk.Marker[] = [];
  private subscription = new Subscription();

  dormitories: Dorm[] = [];
  isLoading = true;
  error: string | null = null;
  totalDormitories: number = 0;

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

  private getPriceDisplay(dorm: Dorm | DormDetail): string {
    if (dorm.min_price && dorm.max_price) {
      return `<span>${dorm.min_price.toLocaleString()}</span> – <span>${dorm.max_price.toLocaleString()}</span> บาท/เดือน`;
    } else if (dorm.price_display) {
      return dorm.price_display;
    } else {
      return 'ติดต่อสอบถาม';
    }
  }

  private addMapControls(): void {
    if (!this.map) return;
    this.clearAllExistingControls();
    this.addSatelliteControl();
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
