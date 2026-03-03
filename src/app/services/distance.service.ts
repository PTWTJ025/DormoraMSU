import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DistanceService {
  // จุดอ้างอิง: มหาวิทยาลัยมหาสารคาม
  private readonly MSU_LAT = 16.2456421;
  private readonly MSU_LNG = 103.2511308;

  // ค่าเพิ่มเติมสำหรับระยะทางประมาณๆ (บวกเพิ่ม 0.2 กิโลเมตร)
  private readonly DISTANCE_BUFFER = 0.2;

  // สถานที่ใกล้เคียงในขามเรียง
  private readonly NEARBY_PLACES = {
    // ร้านสะดวกซื้อ
    convenience: [
      { name: 'เซเว่น The Peace ขามเรียง', lat: 16.251044, lng: 103.239992 },
      { name: 'เซเว่น 1 ขามเรียง', lat: 16.2488312, lng: 103.2421828 },
      { name: 'เซเว่น 2 ขามเรียง', lat: 16.2503825, lng: 103.2398544 },
      { name: 'เซเว่น 3 ขามเรียง อินเตอร์', lat: 16.2531641, lng: 103.234726 },
      { name: 'เซเว่น กู่แก้ว', lat: 16.2507937, lng: 103.2516967 },
      { name: 'เซเว่น หน้ามอ', lat: 16.2493062, lng: 103.2558368 },
      { name: 'เซเว่น หน้ามอ อัครฉัตร', lat: 16.2504317, lng: 103.2595051 },
      { name: 'เซเว่น 1 ท่าขอนยาง', lat: 16.2398196, lng: 103.256362 },
      { name: 'เซเว่น 2 ท่าขอนยาง', lat: 16.238443, lng: 103.2585643 },
      { name: 'เซเว่น ซอยวุ่นวาย', lat: 16.237414, lng: 103.2563543 },
      { name: 'เซเว่น หน้าตลาดท่าขอนยาง', lat: 16.2357176, lng: 103.2629939 },
      { name: 'เซเว่น สี่แยกท่าขอนยาง', lat: 16.2359637, lng: 103.2679446 },
      { name: 'เซเว่น เมธาแกรนด์', lat: 16.2334978, lng: 103.2612996 },
    ],
    // ซูเปอร์มาร์เก็ต
    supermarket: [
      { name: 'โลตัสขามเรียง', lat: 16.2491003, lng: 103.2422425 },
      { name: 'CJ ขามเรียง', lat: 16.2503825, lng: 103.2398544 },
      { name: 'โลตัสหน้ามอ', lat: 16.2497371, lng: 103.2571779 },
      { name: 'โลตัสท่าขอนยาง', lat: 16.2398196, lng: 103.256362 },
      { name: 'โลตัสท่าขอนยาง 2', lat: 16.2361486, lng: 103.2650503 },
      { name: 'CJ MORE ท่าขอนยาง', lat: 16.2359444, lng: 103.2642849 },
    ],
    // สถานีน้ำมัน
    gasStation: [
      { name: 'PTT Station มหาวิทยาลัยมหาสารคาม', lat: 16.2494924, lng: 103.2410536 },
      { name: 'PTT กันทรวิชัย', lat: 16.2358084, lng: 103.2674986 },
    ],
    // ร้านอาหาร
    restaurant: [
      { name: 'ทีเอ หมูกระทะท่าขอนยาง', lat: 16.2394093, lng: 103.2563911 },
      { name: 'แชมป์หมูกระทะ ม.ใหม่', lat: 16.2505787, lng: 103.2616297 },
      { name: 'เดอะนัวหมูกระทะบุฟเฟต์', lat: 16.2505787, lng: 103.2616297 },
      { name: 'ร้านโพธิ์ศรีหมูกระทะ', lat: 16.2496958, lng: 103.2590772 },
      { name: 'สมเด็จหมูกระทะ มมส. ขามเรียง', lat: 16.2509078, lng: 103.2375079 },
      { name: 'เมย์มาย', lat: 16.2522347, lng: 103.2364636 },
      { name: 'เมย์มายหมูกระทะ ขามเรียง', lat: 16.2499466, lng: 103.2661046 },
    ],
    // ตลาด
    market: [
      { name: 'ตลาดเทศบาลขามเรียง', lat: 16.2479841, lng: 103.2430838 },
      { name: 'ตลาดท่าขอนยาง', lat: 16.2359444, lng: 103.2642849 },
    ]
  };

  constructor() { }

  /**
   * คำนวณระยะทางระหว่างพิกัดสองจุด (เส้นตรง + ค่าประมาณ)
   * @param lat1 ละติจูดจุดที่ 1
   * @param lng1 ลองจิจูดจุดที่ 1
   * @param lat2 ละติจูดจุดที่ 2 (default: มหาวิทยาลัยมหาสารคาม)
   * @param lng2 ลองจิจูดจุดที่ 2 (default: มหาวิทยาลัยมหาสารคาม)
   * @returns ระยะทางเป็นกิโลเมตร (ทศนิยม 1 ตำแหน่ง)
   */
  calculateDistance(lat1: number, lng1: number, lat2: number = this.MSU_LAT, lng2: number = this.MSU_LNG): number {
    const R = 6371; // รัศมีโลกเป็นกิโลเมตร
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

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

    // กำหนดระยะห่างสูงสุดตามประเภทสถานที่
    const maxDistances = {
      convenience: 0.5,    // ร้านสะดวกซื้อ: 500 เมตร
      supermarket: 0.5,    // ซูเปอร์มาร์เก็ต: 500 เมตร
      gasStation: 1,       // สถานีน้ำมัน: 1 กิโลเมตร
      restaurant: 2,       // ร้านอาหาร: 2 กิโลเมตร
      market: 1            // ตลาด: 1 กิโลเมตร
    };

    // วนลูปตามประเภทสถานที่
    Object.entries(this.NEARBY_PLACES).forEach(([category, places]) => {
      const maxDistance = maxDistances[category as keyof typeof maxDistances];

      places.forEach(place => {
        const distance = this.calculateDistance(dormLat, dormLng, place.lat, place.lng);
        if (distance <= maxDistance) {
          nearbyPlaces.push(place.name);
        }
      });
    });

    return nearbyPlaces;
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
          supermarket: { icon: '🛒', name: 'ซูเปอร์มาร์เก็ต' },
          gasStation: { icon: '⛽', name: 'สถานีน้ำมัน' },
          restaurant: { icon: '🍽️', name: 'ร้านอาหาร' },
          market: { icon: '🛍️', name: 'ตลาด' }
        };
        
        const catInfo = categoryData[category as keyof typeof categoryData];
        
        result += `  <div class="place-category">\n`;
        result += `    <div class="category-header">\n`;
        result += `      <span class="category-icon">${catInfo.icon}</span>\n`;
        result += `      <span class="category-name">${catInfo.name}</span>\n`;
        result += `    </div>\n`;
        result += `    <div class="place-list">\n`;
        
        places.slice(0, 3).forEach(place => {
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
      supermarket: [],
      gasStation: [],
      restaurant: [],
      market: []
    };

    places.forEach(place => {
      Object.entries(this.NEARBY_PLACES).forEach(([category, categoryPlaces]) => {
        if (categoryPlaces.some(p => p.name === place)) {
          categorized[category].push(place);
        }
      });
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
  createDistanceText(dormName: string, zoneName: string, distanceKm: number): string {
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