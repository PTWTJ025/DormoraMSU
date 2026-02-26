import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  /**
   * อัปโหลดรูปขึ้น Supabase Storage
   * @param file ไฟล์รูปที่จะอัปโหลด
   * @param path พาธที่จะเก็บไฟล์ (เช่น 'dorm-drafts/')
   * @returns Promise<string> URL ของรูปที่อัปโหลด
   */
  async uploadImage(file: File, path: string): Promise<{ url: string; error: Error | null }> {
    try {
      // สร้างชื่อไฟล์แบบสุ่มเพื่อไม่ซ้ำกัน
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const fullPath = `${path}${fileName}`;

      // อัปโหลดไฟล์ขึ้น Supabase
      const { data, error } = await this.supabase.storage
        .from('dormitory-images')
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Error uploading image:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: (error as any).details || 'N/A',
          hint: (error as any).hint || 'N/A'
        });
        return { url: '', error };
      }

      // ดึง public URL ของไฟล์ที่อัปโหลด
      const { data: { publicUrl } } = this.supabase.storage
        .from('dormitory-images')
        .getPublicUrl(fullPath);

      return { url: publicUrl, error: null };
    } catch (error) {
      console.error('Unexpected error uploading image:', error);
      return { url: '', error: error as Error };
    }
  }

  /**
   * อัปโหลดหลายรูปพร้อมกัน
   * @param files อาร์เรย์ของไฟล์รูป
   * @param path พาธที่จะเก็บไฟล์
   * @returns Promise<string[]> อาร์เรย์ของ URL
   */
  async uploadMultipleImages(files: File[], path: string): Promise<{ urls: string[]; errors: Error[] }> {
    const urls: string[] = [];
    const errors: Error[] = [];

    for (const file of files) {
      const result = await this.uploadImage(file, path);
      if (result.url) {
        urls.push(result.url);
      }
      if (result.error) {
        errors.push(result.error);
      }
    }

    return { urls, errors };
  }

  /**
   * ลบไฟล์ใน Supabase Storage
   * @param path พาธของไฟล์ที่จะลบ
   */
  async deleteImage(path: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.storage
        .from('dormitory-images')
        .remove([path]);

      return { error };
    } catch (error) {
      console.error('Error deleting image:', error);
      return { error: error as Error };
    }
  }

  /**
   * ย้ายไฟล์จาก draft ไปยัง production folder
   * @param oldPath พาธเก่า (เช่น 'dorm-drafts/xxx.jpg')
   * @param newPath พาธใหม่ (เช่น 'dorms/123/xxx.jpg')
   */
  async moveImage(oldPath: string, newPath: string): Promise<{ error: Error | null }> {
    try {
      // ดาวน์โหลดไฟล์เก่า
      const { data: fileData, error: downloadError } = await this.supabase.storage
        .from('dormitory-images')
        .download(oldPath);

      if (downloadError) {
        return { error: downloadError };
      }

      // อัปโหลดไฟล์ไปยังที่ใหม่
      const { error: uploadError } = await this.supabase.storage
        .from('dormitory-images')
        .upload(newPath, fileData, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        return { error: uploadError };
      }

      // ลบไฟล์เก่า
      const { error: deleteError } = await this.supabase.storage
        .from('dormitory-images')
        .remove([oldPath]);

      return { error: deleteError };
    } catch (error) {
      console.error('Error moving image:', error);
      return { error: error as Error };
    }
  }
}
