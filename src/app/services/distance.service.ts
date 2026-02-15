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
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const straightLineDistance = R * c;
    
    // บวกเพิ่ม 0.2 กิโลเมตรเพื่อให้เป็นระยะทางประมาณๆ
    const approximateDistance = straightLineDistance + this.DISTANCE_BUFFER;
    
    return Math.round(approximateDistance * 10) / 10; // ทศนิยม 1 ตำแหน่ง
  }

  /**
   * แปลงองศาเป็นเรเดียน
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * สร้างข้อความระยะทางสำหรับแทรกใน description
   * @param dormName ชื่อหอพัก
   * @param zoneName ชื่อโซน
   * @param distanceKm ระยะทางเป็นกิโลเมตร
   * @returns ข้อความระยะทาง
   */
  createDistanceText(dormName: string, zoneName: string, distanceKm: number): string {
    return `หอพัก ${dormName} ${zoneName} ห่างจาก มหาวิทยาลัยมหาสารคามประมาณ ${distanceKm} กิโลเมตร`;
  }

  /**
   * แยกข้อความระยะทางออกจาก description
   * @param description รายละเอียดหอพักที่มี mock text รวมอยู่
   * @returns object ที่แยก distanceText และ description
   */
  splitDescription(description: string): { distanceText: string; description: string } {
    if (!description) {
      return { distanceText: '', description: '' };
    }

    // Pattern สำหรับจับ mock text
    const distancePattern = /^หอพัก .+ ห่างจาก มหาวิทยาลัยมหาสารคามประมาณ \d+\.?\d* กิโลเมตร/;
    const match = description.match(distancePattern);
    
    if (match) {
      const distanceText = match[0];
      const remainingDescription = description.replace(distanceText, '').trim();
      
      return {
        distanceText: distanceText,
        description: remainingDescription
      };
    }
    
    return {
      distanceText: '',
      description: description
    };
  }

  /**
   * รวม distance text กับ description
   * @param distanceText ข้อความระยะทาง
   * @param description รายละเอียดหอพัก
   * @returns description ที่รวมกันแล้ว
   */
  combineDescription(distanceText: string, description: string): string {
    if (!distanceText) {
      return description;
    }
    
    return description ? `${distanceText}\n\n${description}` : distanceText;
  }
}