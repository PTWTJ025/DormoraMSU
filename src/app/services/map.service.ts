import { Injectable } from '@angular/core';
import * as maptilersdk from '@maptiler/sdk';
import { DormDetail } from '../services/dormitory.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MapService {
  private map: maptilersdk.Map | null = null;
  private marker: maptilersdk.Marker | null = null;

  private isSatelliteView = false;
  private currentLat = 0;
  private currentLng = 0;
  private currentDormDetail: DormDetail | null = null;

  // refs & guards
  private satelliteControl: any | null = null;
  private navControl: maptilersdk.NavigationControl | null = null;
  private geoControl: maptilersdk.GeolocateControl | null = null;
  private pickHandler: ((e: any) => void) | null = null;
  private controlsAttached = false;

  // Singleton pattern properties
  private isInitialized = false;
  private currentContainerId: string | null = null;
  private mapInstances = new Map<string, { 
    map: maptilersdk.Map; 
    marker: maptilersdk.Marker | null;
    geoControl: maptilersdk.GeolocateControl | null;
  }>();

  constructor() {
    maptilersdk.config.apiKey = environment.mapTilerApiKey;
  }

  initializeMap(
    containerId: string,
    lat: number,
    lng: number,
    dormName?: string,
    location?: string,
    dormDetail?: DormDetail
  ): void {
    // ตรวจสอบว่ามี map instance อยู่แล้วสำหรับ container นี้หรือไม่
    const existingInstance = this.mapInstances.get(containerId);
    if (existingInstance && existingInstance.map && existingInstance.map.isStyleLoaded()) {
      // ตรวจสอบ WebGL context ก่อน reuse
      const canvas = existingInstance.map.getCanvas();
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      
      if (gl && !gl.isContextLost()) {
        
        this.map = existingInstance.map;
        this.marker = existingInstance.marker;
        this.currentContainerId = containerId;
        
        // อัปเดตตำแหน่งและ marker
        this.map.setCenter([lng, lat]);
        this.updateMarker(lat, lng, dormName, location);
        return;
      } else {
        
        this.destroyMap();
      }
    } else if (existingInstance && existingInstance.map) {
      
      this.destroyMap();
    }

    // ทำลาย map instance เดิม (ถ้ามี) เฉพาะเมื่อเปลี่ยน container
    if (this.currentContainerId && this.currentContainerId !== containerId) {
      this.destroyMap();
    }

    this.currentContainerId = containerId;
    this.currentLat = lat;
    this.currentLng = lng;
    this.currentDormDetail = dormDetail || null;

    

    this.map = new maptilersdk.Map({
      container: containerId,
      style: maptilersdk.MapStyle.STREETS,
      center: [lng, lat],
      zoom: 15,
      maxZoom: 20,
      minZoom: 3,
      pitch: 0,
      bearing: 0,
      // ปิดคอนโทรลเริ่มต้นทั้งหมด
      navigationControl: false,
      geolocateControl: false,
      attributionControl: false
    });

    this.map.on('load', () => {
      this.addControls();
      this.addMarker(lat, lng, dormName, location);
    });

    // ซ่อน MapTiler warnings สำหรับ missing images
    this.map.on('styleimagemissing', (e) => {
      // Silent - ไม่ต้องทำอะไร เพราะเราไม่ได้ใช้ไอคอนเหล่านั้น
    });

    // ซ่อน map errors ที่ไม่สำคัญ
    this.map.on('error', (e) => {
      // Silent - ไม่ต้อง log error ที่ไม่สำคัญ
    });

    // เก็บ instance ไว้ใน Map
    this.mapInstances.set(containerId, { map: this.map, marker: null, geoControl: null });
    this.isInitialized = true;
  }

  /** ตรวจสอบว่าแมปถูกสร้างแล้วหรือไม่ */
  isMapInitialized(containerId: string): boolean {
    const existingInstance = this.mapInstances.get(containerId);
    if (!existingInstance || !existingInstance.map) {
      return false;
    }
    
    // ตรวจสอบว่าแมปยังทำงานอยู่หรือไม่
    try {
      const canvas = existingInstance.map.getCanvas();
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      return !!(gl && !gl.isContextLost());
    } catch (error) {
      return false;
    }
  }

  /** เพิ่มเฉพาะคอนโทรลที่ต้องการ โดยล้างคอนโทรลเดิมก่อน */
  private addControls(): void {
    if (!this.map || this.controlsAttached) return;
    
    // ลบคอนโทรลเดิมทั้งหมดก่อน (กันไว้กรณีที่ยังมี)
    this.clearAllExistingControls();
    
    this.controlsAttached = true;

    // เพิ่มคอนโทรลที่เราต้องการเท่านั้น
    this.addSatelliteControl();

    // ไม่เพิ่ม NavigationControl เลย (ไม่มีเข็มทิศ ไม่มีปุ่ม zoom)

    // GeolocateControl: ตำแหน่งผู้ใช้
    this.geoControl = new maptilersdk.GeolocateControl({
      positionOptions: { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 600000 
      },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true
    });
    this.map.addControl(this.geoControl, 'top-right');
    
    // เก็บ geoControl ไว้ใน instance
    const instance = this.mapInstances.get(this.currentContainerId || '');
    if (instance) {
      instance.geoControl = this.geoControl;
      console.log('[MapService] GeolocateControl stored in instance');
    }
  }

  /**
   * เรียกใช้งาน Geolocate อัตโนมัติ
   * @param containerId - ID ของ container
   * @param onSuccess - Callback เมื่อได้ตำแหน่ง
   * @param onError - Callback เมื่อเกิด error หรือผู้ใช้ปฏิเสธ
   */
  triggerGeolocate(
    containerId: string, 
    onSuccess?: (lat: number, lng: number) => void,
    onError?: () => void
  ): void {
    const instance = this.mapInstances.get(containerId);
    if (!instance || !instance.map) {
      console.error('[MapService] Cannot trigger geolocate: map instance not found');
      if (onError) onError();
      return;
    }

    // ใช้ geoControl จาก instance
    const geoControl = instance.geoControl;
    
    if (!geoControl) {
      console.error('[MapService] GeolocateControl not initialized for container:', containerId);
      if (onError) onError();
      return;
    }

    console.log('[MapService] Triggering geolocate for container:', containerId);

    // ฟังก์ชัน event listener แบบ one-time
    const onGeolocate = (e: any) => {
      console.log('[MapService] Geolocate success:', e.coords);
      if (onSuccess) {
        onSuccess(e.coords.latitude, e.coords.longitude);
      }
      // ลบ listener หลังจากใช้งานแล้ว
      geoControl.off('geolocate', onGeolocate);
    };

    const onGeolocateError = (e: any) => {
      console.error('[MapService] Geolocate error:', e);
      if (onError) onError();
      // ลบ listener หลังจากใช้งานแล้ว
      geoControl.off('error', onGeolocateError);
    };

    // เพิ่ม event listeners
    geoControl.on('geolocate', onGeolocate);
    geoControl.on('error', onGeolocateError);

    // Trigger geolocate
    geoControl.trigger();
  }

  /**
   * อัปเดตตำแหน่ง marker บนแผนที่
   * @param containerId - ID ของ container
   * @param lat - Latitude
   * @param lng - Longitude
   */
  updateMarkerPosition(containerId: string, lat: number, lng: number): void {
    const instance = this.mapInstances.get(containerId);
    if (!instance) {
      console.error('[MapService] Cannot update marker: map instance not found');
      return;
    }

    // อัปเดต marker
    if (instance.marker) {
      instance.marker.setLngLat([lng, lat]);
      console.log('[MapService] Marker position updated:', { lat, lng });
    } else {
      // สร้าง marker ใหม่ถ้ายังไม่มี
      instance.marker = new maptilersdk.Marker({ color: '#FF0000' })
        .setLngLat([lng, lat])
        .addTo(instance.map);
      console.log('[MapService] New marker created at:', { lat, lng });
    }

    // ย้ายแผนที่ไปที่ตำแหน่งใหม่
    instance.map.flyTo({
      center: [lng, lat],
      zoom: 15,
      duration: 1000
    });
  }

  /** ลบคอนโทรลเดิมทั้งหมดที่อาจจะมี */
  private clearAllExistingControls(): void {
    if (!this.map) return;
    
    const container = this.map.getContainer() as HTMLElement;
    
    // ลบ zoom controls
    container.querySelectorAll('.maplibregl-ctrl-zoom, .mapboxgl-ctrl-zoom').forEach(el => {
      el.parentElement?.removeChild(el);
    });
    
    // ลบ navigation controls เดิม
    container.querySelectorAll('.maplibregl-ctrl-compass, .mapboxgl-ctrl-compass').forEach(el => {
      const parent = el.closest('.maplibregl-ctrl-group, .mapboxgl-ctrl-group');
      if (parent) parent.parentElement?.removeChild(parent);
    });
    
    // ลบ geolocate controls เดิม
    container.querySelectorAll('.maplibregl-ctrl-geolocate, .mapboxgl-ctrl-geolocate').forEach(el => {
      const parent = el.closest('.maplibregl-ctrl-group, .mapboxgl-ctrl-group');
      if (parent) parent.parentElement?.removeChild(parent);
    });
    
    // ลบ satellite controls เดิม (ถ้ามี)
    container.querySelectorAll('[title*="ดาวเทียม"], [title*="satellite"]').forEach(el => {
      const parent = el.closest('.maplibregl-ctrl-group, .mapboxgl-ctrl-group');
      if (parent) parent.parentElement?.removeChild(parent);
    });
  }

  private addSatelliteControl(): void {
    if (!this.map) return;
    const service = this;

    this.satelliteControl = {
      _container: undefined as HTMLElement | undefined,
      onAdd(map: maptilersdk.Map) {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'maplibregl-ctrl-icon';
        btn.title = service.isSatelliteView ? 'แผนที่ถนน' : 'ภาพถ่ายดาวเทียม';

        const renderIcon = () => {
          btn.innerHTML = service.isSatelliteView
            ? '<span class="material-symbols-outlined">streetview</span>'
            : '<span class="material-symbols-outlined">globe</span>';
        };

        renderIcon();

        btn.addEventListener('click', () => {
          service.toggleMapStyle();
          btn.title = service.isSatelliteView ? 'แผนที่ถนน' : 'ภาพถ่ายดาวเทียม';
          renderIcon();
        });

        container.appendChild(btn);
        (this as any)._container = container;
        return container;
      },
      onRemove() {
        const c = (this as any)._container as HTMLElement | undefined;
        if (c && c.parentNode) c.parentNode.removeChild(c);
      }
    };

    this.map.addControl(this.satelliteControl, 'top-right');
  }

  private addMarker(lat: number, lng: number, _dormName?: string, _location?: string): void {
    if (!this.map) return;

    if (this.marker) this.marker.remove();

    this.marker = new maptilersdk.Marker({ color: '#EA4335' })
      .setLngLat([lng, lat])
      .addTo(this.map);

    const el = this.marker.getElement();
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    });

    // อัปเดต marker ใน instance map
    if (this.currentContainerId) {
      const instance = this.mapInstances.get(this.currentContainerId);
      if (instance) {
        instance.marker = this.marker;
      }
    }
  }

  private updateMarker(lat: number, lng: number, _dormName?: string, _location?: string): void {
    if (this.marker) {
      this.marker.setLngLat([lng, lat]);
    } else {
      this.addMarker(lat, lng, _dormName, _location);
    }
  }

  toggleMapStyle(): void {
    if (!this.map) return;

    this.isSatelliteView = !this.isSatelliteView;
    const nextStyle = this.isSatelliteView
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${maptilersdk.config.apiKey}`
      : maptilersdk.MapStyle.STREETS;

    const center = this.map.getCenter();
    const zoom = this.map.getZoom();
    const pitch = this.map.getPitch();
    const bearing = this.map.getBearing();

    this.map.setStyle(nextStyle);

    this.map.once('style.load', () => {
      this.map?.setCenter(center);
      this.map?.setZoom(zoom);
      this.map?.setPitch(pitch);
      this.map?.setBearing(bearing);

      if (this.marker) {
        const c = this.marker.getLngLat();
        this.addMarker(c.lat, c.lng);
      }
    });
  }

  enablePickLocation(callback: (pos: { lat: number; lng: number }) => void): void {
    if (!this.map) return;

    if (this.pickHandler) {
      this.map.off('click', this.pickHandler as any);
      this.pickHandler = null;
    }

    this.pickHandler = (e: any) => {
      const lat = e.lngLat.lat;
      const lng = e.lngLat.lng;
      this.currentLat = lat;
      this.currentLng = lng;
      this.addMarker(lat, lng);
      callback({ lat, lng });
    };

    this.map.on('click', this.pickHandler as any);
  }

  resize(): void {
    this.map?.resize();
  }

  reinitializeMap(
    containerId: string,
    lat: number,
    lng: number,
    dormName?: string,
    location?: string,
    dormDetail?: DormDetail
  ): void {
    this.destroyMap();
    setTimeout(() => {
      this.initializeMap(containerId, lat, lng, dormName, location, dormDetail);
    }, 100);
  }

  destroyMap(): void {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    if (this.map && typeof this.map.remove === 'function') {
      try {
        if (this.satelliteControl) {
          this.map.removeControl(this.satelliteControl);
          this.satelliteControl = null;
        }
        if (this.geoControl) {
          this.map.removeControl(this.geoControl);
          this.geoControl = null;
        }
        if (this.pickHandler) {
          this.map.off('click', this.pickHandler as any);
          this.pickHandler = null;
        }
        this.map.remove();
      } catch (error) {
        console.warn('[MapService] Error destroying map:', error);
      }
      this.map = null;
    }
    this.controlsAttached = false;
    this.currentDormDetail = null;
  }

  /**
   * ทำลาย map instance ที่เฉพาะเจาะจง โดย container ID
   */
  destroyMapByContainer(containerId: string): void {
    const instance = this.mapInstances.get(containerId);
    if (instance) {
      if (instance.marker) {
        instance.marker.remove();
      }
      instance.map.remove();
      this.mapInstances.delete(containerId);
      
      // ถ้า instance ที่ลบเป็น current instance
      if (this.currentContainerId === containerId) {
        this.map = null;
        this.marker = null;
        this.currentContainerId = null;
        this.controlsAttached = false;
      }
      
      console.log(`[MapService] Destroyed map instance for container: ${containerId}`);
    }
  }


  /**
   * ทำลาย map instances ทั้งหมด
   */
  destroyAllMaps(): void {
    this.mapInstances.forEach((instance, containerId) => {
      if (instance.marker) {
        instance.marker.remove();
      }
      instance.map.remove();
      console.log(`[MapService] Destroyed map instance for container: ${containerId}`);
    });
    
    this.mapInstances.clear();
    this.map = null;
    this.marker = null;
    this.currentContainerId = null;
    this.controlsAttached = false;
    this.isInitialized = false;
    this.currentDormDetail = null;
  }
}