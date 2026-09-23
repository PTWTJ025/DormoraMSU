# 📘 เอกสารออกแบบระบบและโฟลว์การทำงาน (System Architecture & Flow Design)
## โครงการ DormoraMSU: การเพิ่มระบบสมาชิกและตลาดส่งต่อสัญญา/ขายประกันหอพัก

---

## 1. ภาพรวมและสถานะปัจจุบันของระบบ (Current System Overview)

ปัจจุบัน **DormoraMSU** เป็นเว็บแอปพลิเคชันค้นหาและรวบรวมข้อมูลหอพักรอบมหาวิทยาลัยมหาสารคาม (มมส) โดยมีโครงสร้างการทำงานเดิมดังนี้:

### 🔄 โฟลว์การทำงานในปัจจุบัน (Current Workflow)
1. **ผู้ใช้งานทั่วไป (Public Visitors)**:
   - สามารถเข้าชมหน้าเว็บ ค้นหาหอพัก กรองตามโซน/ราคา/สิ่งอำนวยความสะดวก ดูแผนที่แบบ Interactive และเปรียบเทียบหอพักได้ทันทีโดยไม่ต้องล็อกอิน
2. **การส่งข้อมูลหอพัก (Dorm Submission)**:
   - เปิดให้ใครก็ได้กรอกฟอร์ม 4 ขั้นตอนที่หน้า `/dorm-submit` เพื่อส่งข้อมูลหอพักใหม่ (ที่ตั้ง, พิกัด Map, อัปโหลดรูปภาพขึ้น Supabase Storage, สิ่งอำนวยความสะดวก)
   - ข้อมูลที่ส่งจะอยู่ในสถานะ **"รออนุมัติ (Pending)"**
3. **ระบบผู้ดูแลระบบ (Admin Management)**:
   - แอดมินเข้าสู่ระบบผ่าน Firebase Auth ที่หน้า `/admin/login` เพื่อเข้าสู่ Dashboard `/admin`
   - แอดมินทำหน้าที่ตรวจสอบข้อมูลหอพัก ตรวจจับหอพักซ้ำ (Duplicate Check) และกด **อนุมัติ (Approve)** หรือ **ไม่อนุมัติ (Reject)** ข้อมูลหอพักก่อนขึ้นแสดงบนหน้าเว็บหลัก

```mermaid
flowchart LR
    A["ผู้ใช้ทั่วไป/เจ้าของหอ"] -->|กรอกฟอร์ม 4 ขั้นตอน| B["ส่งข้อมูลหอพัก /dorm-submit"]
    B -->|บันทึกสถานะ Pending| C[("Database: Dormitories")]
    D["แอดมิน"] -->|เข้าสู่ระบบ /admin/login| E["Admin Dashboard"]
    E -->|ตรวจสอบ / ตรวจหอซ้ำ| C
    E -->|กด Approve| F["แสดงผลบนหน้าเว็บหลัก /dorm-list"]
```

### ⚠️ ข้อจำกัดของระบบปัจจุบัน
* **ผู้ส่งข้อมูลไม่สามารถติดตามหรือจัดการข้อมูลได้**: ผู้ลงประกาศไม่สามารถกลับมาแก้ไข ลบ หรืออัปเดตสถานะห้องว่าง/เต็มได้ด้วยตัวเอง เนื่องจากไม่มีระบบผูกกับบัญชีผู้ใช้
* **ยังไม่ตอบโจทย์ความต้องการเรื่องสัญญาหอพัก**: นิสิต มมส มีความต้องการสูงมากในการหาคนมาเช่าหอต่อเพื่อขอรับเงินประกันคืน (การขายสัญญา/ขายประกันหอพัก) ซึ่งปัจจุบันยังไม่มีพื้นที่รองรับในระบบ

---

## 2. คอนเซปต์การพัฒนาระบบใหม่ (Enhanced Concept: Single Account + Post Types)

เพื่อแก้ไขข้อจำกัดเดิมและขยายศักยภาพของแพลตฟอร์ม เราจะใช้แนวทาง **"สมัครสมาชิกบัญชีเดียว (Single Member Account) แล้วแยกฟังก์ชันตามประเภทการโพสต์ (Post-Type Based)"**

```
                  ┌─────────────────────────────────┐
                  │      ผู้ใช้งานสมัครสมาชิก/เข้าสู่ระบบ     │
                  │       (Single Member Account)   │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │       กดปุ่ม "+ ลงประกาศใหม่"      │
                  └────────────────┬────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
    ┌───────────────────────────┐       ┌───────────────────────────┐
    │ 🏢 โพสต์โปรโมทหอพักให้เช่า   │       │ 🔑 โพสต์ส่งต่อสัญญา/ขายประกัน │
    │ (สำหรับเจ้าของหอ/ผู้ดูแล)    │       │ (สำหรับนิสิต/ผู้เช่าเดิม)     │
    └───────────────────────────┘       └───────────────────────────┘
```

### 🌟 ประโยชน์ของแนวทางนี้
1. **สมัครง่าย (Frictionless Onboarding)**: นิสิตหรือเจ้าของหอพักสมัครด้วยขั้นตอนเดียวกัน ไม่ต้องกังวลเรื่องการเลือก Role ผิด
2. **ความยืดหยุ่นสูง (High Flexibility)**: บัญชีเดียวกันสามารถโพสต์โปรโมทหอพัก หรือจะโพสต์ส่งต่อสัญญาหอพักก็ได้
3. **เชื่อมโยงข้อมูลหอพักเดิม (Data Synergy)**: นิสิตที่ต้องการขายสัญญา สามารถเลือกผูกกับข้อมูลหอพักที่มีอยู่ในระบบได้ทันที ทำให้ไม่ต้องเสียเวลาพิมพ์พิกัดหรือข้อมูลหอพักใหม่ทั้งหมด
4. **รองรับการขยายตัวในอนาคต (Scalability)**: สามารถเพิ่มประเภทโพสต์ใหม่ เช่น *"หารูมเมท (Find Roommate)"* หรือ *"ส่งต่อของใช้ในหอ"* ได้ทันทีโดยไม่ต้องปรับโครงสร้างสิทธิ์

---

## 3. แผนภาพลำดับการทำงานแบบละเอียด (Detailed System Flows)

### 3.1 Flow การสมัครและเข้าสู่ระบบ (Authentication Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as ผู้ใช้งาน (นิสิต / เจ้าของหอ)
    participant Web as Frontend (Angular)
    participant Auth as Firebase Auth / Backend API
    participant DB as PostgreSQL Database

    User->>Web: กดเข้าสู่ระบบ / สมัครสมาชิก
    Web->>Auth: ทำการ Login ด้วย Google หรือ Email/Password
    Auth-->>Web: ส่ง Token & User Profile กลับมา
    Web->>Auth: ซิงค์ข้อมูลผู้ใช้ไปยัง Backend
    Auth->>DB: บันทึก/อัปเดตข้อมูลลงตาราง users (role: 'member')
    Web-->>User: แสดงสถานะเข้าสู่ระบบสำเร็จ (พร้อมเมนูโปรไฟล์และปุ่มลงประกาศ)
```

---

### 3.2 Flow A: การลงประกาศหอพักให้เช่า (Dorm Listing Flow - เจ้าของหอ)

```mermaid
flowchart TD
    Start(["ผู้ใช้กดปุ่ม + ลงประกาศ"]) --> Choice{"เลือกประเภทการประกาศ"}
    Choice -->|เลือก: โปรโมทหอพัก| Step1["ขั้นตอนที่ 1: ข้อมูลพื้นฐาน & ผู้ติดต่อ"]
    Step1 --> Step2["ขั้นตอนที่ 2: ปักหมุดพิกัด & โซนบนแผนที่"]
    Step2 --> Step3["ขั้นตอนที่ 3: อัปโหลดรูปภาพหอพัก Supabase"]
    Step3 --> Step4["ขั้นตอนที่ 4: ประเภทห้อง ราคา ค่าน้ำ-ไฟ สิ่งอำนวยความสะดวก"]
    Step4 --> Submit["กดยืนยันการส่งข้อมูล"]
    Submit --> Pending[("บันทึกหอพัก สถานะ: Pending")]
    Pending --> Notify["แจ้งเตือนผู้ใช้: อยู่ระหว่างรอแอดมินตรวจสอบ"]
    
    AdminCheck["แอดมินตรวจสอบที่ Dashboard"] --> Decision{"ผลการตรวจสอบ"}
    Decision -->|อนุมัติ| Approved[("สถานะ: Approved")]
    Decision -->|ไม่อนุมัติ| Rejected[("สถานะ: Rejected + เหตุผล")]
    Approved --> Live["แสดงบนหน้าหลักและหน้ารายการหอพัก"]
```

---

### 3.3 Flow B: การส่งต่อสัญญา / ขายประกันหอพัก (Contract Transfer Flow - นิสิต)

```mermaid
flowchart TD
    Start(["ผู้ใช้กดปุ่ม + ลงประกาศ"]) --> Choice{"เลือกประเภทการประกาศ"}
    Choice -->|เลือก: ส่งต่อสัญญา/ขายประกัน| SearchDorm["ค้นหาและเลือกหอพักเดิมในระบบ หรือระบุชื่อหอพัก"]
    SearchDorm --> ContractDetails["กรอกรายละเอียดสัญญา:
    - ค่าประกันเดิม / ราคาขายต่อสัญญา
    - ค่าเช่าต่อเดือน
    - วันที่เริ่มเข้าอยู่ได้ & วันสิ้นสุดสัญญา
    - ประเภทห้อง & ชั้น
    - สิ่งที่แถมฟรี/ของแถม (ถ้ามี)"]
    ContractDetails --> UploadRoomImages["อัปโหลดรูปภาพห้องจริง / สัญญา"]
    UploadRoomImages --> ContactInfo["ระบุช่องทางติดต่อด่วน Facebook / Line / Tel"]
    ContactInfo --> Publish["กดยืนยันการลงประกาศ"]
    Publish --> ActivePost[("บันทึกสัญญา สถานะ: Active")]
    ActivePost --> ContractMarketplace["แสดงบนหน้าตลาดส่งต่อสัญญาหอพักทันที"]
```

---

### 3.4 Flow C: การจัดการประกาศของฉัน (My Posts Management)

ผู้ใช้สามารถเข้าถึงหน้า **"ประกาศของฉัน (My Posts)"** เพื่อดูรายการทั้งหมดที่ตนเองเคยสร้างไว้:

```mermaid
flowchart LR
    MyPosts["หน้าประกาศของฉัน /my-posts"] --> Tab1["แท็บ: หอพักของฉัน"]
    MyPosts --> Tab2["แท็บ: สัญญาที่ส่งต่อของฉัน"]
    
    Tab1 --> Action1["ดูสถานะ รออนุมัติ/อนุมัติแล้ว | แก้ไขข้อมูล | แจ้งห้องเต็ม"]
    Tab2 --> Action2["แก้ไขราคาประกัน | ทำเครื่องหมาย: ปิดการขายแล้ว (Sold Out) | ลบประกาศ"]
```

---

## 4. การออกแบบโครงสร้างฐานข้อมูล (Database Schema Enhancement)

```mermaid
erDiagram
    USERS ||--o{ DORMITORIES : "owns/creates"
    USERS ||--o{ CONTRACT_TRANSFERS : "posts"
    DORMITORIES ||--o{ CONTRACT_TRANSFERS : "referenced_in"
    DORMITORIES ||--o{ DORM_IMAGES : "has"
    CONTRACT_TRANSFERS ||--o{ CONTRACT_IMAGES : "has"

    USERS {
        int user_id PK
        string firebase_uid UK
        string email
        string display_name
        string phone_number
        string line_id
        string avatar_url
        enum role "member | admin"
        timestamp created_at
    }

    DORMITORIES {
        int dorm_id PK
        int created_by_user_id FK
        string dorm_name
        int zone_id FK
        text address
        decimal latitude
        decimal longitude
        decimal min_price
        decimal max_price
        enum approval_status "pending | approved | rejected"
        string status_dorm "ว่าง | เต็ม"
        timestamp created_at
    }

    CONTRACT_TRANSFERS {
        int contract_id PK
        int user_id FK "ผู้โพสต์สัญญา"
        int dorm_id FK "อ้างอิงหอพักในระบบ (optional)"
        string custom_dorm_name "กรณีไม่มีหอพักในระบบ"
        string zone_name
        decimal original_deposit "ค่าประกันเต็ม"
        decimal transfer_price "ราคาขายต่อประกัน"
        decimal monthly_rent "ค่าเช่ารายเดือน"
        date available_from "พร้อมเข้าอยู่ได้ตั้งแต่"
        date contract_end_date "วันหมดสัญญา"
        string room_type "เช่น แอร์ ชั้น 3"
        text details "รายละเอียดเพิ่มเติม/ของแถม"
        string contact_phone
        string contact_line
        string contact_facebook
        enum status "active | sold | closed"
        timestamp created_at
        timestamp updated_at
    }

    CONTRACT_IMAGES {
        int image_id PK
        int contract_id FK
        string image_url
        boolean is_primary
    }
```

---

## 5. การออกแบบหน้าจอและส่วนติดต่อผู้ใช้งาน (UI/UX Specification)

| หน้าจอ (Screen) | เส้นทาง (Route) | รายละเอียดและฟังก์ชันการทำงาน |
|---|---|---|
| **แถบนำทาง (Navbar)** | ทุกหน้า | เพิ่มแท็บ **"ตลาดส่งต่อสัญญา"** และปุ่ม **"+ ลงประกาศ"** พร้อม Dropdown โปรไฟล์ผู้ใช้ |
| **หน้าเลือกประเภทประกาศ** | `/create-post` | เลือกระหว่างการ์ด 2 แบบ: <br>1. 🏢 *โปรโมทหอพัก* (เข้าสู่ Dorm Submit Form)<br>2. 🔑 *ส่งต่อสัญญาหอ* (เข้าสู่ Contract Submit Form) |
| **หน้าตลาดส่งต่อสัญญา** | `/contracts` | หน้ารวมการ์ดโพสต์ส่งต่อสัญญา พร้อมตัวกรอง (โซน, ช่วงราคาประกัน, ค่าเช่าต่อเดือน, วันพร้อมเข้าอยู่) |
| **หน้ารายละเอียดสัญญา** | `/contracts/:id` | แสดงรูปห้องจริง, ข้อมูลหอพัก, ราคาขายต่อประกันเทียบกับราคาเต็ม, วันหมดสัญญา, และปุ่มติดต่อผู้โพสต์ (โทร/Line/Facebook) |
| **หน้าประกาศของฉัน** | `/my-posts` | จัดการประกาศทั้งหมดของผู้ใช้ (แก้ไข, ลบ, สลับสถานะห้องว่าง/ปิดการขาย) |
| **หน้า Admin Moderation** | `/admin` | เพิ่มแท็บสำหรับตรวจสอบและจัดการทั้งหอพักใหม่ และประกาศส่งต่อสัญญา |

---

## 6. แผนการดำเนินงาน (Implementation Roadmap)

1. **Phase 1: Authentication & User Profile System**
   - เปิดระบบสมัครสมาชิก/เข้าสู่ระบบสำหรับผู้ใช้ทั่วไป (Member Login via Firebase & Backend User Sync)
   - ปรับปรุง Navigation Bar ให้รองรับ Profile Dropdown และปุ่มสร้างประกาศ
2. **Phase 2: Contract Transfer Module (Frontend & Backend)**
   - สร้างตาราง `contract_transfers` และ `contract_images` ในฐานข้อมูล
   - พัฒนา REST APIs สำหรับ CRUD โพสต์ส่งต่อสัญญา
   - พัฒนาหน้าฟอร์มสร้างประกาศส่งต่อสัญญา (`/contracts/create`) พร้อมระบบเลือกหอพักเดิม
   - พัฒนาหน้ารวมตลาดส่งต่อสัญญา (`/contracts`) และหน้ารายละเอียดสัญญา (`/contracts/:id`)
3. **Phase 3: My Posts & Management Dashboard**
   - พัฒนาหน้า "ประกาศของฉัน (`/my-posts`)" ให้ผู้ใช้จัดการโพสต์ตัวเองได้
   - เพิ่มระบบเปลี่ยนสถานะเป็น "ปิดการขายแล้ว (Sold Out)"
4. **Phase 4: Admin Moderation & Polish**
   - เพิ่มแท็บตรวจสอบและดูแลความเรียบร้อยของตลาดสัญญาในหน้า `/admin`
   - ทดสอบความปลอดภัย และความลื่นไหลของระบบบนมือถือ (Responsive UI)

