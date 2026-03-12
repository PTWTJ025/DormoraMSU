import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** ผลลัพธ์ระยะทางตามถนนจาก ORS (ใช้ในหน้าแอดมินแก้ไขหอ / ฟอร์มส่งหอ) */
export type NearbyPlaceCategory =
  | 'convenience'
  | 'gasStation'
  | 'restaurant'
  | 'market';

export interface RoadDistancesResult {
  /** ระยะทางถึงมมส (กม.) */
  msuKm: number;
  /** ระยะทางถึงแต่ละจุดใน NEARBY_PLACES (กม.) */
  places: { name: string; distanceKm: number; category: NearbyPlaceCategory }[];
  /** true ถ้าใช้ค่าโดยประมาณ (Haversine) เพราะ ORS ล้มหรือไม่มี API key */
  fallback: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DistanceService {
  // จุดอ้างอิง: มหาวิทยาลัยมหาสารคาม
  private readonly MSU_LAT = 16.2456421;
  private readonly MSU_LNG = 103.2511308;

  // ค่าเพิ่มเติมสำหรับระยะทางประมาณๆ (บวกเพิ่ม 0.2 กิโลเมตร)
  private readonly DISTANCE_BUFFER = 0.2;

  /** ระยะห่างสูงสุดตามประเภทสถานที่ (กม.) — ปรับทุกหมวดให้อยู่ในรัศมี 0.5 กม. */
  private readonly MAX_NEARBY_DISTANCES: Record<NearbyPlaceCategory, number> = {
    convenience: 0.5,
    market: 0.5,
    restaurant: 0.5,
    gasStation: 0.5,
  };

  // สถานที่ใกล้เคียงในขามเรียง
  private readonly NEARBY_PLACES = {
    // ร้านสะดวกซื้อ
    convenience: [
      {
        name: '7-Eleven สาขา เดอะพีช ขามเรียง',
        lat: 16.2508547,
        lng: 103.2397308,
      },
      { name: '7-Eleven 1 สาขา ขามเรียง', lat: 16.2489338, lng: 103.2421409 },
      { name: '7-Eleven 2 สาขา ขามเรียง', lat: 16.2503318, lng: 103.2400179 },
      {
        name: '7-Eleven สาขา ขามเรียงอินเตอร์',
        lat: 16.2528556,
        lng: 103.2346824,
      },
      { name: '7-Eleven สาขา กู่แก้ว', lat: 16.2508357, lng: 103.2521691 },
      { name: '7-Eleven สาขา หน้ามอ', lat: 16.2492252, lng: 103.2559607 },
      {
        name: '7-Eleven สาขา อัครฉัตร หน้ามอ',
        lat: 16.2503474,
        lng: 103.2596298,
      },
      { name: '7-Eleven สาขา หมู่บ้านลีลาวดี', lat: 16.2503012, lng: 103.2664386 },
      { name: '7-Eleven สาขา Expro ท่าขอนยาง', lat: 16.239634, lng: 103.2570236 },
      { name: 'เซเว่น ทางเข้าซอยวุ่นวาย', lat: 16.2386569, lng: 103.2575375 },
      { name: 'เซเว่น 2 ท่าขอนยาง', lat: 16.238443, lng: 103.2585643 },
      { name: 'เซเว่น ซอยวุ่นวาย', lat: 16.237414, lng: 103.2563543 },
      { name: 'เซเว่น หน้าตลาดท่าขอนยาง', lat: 16.2357176, lng: 103.2629939 },
      { name: 'เซเว่น สี่แยกท่าขอนยาง', lat: 16.2359637, lng: 103.2679446 },
      { name: 'เซเว่น เมธาแกรนด์', lat: 16.2334978, lng: 103.2612996 },
      { name: 'โลตัสขามเรียง', lat: 16.2491003, lng: 103.2422425 },
      {
        name: 'CJ MORE ซีเจ มอร์ สาขาขามเรียง',
        lat: 16.2505576,
        lng: 103.2398895,
      },
      { name: 'โลตัส โก เฟรช หน้ามอ', lat: 16.2496691, lng: 103.257024 },
      {
        name: 'โลตัส โก เฟรช Expro ท่าขอนยาง',
        lat: 16.2397183,
        lng: 103.2566924,
      },
      {
        name: 'โลตัส โก เฟรช มินิ หน้าตลาดโค้งท่าขอนยาง',
        lat: 16.2360557,
        lng: 103.2641917,
      },
      {
        name: 'CJ MORE ซีเจ มอร์ สาขาท่าขอนยาง',
        lat: 16.236744,
        lng: 103.2694809,
      },
    ],

    // สถานีน้ำมัน
    gasStation: [
      {
        name: 'PTT Station มหาวิทยาลัยมหาสารคาม',
        lat: 16.2494353,
        lng: 103.2413195,
      },
      { name: 'PTT Station ปตท.ท่าขอนยาง', lat: 16.2425404, lng: 103.2719803 },
    ],
    // ร้านอาหาร
    restaurant: [
      { name: 'ทีเอ หมูกระทะท่าขอนยาง', lat: 16.2394093, lng: 103.2563911 },
      { name: 'แชมป์หมูกระทะ ม.ใหม่', lat: 16.2505787, lng: 103.2616297 },
      { name: 'เดอะนัวหมูกระทะบุฟเฟต์', lat: 16.2505787, lng: 103.2616297 },
      { name: 'ร้านโพธิ์ศรีหมูกระทะ', lat: 16.2497468, lng: 103.2588857 },
      {
        name: 'สมเด็จหมูกระทะ มมส. ขามเรียง',
        lat: 16.2510184,
        lng: 103.2376733,
      },
      { name: 'เมย์มายหมูกระทะ', lat: 16.2522839, lng: 103.2361777 },
    ],
    // ตลาด
    market: [
      { name: 'ตลาดเทศบาลขามเรียง', lat: 16.2479841, lng: 103.2430838 },
      { name: 'ตลาดนัดคลองถม ท่าขอนยาง', lat: 16.2362807, lng: 103.2637046 },
    ],
  };

  /** ลำดับจุดปลายทางสำหรับ ORS: [มมส, ... flatten NEARBY_PLACES] (ไม่รวมร้านอาหาร – ไม่ใช้แสดงใน UI) */
  private getDestinationsList(): {
    name: string;
    lat: number;
    lng: number;
    category?: NearbyPlaceCategory;
  }[] {
    const list: {
      name: string;
      lat: number;
      lng: number;
      category?: NearbyPlaceCategory;
    }[] = [{ name: 'มมส', lat: this.MSU_LAT, lng: this.MSU_LNG }];
    const categories: Exclude<NearbyPlaceCategory, 'restaurant'>[] = [
      'convenience',
      'gasStation',
      'market',
    ];
    categories.forEach((key) => {
      this.NEARBY_PLACES[key].forEach((p) =>
        list.push({ name: p.name, lat: p.lat, lng: p.lng, category: key }),
      );
    });
    return list;
  }

  constructor(private http: HttpClient) {}

  /**
   * คำนวณระยะทางตามถนนจากพิกัดหอพักไปมมสและจุดใน NEARBY_PLACES (ORS Matrix API)
   * ถ้าไม่มี API key หรือ API ล้ม จะใช้ค่าโดยประมาณ (Haversine) และตั้ง fallback = true
   */
  getRoadDistancesFromDorm(
    dormLat: number,
    dormLng: number,
  ): Observable<RoadDistancesResult> {
    const destinations = this.getDestinationsList();
    const apiKey = (environment as { openRouteServiceApiKey?: string })
      .openRouteServiceApiKey;

    if (!apiKey) {
      return of(this.getRoadDistancesFallback(dormLat, dormLng));
    }

    const locations: [number, number][] = [
      [dormLng, dormLat],
      ...destinations.map((d) => [d.lng, d.lat] as [number, number]),
    ];
    const body = {
      locations,
      sources: [0],
      destinations: destinations.map((_, i) => i + 1),
      metrics: ['distance'],
    };

    return this.http
      .post<{
        distances?: number[][];
      }>('https://api.openrouteservice.org/v2/matrix/driving-car', body, { headers: { Authorization: apiKey, 'Content-Type': 'application/json' } })
      .pipe(
        map((res) => {
          const row = res.distances?.[0];
          if (!row || row.length !== destinations.length) {
            return this.getRoadDistancesFallback(dormLat, dormLng);
          }
          const msuKm = Math.round((row[0] / 1000) * 10) / 10;
          const places = destinations.slice(1).map((d, i) => ({
            name: d.name,
            distanceKm: Math.round((row[i + 1] / 1000) * 10) / 10,
            category: d.category as NearbyPlaceCategory,
          }));
          return { msuKm, places, fallback: false };
        }),
        catchError(() => of(this.getRoadDistancesFallback(dormLat, dormLng))),
      );
  }

  /** ใช้เมื่อ ORS ไม่พร้อม: ระยะมมสจาก Haversine, สถานที่อื่นจาก Haversine เช่นกัน */
  private getRoadDistancesFallback(
    dormLat: number,
    dormLng: number,
  ): RoadDistancesResult {
    const destinations = this.getDestinationsList();
    const msuKm = this.calculateDistance(
      dormLat,
      dormLng,
      this.MSU_LAT,
      this.MSU_LNG,
    );
    const places = destinations.slice(1).map((d) => ({
      name: d.name,
      distanceKm: this.calculateDistance(dormLat, dormLng, d.lat, d.lng),
      category: d.category as NearbyPlaceCategory,
    }));
    return { msuKm, places, fallback: true };
  }

  /**
   * คำนวณระยะทางระหว่างพิกัดสองจุด (เส้นตรง + ค่าประมาณ)
   * @param lat1 ละติจูดจุดที่ 1
   * @param lng1 ลองจิจูดจุดที่ 1
   * @param lat2 ละติจูดจุดที่ 2 (default: มหาวิทยาลัยมหาสารคาม)
   * @param lng2 ลองจิจูดจุดที่ 2 (default: มหาวิทยาลัยมหาสารคาม)
   * @returns ระยะทางเป็นกิโลเมตร (ทศนิยม 1 ตำแหน่ง)
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number = this.MSU_LAT,
    lng2: number = this.MSU_LNG,
  ): number {
    const R = 6371; // รัศมีโลกเป็นกิโลเมตร
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightLineDistance = R * c;

    // บวกเพิ่ม 0.2 กิโลเมตรเพื่อให้เป็นระยะทางประมาณๆ
    const approximateDistance = straightLineDistance + this.DISTANCE_BUFFER;

    return Math.round(approximateDistance * 10) / 10; // ทศนิยม 1 ตำแหน่ง
  }

  /**
   * หาสถานที่ใกล้เคียงตามระยะห่าง (แต่ละประเภทมีระยะห่างที่แตกต่างกัน)
   * @param dormLat ละติจูดหอพัก
   * @param dormLng ลองจิจูดหอพัก
   * @returns รายชื่อสถานที่ใกล้เคียง
   */
  getNearbyPlaces(dormLat: number, dormLng: number): string[] {
    const nearbyPlaces: string[] = [];
    const categories: Exclude<NearbyPlaceCategory, 'restaurant'>[] = [
      'convenience',
      'gasStation',
      'market',
    ];

    categories.forEach((category) => {
      const maxDistance = this.MAX_NEARBY_DISTANCES[category];
      this.NEARBY_PLACES[category].forEach((place) => {
        const distance = this.calculateDistance(
          dormLat,
          dormLng,
          place.lat,
          place.lng,
        );
        if (distance <= maxDistance) {
          nearbyPlaces.push(place.name);
        }
      });
    });

    return nearbyPlaces;
  }

  /**
   * สรุปข้อความ "ใกล้อะไรบ้าง" จากผล ORS (ตามถนน) หรือ fallback (โดยประมาณ)
   * - convenience: ภายใน 0.5 กม.
   * - market: ภายใน 1 กม.
   * - gasStation: เลือกที่ใกล้สุดเสมอ (แสดงทุกหอ)
   * หมายเหตุ: หมวดร้านอาหารไม่ใช้ในระบบแล้ว (ไม่คำนวณ/ไม่แสดง)
   */
  buildNearbySummaryTextFromRoad(
    places: RoadDistancesResult['places'],
    fallback: boolean,
  ): string {
    if (!places || places.length === 0) return '';

    const label: Record<NearbyPlaceCategory, string> = {
      convenience: 'ร้านสะดวกซื้อ',
      market: 'ตลาด',
      restaurant: 'ร้านอาหาร',
      gasStation: 'สถานีน้ำมัน',
    };

    const pickNearest = (cat: NearbyPlaceCategory, always = false) => {
      const filtered = places
        .filter((p) => p.category === cat)
        .filter((p) => always || p.distanceKm <= this.MAX_NEARBY_DISTANCES[cat])
        .sort((a, b) => a.distanceKm - b.distanceKm);
      return filtered[0] || null;
    };

    const picked: {
      cat: NearbyPlaceCategory;
      item: RoadDistancesResult['places'][number];
    }[] = [];

    const conv = pickNearest('convenience');
    if (conv) picked.push({ cat: 'convenience', item: conv });

    const market = pickNearest('market');
    if (market) picked.push({ cat: 'market', item: market });

    const gas = pickNearest('gasStation');
    if (gas) picked.push({ cat: 'gasStation', item: gas });

    if (picked.length === 0) return '';

    const parts = picked.map(
      ({ cat, item }) =>
        `${label[cat]}: ${item.name} (${item.distanceKm.toFixed(1)} กม.)`,
    );
    const mode = fallback ? 'โดยประมาณ' : 'ตามถนน';
    return `ใกล้เคียง (${mode}): ${parts.join(' • ')}`;
  }

  /**
   * สร้างข้อความสถานที่ใกล้เคียง (แนวตั้งพร้อม Heroicons)
   * @param dormLat ละติจูดหอพัก
   * @param dormLng ลองจิจูดหอพัก
   * @returns ข้อความสถานที่ใกล้เคียง
   */
  getNearbyPlacesText(dormLat: number, dormLng: number): string {
    const nearbyPlaces = this.getNearbyPlaces(dormLat, dormLng);

    if (nearbyPlaces.length === 0) {
      return '';
    }

    // จัดกลุ่มตามประเภทและจำกัดจำนวน
    const categorizedPlaces = this.categorizeNearbyPlaces(nearbyPlaces);
    let result = '\n\n<div class="nearby-places-vertical">\n';

    // สร้าง HTML สำหรับแต่ละประเภท
    Object.entries(categorizedPlaces).forEach(([category, places]) => {
      if (places.length > 0) {
        const categoryData = {
          convenience: { icon: '🏪', name: 'ร้านสะดวกซื้อ' },
          gasStation: { icon: '⛽', name: 'สถานีน้ำมัน' },
          restaurant: { icon: '🍽️', name: 'ร้านอาหาร' },
          market: { icon: '🛍️', name: 'ตลาด' },
        };

        const catInfo = categoryData[category as keyof typeof categoryData];

        result += `  <div class="place-category">\n`;
        result += `    <div class="category-header">\n`;
        result += `      <span class="category-icon">${catInfo.icon}</span>\n`;
        result += `      <span class="category-name">${catInfo.name}</span>\n`;
        result += `    </div>\n`;
        result += `    <div class="place-list">\n`;

        places.slice(0, 3).forEach((place) => {
          result += `      <div class="place-item">• ${place}</div>\n`;
        });

        result += `    </div>\n`;
        result += `  </div>\n`;
      }
    });

    result += `</div>\n`;
    return result;
  }

  /**
   * จัดกลุ่มสถานที่ตามประเภท
   */
  private categorizeNearbyPlaces(places: string[]): Record<string, string[]> {
    const categorized: Record<string, string[]> = {
      convenience: [],
      gasStation: [],
      restaurant: [],
      market: [],
    };

    places.forEach((place) => {
      Object.entries(this.NEARBY_PLACES).forEach(
        ([category, categoryPlaces]) => {
          if (categoryPlaces.some((p) => p.name === place)) {
            categorized[category].push(place);
          }
        },
      );
    });

    return categorized;
  }

  /**
   * แปลงองศาเป็นเรเดียน
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * สร้างข้อความระยะทางสำหรับแทรกใน description
   * @param dormName ชื่อหอพัก
   * @param zoneName ชื่อโซน
   * @param distanceKm ระยะทางเป็นกิโลเมตร
   * @returns ข้อความระยะทาง
   */
  createDistanceText(
    dormName: string,
    zoneName: string,
    distanceKm: number,
  ): string {
    let distanceText: string;

    if (distanceKm < 1.0) {
      // แปลงเป็นเมตรเมื่อน้อยกว่า 1 กิโลเมตร
      const distanceMeters = Math.round(distanceKm * 1000);
      distanceText = `${distanceMeters} เมตร`;
    } else {
      // แสดงเป็นกิโลเมตรเมื่อมากกว่าหรือเท่ากับ 1 กิโลเมตร
      distanceText = `${distanceKm} กิโลเมตร`;
    }

    return `หอพัก ${dormName} ${zoneName} ห่างจาก มมส ม.ใหม่ ประมาณ ${distanceText}`;
  }
}
