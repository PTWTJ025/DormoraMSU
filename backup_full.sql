--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (6bc9ef8)
-- Dumped by pg_dump version 17.5

-- Started on 2025-10-23 04:05:07

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.stay_history DROP CONSTRAINT stay_history_user_id_fkey;
ALTER TABLE ONLY public.stay_history DROP CONSTRAINT stay_history_dorm_id_fkey;
ALTER TABLE ONLY public.room_types DROP CONSTRAINT room_types_dorm_id_fkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_user_id_fkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_dorm_id_fkey;
ALTER TABLE ONLY public.member_requests DROP CONSTRAINT member_requests_user_id_fkey;
ALTER TABLE ONLY public.member_requests DROP CONSTRAINT member_requests_dorm_id_fkey;
ALTER TABLE ONLY public.dormitories DROP CONSTRAINT fk_zone;
ALTER TABLE ONLY public.users DROP CONSTRAINT fk_users_residence_dorm;
ALTER TABLE ONLY public.users DROP CONSTRAINT fk_residence_dorm;
ALTER TABLE ONLY public.dormitories DROP CONSTRAINT fk_owner;
ALTER TABLE ONLY public.dormitory_images DROP CONSTRAINT fk_images_dorm;
ALTER TABLE ONLY public.dormitory_amenities DROP CONSTRAINT fk_dorm_id;
ALTER TABLE ONLY public.room_types DROP CONSTRAINT fk_dorm;
ALTER TABLE ONLY public.dormitory_images DROP CONSTRAINT dormitory_images_dorm_id_fkey;
ALTER TABLE ONLY public.dormitory_amenities DROP CONSTRAINT dormitory_amenities_dorm_id_fkey;
ALTER TABLE ONLY public.dormitories DROP CONSTRAINT dormitories_zone_id_fkey;
ALTER TABLE ONLY public.dormitories DROP CONSTRAINT dormitories_owner_id_fkey;
DROP INDEX public.unique_active_request_per_dorm;
DROP INDEX public.idx_room_types_dorm_id;
DROP INDEX public.idx_dorm_zone;
ALTER TABLE ONLY public.zones DROP CONSTRAINT zones_pkey;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_username_key;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_firebase_uid_key;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_key;
ALTER TABLE ONLY public.stay_history DROP CONSTRAINT stay_history_pkey;
ALTER TABLE ONLY public.room_types DROP CONSTRAINT room_types_pkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_pkey;
ALTER TABLE ONLY public.member_requests DROP CONSTRAINT member_requests_pkey;
ALTER TABLE ONLY public.dormitory_images DROP CONSTRAINT dormitory_images_pkey;
ALTER TABLE ONLY public.dormitory_amenities DROP CONSTRAINT dormitory_amenities_pkey;
ALTER TABLE ONLY public.dormitories DROP CONSTRAINT dormitories_pkey;
ALTER TABLE public.zones ALTER COLUMN zone_id DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stay_history ALTER COLUMN stay_id DROP DEFAULT;
ALTER TABLE public.room_types ALTER COLUMN room_type_id DROP DEFAULT;
ALTER TABLE public.reviews ALTER COLUMN review_id DROP DEFAULT;
ALTER TABLE public.member_requests ALTER COLUMN request_id DROP DEFAULT;
ALTER TABLE public.dormitory_images ALTER COLUMN image_id DROP DEFAULT;
ALTER TABLE public.dormitory_amenities ALTER COLUMN dorm_amenity_id DROP DEFAULT;
ALTER TABLE public.dormitories ALTER COLUMN dorm_id DROP DEFAULT;
DROP SEQUENCE public.zones_zone_id_seq;
DROP TABLE public.zones;
DROP SEQUENCE public.users_id_seq;
DROP TABLE public.users;
DROP SEQUENCE public.stay_history_stay_id_seq;
DROP TABLE public.stay_history;
DROP SEQUENCE public.room_types_room_type_id_seq;
DROP TABLE public.room_types;
DROP SEQUENCE public.reviews_review_id_seq;
DROP TABLE public.reviews;
DROP SEQUENCE public.member_requests_request_id_seq;
DROP TABLE public.member_requests;
DROP SEQUENCE public.dormitory_images_image_id_seq;
DROP TABLE public.dormitory_images;
DROP SEQUENCE public.dormitory_amenities_dorm_amenity_id_seq;
DROP TABLE public.dormitory_amenities;
DROP SEQUENCE public.dormitories_dorm_id_seq;
DROP TABLE public.dormitories;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 24584)
-- Name: dormitories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dormitories (
    dorm_id integer NOT NULL,
    dorm_name character varying(100) NOT NULL,
    address text NOT NULL,
    dorm_description text NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    electricity_type character varying(20) NOT NULL,
    electricity_rate numeric(5,2) NOT NULL,
    water_type character varying(20) NOT NULL,
    water_rate numeric(8,2) NOT NULL,
    zone_id integer NOT NULL,
    owner_id integer NOT NULL,
    approval_status character varying(20) DEFAULT 'รออนุมัติ'::character varying NOT NULL,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    min_price integer,
    max_price integer,
    status_dorm character varying(20) DEFAULT 'ว่าง'::character varying NOT NULL,
    CONSTRAINT dormitories_status_dorm_check CHECK (((status_dorm)::text = ANY ((ARRAY['ว่าง'::character varying, 'เต็ม'::character varying])::text[])))
);


--
-- TOC entry 218 (class 1259 OID 24592)
-- Name: dormitories_dorm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dormitories_dorm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3468 (class 0 OID 0)
-- Dependencies: 218
-- Name: dormitories_dorm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dormitories_dorm_id_seq OWNED BY public.dormitories.dorm_id;


--
-- TOC entry 232 (class 1259 OID 57363)
-- Name: dormitory_amenities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dormitory_amenities (
    dorm_amenity_id integer NOT NULL,
    dorm_id integer NOT NULL,
    amenity_id integer NOT NULL,
    amenity_name character varying(100),
    location_type character varying(20),
    is_available boolean DEFAULT true
);


--
-- TOC entry 231 (class 1259 OID 57362)
-- Name: dormitory_amenities_dorm_amenity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dormitory_amenities_dorm_amenity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3469 (class 0 OID 0)
-- Dependencies: 231
-- Name: dormitory_amenities_dorm_amenity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dormitory_amenities_dorm_amenity_id_seq OWNED BY public.dormitory_amenities.dorm_amenity_id;


--
-- TOC entry 219 (class 1259 OID 24598)
-- Name: dormitory_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dormitory_images (
    image_id integer NOT NULL,
    dorm_id integer,
    image_url text NOT NULL,
    upload_date timestamp without time zone DEFAULT now() NOT NULL,
    is_primary boolean DEFAULT false NOT NULL
);


--
-- TOC entry 220 (class 1259 OID 24605)
-- Name: dormitory_images_image_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dormitory_images_image_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3470 (class 0 OID 0)
-- Dependencies: 220
-- Name: dormitory_images_image_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dormitory_images_image_id_seq OWNED BY public.dormitory_images.image_id;


--
-- TOC entry 221 (class 1259 OID 24606)
-- Name: member_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_requests (
    request_id integer NOT NULL,
    user_id integer NOT NULL,
    dorm_id integer NOT NULL,
    request_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'รอพิจารณา'::character varying NOT NULL,
    approved_date timestamp without time zone,
    response_note text
);


--
-- TOC entry 222 (class 1259 OID 24613)
-- Name: member_requests_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.member_requests_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3471 (class 0 OID 0)
-- Dependencies: 222
-- Name: member_requests_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_requests_request_id_seq OWNED BY public.member_requests.request_id;


--
-- TOC entry 223 (class 1259 OID 24614)
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    review_id integer NOT NULL,
    user_id integer NOT NULL,
    dorm_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    review_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_resident boolean DEFAULT false NOT NULL,
    CONSTRAINT check_rating CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- TOC entry 224 (class 1259 OID 24622)
-- Name: reviews_review_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_review_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3472 (class 0 OID 0)
-- Dependencies: 224
-- Name: reviews_review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_review_id_seq OWNED BY public.reviews.review_id;


--
-- TOC entry 225 (class 1259 OID 24623)
-- Name: room_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_types (
    room_type_id integer NOT NULL,
    dorm_id integer NOT NULL,
    room_name character varying(100) NOT NULL,
    bed_type character varying(50) NOT NULL,
    monthly_price integer,
    daily_price integer,
    summer_price integer,
    term_price integer,
    CONSTRAINT chk_room_types_semester_price CHECK (((term_price IS NULL) OR (term_price >= 0)))
);


--
-- TOC entry 226 (class 1259 OID 24629)
-- Name: room_types_room_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.room_types_room_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3473 (class 0 OID 0)
-- Dependencies: 226
-- Name: room_types_room_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.room_types_room_type_id_seq OWNED BY public.room_types.room_type_id;


--
-- TOC entry 234 (class 1259 OID 65537)
-- Name: stay_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stay_history (
    stay_id integer NOT NULL,
    user_id integer NOT NULL,
    dorm_id integer NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    is_current boolean DEFAULT false NOT NULL,
    status character varying(20) DEFAULT 'เข้าพัก'::character varying NOT NULL
);


--
-- TOC entry 233 (class 1259 OID 65536)
-- Name: stay_history_stay_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stay_history_stay_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3474 (class 0 OID 0)
-- Dependencies: 233
-- Name: stay_history_stay_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stay_history_stay_id_seq OWNED BY public.stay_history.stay_id;


--
-- TOC entry 227 (class 1259 OID 24630)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    firebase_uid character varying(300) NOT NULL,
    email character varying(320) NOT NULL,
    username character varying(100) NOT NULL,
    display_name character varying(500),
    photo_url character varying(1000),
    phone_number character varying(20),
    member_type character varying(50) NOT NULL,
    residence_dorm_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    secondary_phone character varying(20),
    line_id character varying(50),
    manager_name character varying(100)
);


--
-- TOC entry 228 (class 1259 OID 24637)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3475 (class 0 OID 0)
-- Dependencies: 228
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 229 (class 1259 OID 24638)
-- Name: zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zones (
    zone_id integer NOT NULL,
    zone_name character varying(100) NOT NULL
);


--
-- TOC entry 230 (class 1259 OID 24641)
-- Name: zones_zone_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zones_zone_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3476 (class 0 OID 0)
-- Dependencies: 230
-- Name: zones_zone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zones_zone_id_seq OWNED BY public.zones.zone_id;


--
-- TOC entry 3227 (class 2604 OID 24644)
-- Name: dormitories dorm_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitories ALTER COLUMN dorm_id SET DEFAULT nextval('public.dormitories_dorm_id_seq'::regclass);


--
-- TOC entry 3246 (class 2604 OID 57366)
-- Name: dormitory_amenities dorm_amenity_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitory_amenities ALTER COLUMN dorm_amenity_id SET DEFAULT nextval('public.dormitory_amenities_dorm_amenity_id_seq'::regclass);


--
-- TOC entry 3232 (class 2604 OID 24646)
-- Name: dormitory_images image_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitory_images ALTER COLUMN image_id SET DEFAULT nextval('public.dormitory_images_image_id_seq'::regclass);


--
-- TOC entry 3235 (class 2604 OID 24647)
-- Name: member_requests request_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_requests ALTER COLUMN request_id SET DEFAULT nextval('public.member_requests_request_id_seq'::regclass);


--
-- TOC entry 3238 (class 2604 OID 24648)
-- Name: reviews review_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN review_id SET DEFAULT nextval('public.reviews_review_id_seq'::regclass);


--
-- TOC entry 3241 (class 2604 OID 24649)
-- Name: room_types room_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_types ALTER COLUMN room_type_id SET DEFAULT nextval('public.room_types_room_type_id_seq'::regclass);


--
-- TOC entry 3248 (class 2604 OID 65540)
-- Name: stay_history stay_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stay_history ALTER COLUMN stay_id SET DEFAULT nextval('public.stay_history_stay_id_seq'::regclass);


--
-- TOC entry 3242 (class 2604 OID 24650)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3245 (class 2604 OID 24651)
-- Name: zones zone_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones ALTER COLUMN zone_id SET DEFAULT nextval('public.zones_zone_id_seq'::regclass);


--
-- TOC entry 3445 (class 0 OID 24584)
-- Dependencies: 217
-- Data for Name: dormitories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dormitories (dorm_id, dorm_name, address, dorm_description, latitude, longitude, electricity_type, electricity_rate, water_type, water_rate, zone_id, owner_id, approval_status, created_date, updated_date, min_price, max_price, status_dorm) FROM stdin;
193	Rom Chatra Female Dormitory	230 หมู่1 ถนนท่าขอยยาง ตำบลท่าขอนยาง Kantharawichai District, Maha Sarakham 44150	หอพักหญิงล้วน ใกล้มหาวิทยาลัยมหาสารคาม สะดวกสะบาย ปลอดภัย มีที่จอดรถ ระบบรักษาความปลอดภัย 24 ชั่วโมง	16.23984096	103.25792560	ตามมิเตอร์	6.00	ตามมิเตอร์	20.00	2	131	อนุมัติ	2025-10-19 17:07:16.004809	2025-10-19 22:32:11.16254	3100	3100	ว่าง
187	Chaya Grand Female Dormitory	324 หมู่ 3, ตำบลท่าขอนยาง อำเภอกันทรวิชัย จังหวัดมหาสารคาม, 44150	หอพักหญิงขนาดใหญ่ บรรยากาศเงียบสงบ ใกล้มหาวิทยาลัยมหาสารคาม เดินทางสะดวก มีที่จอดรถและสิ่งอำนวยความสะดวกครบครัน	16.23759600	103.25708900	ตามมิเตอร์	8.00	ตามมิเตอร์	50.00	2	131	อนุมัติ	2025-10-19 16:49:58.617325	2025-10-19 21:15:54.477425	3000	3000	ว่าง
189	Punthanakarn Female Dormitory	302 หมู่ 1, ตำบลท่าขอนยาง อำเภอกันทรวิชัย จังหวัดมหาสารคาม, 44150	หอพักหญิงสะอาด ปลอดภัย ใกล้มมส.ใหม่ มีที่จอดรถ เครื่องซักผ้าและ Wi-Fi พร้อมระบบรักษาความปลอดภัย	16.23796300	103.25680400	ตามมิเตอร์	8.00	ตามมิเตอร์	50.00	2	131	อนุมัติ	2025-10-19 16:51:25.489677	2025-10-19 21:17:42.404462	3800	3800	ว่าง
190	Aue Sabai Dormitory - หอพักอยู่สบาย	67Q4+8V4 ซอยวุ่นวาย, ตำบลขามเรียง อำเภอกันทรวิชัย จังหวัดมหาสารคาม, 44150	หอพักอยู่สบาย ใกล้มหาวิทยาลัยมหาสารคาม มีเฟอร์นิเจอร์ครบ Wi-Fi ฟรี และระบบรักษาความปลอดภัยตลอด 24 ชม.	16.23796400	103.25678000	ตามมิเตอร์	8.00	ตามมิเตอร์	50.00	2	131	อนุมัติ	2025-10-19 16:52:06.070275	2025-10-19 21:19:22.463139	4200	4200	ว่าง
191	Sri Chandra Orchid Dormitory	67P5+XCR, ตำบลท่าขอนยาง อำเภอกันทรวิชัย จังหวัดมหาสารคาม, 44150	หอพักบรรยากาศร่มรื่น ใกล้มมส.ใหม่ มีสิ่งอำนวยความสะดวกครบครัน พร้อมที่จอดรถและ Wi-Fi ความเร็วสูง	16.23752600	103.25852200	หน่วย	8.00	เหมา	50.00	2	131	อนุมัติ	2025-10-19 16:54:11.932208	2025-10-19 21:21:50.98169	4500	4500	ว่าง
192	Srichan Orchid 3	ซอยมหานคร, ตำบลขามเรียง อำเภอกันทรวิชัย จังหวัดมหาสารคาม, 44150	หอพักสะอาด ปลอดภัย ใกล้มหาวิทยาลัยมหาสารคาม มีที่จอดรถและสิ่งอำนวยความสะดวกครบ เหมาะสำหรับนักศึกษา	16.23718700	103.25851800	คิดตามหน่วย	9.00	คิดตามหน่วย	25.00	2	131	อนุมัติ	2025-10-19 16:55:26.826574	2025-10-19 21:27:55.080504	4300	4300	ว่าง
196	Thana Park Dormitory	775 ม.1 ซ ซอย เถียงนาครูน้อย Tha Khon Yang, Kantharawichai District, Maha Sarakham 44150	หอพักบรรยากาศดี มีสวนสวยร่มรื่น เหมาะกับการพักผ่อน ใกล้มหาวิทยาลัย สิ่งอำนวยความสะดวกครบครัน	16.24320646	103.25823194	ตามมิเตอร์	6.00	ตามมิเตอร์	18.00	1	131	อนุมัติ	2025-10-19 17:07:16.004809	2025-10-19 22:18:33.503725	2800	2800	ว่าง
194	B.B.Mansion	459/1 ซอย เถียงนาครูน้อย Tha Khon Yang, Kantharawichai District, Maha Sarakham 44150	หอพักสะดวกสบาย ห้องพัดลมและห้องแอร์ ใกล้มหาวิทยาลัยมหาสารคาม มีอินเทอร์เน็ตความเร็วสูง เดินทางสะดวก	16.24138359	103.25770072	คิดตามหน่วย	9.00	เหมาจ่าย	100.00	4	131	อนุมัติ	2025-10-19 17:07:16.004809	2025-10-19 22:24:33.568584	3300	3300	ว่าง
99	Arunchai Grand (อรัญชัยแกรนด์)	280 หมู่ 7 ขามเรียง กันทรวิชัย, มหาสารคาม 44150	หอพัก Arunchai Grand (อรัญชัยแกรนด์) ขามเรียง ห่างจาก มหาวิทยาลัยมหาสารคามประมาณ 1.1 กิโลเมตร\n\nArunchai Grand (อรัญชัยแกรนด์) : สีสันที่กลมกลืนกับชีวิตที่ลงตัวสำหรับคนรุ่นใหม่เช่นคุณ อพาร์ทเม้นท์หรูทันสมัย 7 ชั้น ติดรั้ว มมส. (หลัง รร.สาธิต มมส.)  ห่างจาก มมส. เพียง 200 เมตร	16.24080351	103.24416364	คิดตามหน่วย	8.00	คิดตามหน่วย	19.00	3	68	อนุมัติ	2025-08-18 15:22:34.137353	2025-10-17 14:23:14.028368	3800	5000	เต็ม
200	Nara Dahla Dormitory	67Q6+GCQ 432 Tha Khon Yang, Kantharawichai District, Maha Sarakham 44150	หอพักบรรยากาศอบอุ่น ใกล้มหาวิทยาลัย ห้องสะอาด มีเครื่องซักผ้าหยอดเหรียญ ราคาเป็นกันเอง	16.23889683	103.26136015	ตามมิเตอร์	6.00	ตามมิเตอร์	20.00	3	131	อนุมัติ	2025-10-19 17:07:16.004809	2025-10-19 21:43:54.200992	3700	3700	ว่าง
201	Huean Pen | หอพักเฮือนเพ็ญ	Tha Khon Yang, Kantharawichai District, Maha Sarakham 44150	หอพักสไตล์บ้านเดี่ยว บรรยากาศอบอุ่น เหมือนอยู่บ้าน สะดวกสบาย ปลอดภัย เจ้าของดูแลดี	16.23947300	103.26204227	ตามมิเตอร์	6.50	ตามมิเตอร์	20.00	5	131	อนุมัติ	2025-10-19 17:07:16.004809	2025-10-19 21:38:27.298464	3800	3800	ว่าง
199	the snooze 66 (เดอะ สนูซ 66)	968 Tambon Tha Khon Yang, Kantharawichai District, Maha Sarakham 44150	หอพักสไตล์โมเดิร์น เน้นความสะดวกสบาย ห้องกว้าง เฟอร์นิเจอร์ครบ มีลิฟต์ ระบบรักษาความปลอดภัยตลอด 24 ชั่วโมง	16.23945511	103.26142724	ตามมิเตอร์	7.00	ตามมิเตอร์	23.00	1	131	อนุมัติ	2025-10-19 17:07:16.004809	2025-10-19 21:50:22.539426	3300	3300	ว่าง
198	Yok's Apartment	914 หมู่ที่ 1 Tambon Tha Khon Yang, Kantharawichai District, Maha Sarakham 44150	อพาร์ทเมนท์สไตล์มินิมอล ห้องใหม่ สะอาด ครบครัน ใกล้แหล่งอาหาร มีรถโดยสารผ่าน เดินทางสะดวก	16.23931912	103.26053267	คิดตามหน่วย	9.00	เหมาจ่าย	200.00	1	131	อนุมัติ	2025-10-19 17:07:16.004809	2025-10-19 22:12:36.896117	4600	4600	ว่าง
205	The Peace	762R+F5R, 2202, Kham Riang, Kantharawichai District, Maha Sarakham 44150	หอพักสไตล์โมเดิร์น บรรยากาศสงบเงียบ เหมาะกับการพักผ่อน มีอินเทอร์เน็ตความเร็วสูง ห้องกว้าง แสงสว่างเพียงพอ	16.25130052	103.24056001	ตามมิเตอร์	7.00	ตามมิเตอร์	22.00	4	131	อนุมัติ	2025-10-19 17:17:58.744836	2025-10-19 22:41:09.206457	3800	3800	ว่าง
203	Sombutsiri Female Dormitory	441 หมู่ 20, ตำบลขามเรียง อำเภอกันทรวิชัย จังหวัดมหาสารคาม, 44150	หอพักหญิงล้วน บรรยากาศดี ปลอดภัย มีระบบรักษาความปลอดภัย 24 ชั่วโมง ห้องสะอาด เงียบสงบ เหมาะกับการพักผ่อนและอ่านหนังสือ	16.24993171	103.24232712	หน่วย	6.00	หน่วย	20.00	4	131	อนุมัติ	2025-10-19 17:17:58.744836	2025-10-19 23:16:45.647509	3900	3900	ว่าง
204	หอพักสามพี่น้อง	762V+63H, Kham Riang, Kantharawichai District, Maha Sarakham 44150	หอพักบริหารแบบครอบครัว อบอุ่น เป็นกันเอง ดูแลนักศึกษาใกล้ชิด ห้องพักสะอาด มีเครื่องใช้ไฟฟ้าครบครัน	16.25064180	103.24278806	ตามมิเตอร์	6.50	ตามมิเตอร์	20.00	4	131	อนุมัติ	2025-10-19 17:17:58.744836	2025-10-19 23:10:31.552468	3200	3200	ว่าง
123	ดราก้อนเพลส	333, ตำบลท่าขอนยาง อำเภอกันทรวิชัยจังหวัด มหาสารคาม, 44150	ห้องพักสวยหรู สไตล์โมเดิร์น เฟอร์ครบครัน\n\nบิวล์อินอย่างลงตัว นอกระเบียงมีซิงค์สำหรับล้างจาน เพื่อความสะดวกสบาย\n\nมีผู้ดูแลตลอด24ชม. พร้อมกล้องวงจรปิด\n\nมีตู้นำ้ดื่มหยอดเหรียญ และเครื่องซักผ้าหยอดเหรียญบริการ	16.23721829	103.25528545	คิดตามหน่วย	9.00	คิดตามหน่วย	25.00	1	131	อนุมัติ	2025-10-07 17:59:14.137552	2025-10-07 17:59:19.425371	3700	3700	ว่าง
131	หอพักพงศ์สุรี	255 หมู่ที่ 1 ถนนท่าขอนยาง Tambon Tha Khon Yang, Kantharawichai District, Maha Sarakham 44150	หอพักพงศ์สุรี 2\n\nโทร☎️ 094-509-5595\n\nสามารถแอดไลน์ตามเบอร์โทรได้เลยค่ะ\n\n-มีรถสองแถวผ่านหน้าหอ เดินทางสะดวก\n\n-หน้าหอพักมี mini big C\n\n-ใกล้คลองถม\n\n\n\nค่าเช่าเดือนละ 3,600 บาท\n\n-ค่าประกัน 3,000 บาท\n\n\n\nเทอมละ 17,500\n\n(1 เทอม 5 เดือน ตกเดือนละ 3,500 บาท)\n\n\n\nค่าไฟ หน่วยละ 8 บาท / ค่าน้ำ หน่วยละ 24 บาท ขั้นต่ำ 5 หน่วย	16.23664087	103.26472580	คิดตามหน่วย	8.00	คิดตามหน่วย	24.00	2	131	อนุมัติ	2025-10-07 20:51:47.147717	2025-10-07 20:51:51.206365	2500	2500	ว่าง
132	หอพักใกล้ มมส. กรณ์ลดา	หมู่ที่ 1 379 Tha Khon Yang, Kantharawichai District, Maha Sarakham 44150	ห้องพักรายเดือน/รายวันในมหาวิทยาลัยมหาสารคาม ต. ท่าขอนยาง อ.กันทรวิชัย จ.มหาสารคาม\n\nสถานที่ตั้ง : 379 ต.ท่าขอนยาง อ. กันทรวิชัย จ. มหาสารคาม\nประเภท : ห้องเช่าพร้อมเฟอร์นิเจอร์\nขนาด : ขนาด : 3.5*6.5 ตรม (ไร่ - งาน - วา)\nราคา : 2200 - 3000 บาท\n\nมีบริการห้องพักรายเดือน-รายเทอม มีบริการทั้งห้องแอร์และพัดลม พร้อมเฟอร์นิเจอร์ครบครัน สะดวก สบาย\nมี พัดลม ตู้ โต๊ะ เตียง (แอร์ ทีวี ตู้เย็น เฉพาะห้องแอร์) ฟรี WI-FI อินเตอร์เน็ตความเร็วสูง เคเบิ้ลทีวี\nมีบริการเครื่องซักผ้าหยอดเหรียญ ตู้น้ำหยอดเหรียญ\nใกล้ตลาดนัดคลองถม,7-eleven,Lotus\nบรรยากาศดี เงียบสงบร่มรื่น เหมาะอย่างยิ่งสำหรับคนที่ไม่ชอบความวุ่นวาย\n\nอยู่ซอยตลาดคลองถม\n\nสนใจติดต่อ 086-8576599 พี่นัท \nห้องแอร์ 2700 ห้องพัดลม 2200	16.23820368	103.26460946	คิดตามหน่วย	8.00	คิดตามหน่วย	22.00	2	131	อนุมัติ	2025-10-07 20:57:24.097004	2025-10-07 20:57:28.315995	2200	2200	ว่าง
220	E&T Place Dormitory	147 ถ. มหาวิทยาลัยมหาสารคาม Tha Khon Yang, Kantharawichai District, Maha Sarakham 44150	หอพักทำเลดี ติดถนนมหาวิทยาลัยมหาสารคาม เดินทางสะดวก ใกล้แหล่งอาหาร ร้านสะดวกซื้อ ห้องพักทันสมัย มีระบบรักษาความปลอดภัย	16.25190636	103.25805090	ตามมิเตอร์	6.50	ตามมิเตอร์	20.00	5	131	อนุมัติ	2025-10-19 17:29:47.844347	2025-10-19 23:42:16.286776	2400	2400	ว่าง
124	Nada Living Place	763R+2MP, Kham Riang, Kantharawichai District, Maha Sarakham 44150	หอพักแห่งนี้ตั้งอยู่ในทำเลที่สะดวกต่อการเดินทางไปมหาวิทยาลัยและตลาดใกล้เคียง ภายในอาคารมีการดูแลรักษาความสะอาดอย่างสม่ำเสมอ ห้องพักตกแต่งเรียบง่ายแต่ครบครันด้วยเฟอร์นิเจอร์พื้นฐาน เช่น เตียง โต๊ะอ่านหนังสือ และตู้เสื้อผ้า มีเครื่องปรับอากาศและอินเทอร์เน็ตไร้สาย พร้อมระบบคีย์การ์ดและกล้องวงจรปิดเพื่อความปลอดภัยของผู้พักอาศัย	16.25261288	103.24176442	คิดตามหน่วย	9.00	เหมาจ่าย	100.00	3	131	อนุมัติ	2025-10-07 18:15:54.752334	2025-10-07 18:16:00.770556	2800	2800	ว่าง
125	Chinjo Residence 1, 2	506 หมู่ 1, ตำบลท่าขอนยาง อำเภอกันทรวิชัย จังหวัดมหาสารคาม, 44150	เป็นหอพักที่เน้นบรรยากาศอบอุ่นและเป็นกันเอง เหมาะสำหรับนิสิตที่ชอบความเงียบสงบ มีพื้นที่ส่วนกลางสำหรับซักรีดและพักผ่อน มีแม่บ้านดูแลความสะอาดทุกวัน และมีระบบรักษาความปลอดภัยตลอด 24 ชั่วโมง ภายในห้องมีเครื่องทำน้ำอุ่น ระเบียงส่วนตัว และหน้าต่างขนาดใหญ่ที่รับแสงธรรมชาติได้ดี	16.23534384	103.25562535	คิดตามหน่วย	9.00	คิดตามหน่วย	25.00	2	131	อนุมัติ	2025-10-07 18:49:50.767622	2025-10-07 18:49:55.683619	3700	3700	ว่าง
126	หอพักนะโม น้ำมนต์	336 ม.7 ต Kham Riang, Kantharawichai District	ตอนนี้ห้องพักเต็มแล้วนะคะ.   หอพักเปิดใหม่ บรรยากาศดี  ติดรั้ว มมส \nติดแอร์ทุกห้อง ราคาอันเอง มีอุปกรณ์ครบ \nมี  ทีวี ตู้เย็น อินเตอร์เน็ต 30 m บริการน้ำดื่มฟรี มีเครื่องชักผ้าหยอดเหรียญ \n\nจ่ายเป็นเทอมลดอีกเดือนละ 100 บาท\nเช่น 2800*5=14,000 ลดเหลือ 13,500 บาท\nคำประกันห้อง 4,000 บาท\nรวมเป็นเงิน 13,500+4000=17,500 บาท\n จ่ายรายเดือน  พร้อมเข้าอยู่ เช่น ราคาห้อง 2,800 + ค่าประกัน  4,000  = 6,800  บาท	16.24198340	103.24408980	คิดตามหน่วย	8.00	คิดตามหน่วย	25.00	3	131	อนุมัติ	2025-10-07 19:06:42.336315	2025-10-07 19:06:47.597753	3000	3000	ว่าง
127	ลาวัณย์ ปาร์ควิลล์ 1, 2	577 หมู่ 1, ตำบลท่าขอนยาง อำเภอกันทรวิชัย จังหวัดมหาสารคาม, 44150	หอพักใหม่ ใกล้มหาวิทยาลัยมหาสารคาม ( มมส. ใหม่ ) เพียง 100 ม.\nมีลิฟท์\nฟรี Wi Fi\nการเดินทางสะดวกไม่วุ่นวาย\nมีที่จอดรถ\nพิเศษทำสัญญา 1 ปีฟรีทีวีหรือตู็เย็น\nห้องแอร์  3900 บาท/เดือน	16.25149651	103.25284969	คิดตามหน่วย	8.00	คิดตามหน่วย	25.00	4	131	อนุมัติ	2025-10-07 19:12:54.042977	2025-10-07 19:13:00.12401	3500	3500	ว่าง
128	N.P. Place Dormitory	427 หมู่1, ถนนแจ้งสนิท, ตำบลท่าขอนยาง อำเภอกันทรวิชัย จังหวัดมหาสารคาม, 44150	เป็น หอในเครือข่ายของมหาวิทยาลัยมหาสารคาม	16.23948077	103.25907438	คิดตามหน่วย	6.00	คิดตามหน่วย	25.00	2	131	อนุมัติ	2025-10-07 19:43:09.425099	2025-10-07 19:43:13.809743	3800	3800	ว่าง
129	The Best	หอพัก เดอะ พ เล ส, Kham Riang, Amphoe Kantharawichai, Chang Wat Maha Sarakham 44150	ห้องพักหรูสไตล์โมเดิร์น ราคาไม่แพง \nสิ่งอำนวยความสะดวกครบ \nมีระบบรักษาความปลอดภัย  \nสอบถามการเดินทาง และ ราคาได้ค่ะ 099-0255550\nFacebook The Best	16.23595027	103.25615846	คิดตามหน่วย	9.00	คิดตามหน่วย	25.00	2	131	อนุมัติ	2025-10-07 19:50:38.535936	2025-10-07 19:50:44.703564	4000	4000	ว่าง
130	The Night house	763R+Q7P ท่าขอนยาง Kham Riang, Kantharawichai District, Maha Sarakham 44150	หอพักแนวโมเดิร์น เหมาะกับคนรุ่นใหม่ที่ชอบความอาร์ต ชอบความเป็นส่วนตัว เงียบ สงบ ใกล้ มมส ใหม่เพียง 600 ม. เดินทางสะดวกสบาย\n\nอุปกรณ์เฟอร์นิเจอร์ครบครัน แอร์ ทีวี ตู้เย็น พร้อมเตียงขนาด 5 ฟุต เครื่องทำน้ำอุ่น ไม่ต้องจ่ายเพิ่มรวมทุกอย่างราคาเดียว พร้อมด้วยอินเตอร์เน็ต Hi speed อยู่ทางฝั่งขามเรียง ซอยโพธิ์ทอง มีที่จอดรถยนต์และมอเตอร์ไซค์กว้างขวาง หิ้วกระเป๋าพร้อมอยู่ ติดต่อ 0819740687	16.25443376	103.24068086	คิดตามหน่วย	8.00	คิดตามหน่วย	22.00	3	131	อนุมัติ	2025-10-07 20:45:19.46753	2025-10-07 20:45:23.927294	3500	3500	ว่าง
122	สินทรัพย์ซิตี้โฮม สระว่ายน้ำปลาโลมา	สินทรัพย์ทวีคูณซิตี้โฮม (สินทรัพย์ทวีคูณซิตี้โฮม) : ต.ท่าขอนยาง อ.กันทรวิชัย จ.มหาสารคาม 44150	หอพัก สินทรัพย์ซิตี้โฮม สระว่ายน้ำปลาโลมา ขามเรียง ห่างจาก มหาวิทยาลัยมหาสารคามประมาณ 2.2 กิโลเมตร\n\nสินทรัพย์ทวีคูณซิตี้โฮม ตั้งอยู่ที่ Unnamed Road ตำบล ท่าขอนยาง อำเภอ กันทรวิชัย มหาสารคาม 44150 ประเทศไทย, ใกล้สถานที่นี้อยู่: หอพักเดอะโฟกัสอพาร์ทเมนท์ (5 กม.), หมู่บ้านเดอะวิคตอเรีย มหาสารคาม (7 กม.), สัตยาอพาร์ทเม้นท์ (8 กม.), โรงแรมผกาวัลย์ มหาสารคาม (10 กม.).	16.24980697	103.26983383	คิดตามหน่วย	9.00	ตามมิเตอร์	22.00	3	68	อนุมัติ	2025-10-07 16:17:04.492055	2025-10-20 05:08:21.130706	3000	3500	ว่าง
186	Dhevdanai Dormitory	345 หมู่ 1, ตำบลท่าขอนยาง อำเภอกันทรวิชัย จังหวัดมหาสารคาม 44150	หอพักบรรยากาศสงบ เดินทางสะดวก ใกล้ม.มหาสารคาม มีที่จอดรถและระบบรักษาความปลอดภัย 24 ชม.	16.24208532	103.25753777	หน่วย	8.00	เหมา	50.00	2	131	อนุมัติ	2025-10-19 16:34:38.581181	2025-10-19 21:14:07.823181	3500	3500	ว่าง
133	หอโรสริน	ซอยวุ่นวาย ข้างหอชินโจะ ตรงข้ามร้านโด่งหมูกระทะ ตำบลขามเรียง อำเภอกันทรวิชัย จังหวัดมหาสารคาม	หอพัก หอโรสริน ท่าขอนยาง ห่างจาก มหาวิทยาลัยมหาสารคามประมาณ 1.9 กิโลเมตร\n\nหอโรสริน เป็นหอพักสไตล์เรียบง่าย เงียบสงบ ปลอดภัย เหมาะสำหรับนักศึกษามหาวิทยาลัยมหาสารคาม อยู่ในซอยวุ่นวาย ใกล้ร้านอาหารและสิ่งอำนวยความสะดวกต่าง ๆ เดินทางสะดวก มีห้องพักกว้างขวาง ระเบียงกว้าง ห้องน้ำใหญ่ พร้อมเฟอร์นิเจอร์ครบ แอร์เย็น มี Free WiFi กล้องวงจรปิดรอบอาคาร พร้อมระบบรักษาความปลอดภัย	16.23139242	103.24627337	ตามมิเตอร์	9.00	เหมาจ่าย	200.00	2	68	อนุมัติ	2025-10-10 18:41:30.241529	2025-10-20 04:19:13.817905	3600	3800	ว่าง
\.


--
-- TOC entry 3460 (class 0 OID 57363)
-- Dependencies: 232
-- Data for Name: dormitory_amenities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dormitory_amenities (dorm_amenity_id, dorm_id, amenity_id, amenity_name, location_type, is_available) FROM stdin;
775	189	1	แอร์	ภายใน	t
776	189	2	พัดลม	ภายใน	t
777	189	3	TV	ภายใน	t
778	189	4	ตู้เย็น	ภายใน	t
779	189	5	เตียงนอน	ภายใน	t
780	189	6	WIFI	ภายใน	t
781	189	8	โต๊ะทำงาน	ภายใน	t
782	189	10	เครื่องทำน้ำอุ่น	ภายใน	t
783	189	13	กล้องวงจรปิด	ภายนอก	t
784	189	14	รปภ.	ภายนอก	t
458	123	2	พัดลม	ภายใน	t
459	123	4	ตู้เย็น	ภายใน	t
460	123	5	เตียงนอน	ภายใน	t
461	123	6	WIFI	ภายใน	t
462	123	7	ตู้เสื้อผ้า	ภายใน	t
463	123	8	โต๊ะทำงาน	ภายใน	t
464	123	10	เครื่องทำน้ำอุ่น	ภายใน	t
465	123	13	กล้องวงจรปิด	ภายนอก	t
466	123	14	รปภ.	ภายนอก	t
467	123	16	ที่จอดรถ	ภายนอก	t
468	123	23	คีย์การ์ด	ภายนอก	t
469	123	24	เครื่องซักผ้า	ภายนอก	t
470	124	1	แอร์	ภายใน	t
471	124	2	พัดลม	ภายใน	t
472	124	3	TV	ภายใน	t
473	124	5	เตียงนอน	ภายใน	t
474	124	6	WIFI	ภายใน	t
475	124	7	ตู้เสื้อผ้า	ภายใน	t
476	124	8	โต๊ะทำงาน	ภายใน	t
477	124	10	เครื่องทำน้ำอุ่น	ภายใน	t
478	124	12	โต๊ะเครื่องแป้ง	ภายใน	t
479	124	13	กล้องวงจรปิด	ภายนอก	t
480	124	16	ที่จอดรถ	ภายนอก	t
481	124	23	คีย์การ์ด	ภายนอก	t
482	124	24	เครื่องซักผ้า	ภายนอก	t
483	125	1	แอร์	ภายใน	t
484	125	4	ตู้เย็น	ภายใน	t
485	125	5	เตียงนอน	ภายใน	t
486	125	6	WIFI	ภายใน	t
487	125	7	ตู้เสื้อผ้า	ภายใน	t
488	125	8	โต๊ะทำงาน	ภายใน	t
489	125	10	เครื่องทำน้ำอุ่น	ภายใน	t
490	125	13	กล้องวงจรปิด	ภายนอก	t
491	125	14	รปภ.	ภายนอก	t
492	125	16	ที่จอดรถ	ภายนอก	t
493	125	24	เครื่องซักผ้า	ภายนอก	t
494	126	1	แอร์	ภายใน	t
495	126	2	พัดลม	ภายใน	t
496	126	3	TV	ภายใน	t
497	126	4	ตู้เย็น	ภายใน	t
785	189	16	ที่จอดรถ	ภายนอก	t
786	189	24	เครื่องซักผ้า	ภายนอก	t
787	190	1	แอร์	ภายใน	t
788	190	2	พัดลม	ภายใน	t
789	190	3	TV	ภายใน	t
790	190	5	เตียงนอน	ภายใน	t
791	190	6	WIFI	ภายใน	t
792	190	13	กล้องวงจรปิด	ภายนอก	t
793	190	14	รปภ.	ภายนอก	t
794	190	15	ลิฟต์	ภายนอก	t
795	190	16	ที่จอดรถ	ภายนอก	t
796	190	17	ฟิตเนส	ภายนอก	t
797	190	18	Lobby	ภายนอก	t
798	190	19	ตู้น้ำหยอดเหรียญ	ภายนอก	t
799	190	22	อนุญาตให้เลี้ยงสัตว์	ภายนอก	t
498	126	5	เตียงนอน	ภายใน	t
499	126	6	WIFI	ภายใน	t
500	126	7	ตู้เสื้อผ้า	ภายใน	t
501	126	8	โต๊ะทำงาน	ภายใน	t
502	126	10	เครื่องทำน้ำอุ่น	ภายใน	t
503	126	16	ที่จอดรถ	ภายนอก	t
504	127	1	แอร์	ภายใน	t
505	127	2	พัดลม	ภายใน	t
506	127	5	เตียงนอน	ภายใน	t
507	127	6	WIFI	ภายใน	t
508	127	7	ตู้เสื้อผ้า	ภายใน	t
509	127	10	เครื่องทำน้ำอุ่น	ภายใน	t
510	127	13	กล้องวงจรปิด	ภายนอก	t
511	127	15	ลิฟต์	ภายนอก	t
512	127	16	ที่จอดรถ	ภายนอก	t
513	127	23	คีย์การ์ด	ภายนอก	t
514	127	24	เครื่องซักผ้า	ภายนอก	t
515	128	1	แอร์	ภายใน	t
516	128	2	พัดลม	ภายใน	t
517	128	5	เตียงนอน	ภายใน	t
518	128	6	WIFI	ภายใน	t
519	128	7	ตู้เสื้อผ้า	ภายใน	t
520	128	16	ที่จอดรถ	ภายนอก	t
521	128	17	ฟิตเนส	ภายนอก	t
522	128	24	เครื่องซักผ้า	ภายนอก	t
523	129	1	แอร์	ภายใน	t
524	129	2	พัดลม	ภายใน	t
525	129	3	TV	ภายใน	t
526	129	4	ตู้เย็น	ภายใน	t
527	129	5	เตียงนอน	ภายใน	t
528	129	6	WIFI	ภายใน	t
529	129	7	ตู้เสื้อผ้า	ภายใน	t
530	129	8	โต๊ะทำงาน	ภายใน	t
531	129	10	เครื่องทำน้ำอุ่น	ภายใน	t
532	129	14	รปภ.	ภายนอก	t
533	129	15	ลิฟต์	ภายนอก	t
534	129	16	ที่จอดรถ	ภายนอก	t
535	129	17	ฟิตเนส	ภายนอก	t
536	129	23	คีย์การ์ด	ภายนอก	t
537	129	24	เครื่องซักผ้า	ภายนอก	t
538	130	1	แอร์	ภายใน	t
539	130	5	เตียงนอน	ภายใน	t
540	130	6	WIFI	ภายใน	t
541	130	7	ตู้เสื้อผ้า	ภายใน	t
542	130	10	เครื่องทำน้ำอุ่น	ภายใน	t
543	130	13	กล้องวงจรปิด	ภายนอก	t
544	130	16	ที่จอดรถ	ภายนอก	t
545	131	1	แอร์	ภายใน	t
546	131	4	ตู้เย็น	ภายใน	t
547	131	5	เตียงนอน	ภายใน	t
548	131	6	WIFI	ภายใน	t
549	131	7	ตู้เสื้อผ้า	ภายใน	t
550	131	10	เครื่องทำน้ำอุ่น	ภายใน	t
551	131	13	กล้องวงจรปิด	ภายนอก	t
552	131	23	คีย์การ์ด	ภายนอก	t
553	132	1	แอร์	ภายใน	t
554	132	2	พัดลม	ภายใน	t
555	132	5	เตียงนอน	ภายใน	t
556	132	6	WIFI	ภายใน	t
557	132	7	ตู้เสื้อผ้า	ภายใน	t
558	132	13	กล้องวงจรปิด	ภายนอก	t
559	132	16	ที่จอดรถ	ภายนอก	t
560	132	24	เครื่องซักผ้า	ภายนอก	t
754	186	1	แอร์	ภายใน	t
755	186	3	TV	ภายใน	t
756	186	4	ตู้เย็น	ภายใน	t
757	186	5	เตียงนอน	ภายใน	t
758	186	7	ตู้เสื้อผ้า	ภายใน	t
759	186	13	กล้องวงจรปิด	ภายนอก	t
760	186	14	รปภ.	ภายนอก	t
761	186	16	ที่จอดรถ	ภายนอก	t
762	186	21	ที่วางพัสดุ	ภายนอก	t
763	186	24	เครื่องซักผ้า	ภายนอก	t
764	187	1	แอร์	ภายใน	t
765	187	3	TV	ภายใน	t
766	187	4	ตู้เย็น	ภายใน	t
767	187	5	เตียงนอน	ภายใน	t
768	187	6	WIFI	ภายใน	t
769	187	7	ตู้เสื้อผ้า	ภายใน	t
770	187	13	กล้องวงจรปิด	ภายนอก	t
771	187	14	รปภ.	ภายนอก	t
772	187	16	ที่จอดรถ	ภายนอก	t
773	187	21	ที่วางพัสดุ	ภายนอก	t
774	187	24	เครื่องซักผ้า	ภายนอก	t
800	190	24	เครื่องซักผ้า	ภายนอก	t
801	191	1	แอร์	ภายใน	t
802	191	3	TV	ภายใน	t
803	191	4	ตู้เย็น	ภายใน	t
804	191	5	เตียงนอน	ภายใน	t
805	191	6	WIFI	ภายใน	t
806	191	7	ตู้เสื้อผ้า	ภายใน	t
807	191	8	โต๊ะทำงาน	ภายใน	t
808	191	9	ไมโครเวฟ	ภายใน	t
809	191	10	เครื่องทำน้ำอุ่น	ภายใน	t
810	191	11	ซิงค์ล้างจาน	ภายใน	t
811	191	12	โต๊ะเครื่องแป้ง	ภายใน	t
812	191	13	กล้องวงจรปิด	ภายนอก	t
813	191	14	รปภ.	ภายนอก	t
814	191	15	ลิฟต์	ภายนอก	t
815	191	16	ที่จอดรถ	ภายนอก	t
816	191	17	ฟิตเนส	ภายนอก	t
817	191	18	Lobby	ภายนอก	t
818	191	19	ตู้น้ำหยอดเหรียญ	ภายนอก	t
819	191	21	ที่วางพัสดุ	ภายนอก	t
820	191	22	อนุญาตให้เลี้ยงสัตว์	ภายนอก	t
821	191	23	คีย์การ์ด	ภายนอก	t
822	191	24	เครื่องซักผ้า	ภายนอก	t
823	192	1	แอร์	ภายใน	t
824	192	3	TV	ภายใน	t
825	192	4	ตู้เย็น	ภายใน	t
826	192	5	เตียงนอน	ภายใน	t
827	192	6	WIFI	ภายใน	t
828	192	7	ตู้เสื้อผ้า	ภายใน	t
829	192	8	โต๊ะทำงาน	ภายใน	t
830	192	9	ไมโครเวฟ	ภายใน	t
831	192	10	เครื่องทำน้ำอุ่น	ภายใน	t
832	192	11	ซิงค์ล้างจาน	ภายใน	t
833	192	12	โต๊ะเครื่องแป้ง	ภายใน	t
834	192	13	กล้องวงจรปิด	ภายนอก	t
835	192	14	รปภ.	ภายนอก	t
836	192	15	ลิฟต์	ภายนอก	t
837	192	16	ที่จอดรถ	ภายนอก	t
838	192	17	ฟิตเนส	ภายนอก	t
839	192	18	Lobby	ภายนอก	t
840	192	21	ที่วางพัสดุ	ภายนอก	t
841	192	23	คีย์การ์ด	ภายนอก	t
842	192	24	เครื่องซักผ้า	ภายนอก	t
843	201	1	แอร์	ภายใน	t
844	201	3	TV	ภายใน	t
845	201	4	ตู้เย็น	ภายใน	t
846	201	5	เตียงนอน	ภายใน	t
847	201	6	WIFI	ภายใน	t
848	201	7	ตู้เสื้อผ้า	ภายใน	t
849	201	8	โต๊ะทำงาน	ภายใน	t
850	201	10	เครื่องทำน้ำอุ่น	ภายใน	t
851	201	13	กล้องวงจรปิด	ภายนอก	t
852	201	14	รปภ.	ภายนอก	t
853	201	16	ที่จอดรถ	ภายนอก	t
854	201	21	ที่วางพัสดุ	ภายนอก	t
855	201	24	เครื่องซักผ้า	ภายนอก	t
856	200	1	แอร์	ภายใน	t
857	200	2	พัดลม	ภายใน	t
858	200	3	TV	ภายใน	t
859	200	4	ตู้เย็น	ภายใน	t
860	200	5	เตียงนอน	ภายใน	t
861	200	6	WIFI	ภายใน	t
862	200	7	ตู้เสื้อผ้า	ภายใน	t
863	200	13	กล้องวงจรปิด	ภายนอก	t
864	200	16	ที่จอดรถ	ภายนอก	t
865	200	21	ที่วางพัสดุ	ภายนอก	t
866	200	24	เครื่องซักผ้า	ภายนอก	t
867	199	1	แอร์	ภายใน	t
868	199	3	TV	ภายใน	t
869	199	4	ตู้เย็น	ภายใน	t
870	199	5	เตียงนอน	ภายใน	t
871	199	6	WIFI	ภายใน	t
872	199	7	ตู้เสื้อผ้า	ภายใน	t
873	199	8	โต๊ะทำงาน	ภายใน	t
874	199	10	เครื่องทำน้ำอุ่น	ภายใน	t
875	199	13	กล้องวงจรปิด	ภายนอก	t
876	199	14	รปภ.	ภายนอก	t
877	199	16	ที่จอดรถ	ภายนอก	t
878	199	21	ที่วางพัสดุ	ภายนอก	t
879	199	23	คีย์การ์ด	ภายนอก	t
880	199	24	เครื่องซักผ้า	ภายนอก	t
881	198	1	แอร์	ภายใน	t
882	198	3	TV	ภายใน	t
883	198	4	ตู้เย็น	ภายใน	t
884	198	5	เตียงนอน	ภายใน	t
885	198	6	WIFI	ภายใน	t
886	198	7	ตู้เสื้อผ้า	ภายใน	t
887	198	8	โต๊ะทำงาน	ภายใน	t
888	198	10	เครื่องทำน้ำอุ่น	ภายใน	t
889	198	13	กล้องวงจรปิด	ภายนอก	t
890	198	14	รปภ.	ภายนอก	t
891	198	16	ที่จอดรถ	ภายนอก	t
892	198	17	ฟิตเนส	ภายนอก	t
893	198	18	Lobby	ภายนอก	t
894	198	21	ที่วางพัสดุ	ภายนอก	t
895	198	23	คีย์การ์ด	ภายนอก	t
896	198	24	เครื่องซักผ้า	ภายนอก	t
897	196	2	พัดลม	ภายใน	t
898	196	3	TV	ภายใน	t
899	196	4	ตู้เย็น	ภายใน	t
900	196	5	เตียงนอน	ภายใน	t
901	196	6	WIFI	ภายใน	t
902	196	7	ตู้เสื้อผ้า	ภายใน	t
903	196	8	โต๊ะทำงาน	ภายใน	t
904	196	13	กล้องวงจรปิด	ภายนอก	t
905	196	14	รปภ.	ภายนอก	t
906	196	21	ที่วางพัสดุ	ภายนอก	t
907	196	24	เครื่องซักผ้า	ภายนอก	t
908	194	1	แอร์	ภายใน	t
909	194	3	TV	ภายใน	t
910	194	4	ตู้เย็น	ภายใน	t
911	194	5	เตียงนอน	ภายใน	t
912	194	6	WIFI	ภายใน	t
913	194	7	ตู้เสื้อผ้า	ภายใน	t
914	194	8	โต๊ะทำงาน	ภายใน	t
915	194	10	เครื่องทำน้ำอุ่น	ภายใน	t
916	194	13	กล้องวงจรปิด	ภายนอก	t
917	194	14	รปภ.	ภายนอก	t
918	194	18	Lobby	ภายนอก	t
919	194	21	ที่วางพัสดุ	ภายนอก	t
920	194	24	เครื่องซักผ้า	ภายนอก	t
921	193	1	แอร์	ภายใน	t
922	193	2	พัดลม	ภายใน	t
923	193	3	TV	ภายใน	t
924	193	5	เตียงนอน	ภายใน	t
925	193	6	WIFI	ภายใน	t
926	193	7	ตู้เสื้อผ้า	ภายใน	t
927	193	8	โต๊ะทำงาน	ภายใน	t
928	193	10	เครื่องทำน้ำอุ่น	ภายใน	t
929	193	13	กล้องวงจรปิด	ภายนอก	t
930	193	16	ที่จอดรถ	ภายนอก	t
931	193	21	ที่วางพัสดุ	ภายนอก	t
932	193	24	เครื่องซักผ้า	ภายนอก	t
933	205	1	แอร์	ภายใน	t
934	205	3	TV	ภายใน	t
935	205	4	ตู้เย็น	ภายใน	t
936	205	5	เตียงนอน	ภายใน	t
937	205	6	WIFI	ภายใน	t
938	205	7	ตู้เสื้อผ้า	ภายใน	t
939	205	8	โต๊ะทำงาน	ภายใน	t
940	205	10	เครื่องทำน้ำอุ่น	ภายใน	t
941	205	11	ซิงค์ล้างจาน	ภายใน	t
942	205	12	โต๊ะเครื่องแป้ง	ภายใน	t
943	205	13	กล้องวงจรปิด	ภายนอก	t
944	205	14	รปภ.	ภายนอก	t
945	205	16	ที่จอดรถ	ภายนอก	t
946	205	17	ฟิตเนส	ภายนอก	t
947	205	18	Lobby	ภายนอก	t
948	205	19	ตู้น้ำหยอดเหรียญ	ภายนอก	t
949	205	21	ที่วางพัสดุ	ภายนอก	t
950	205	23	คีย์การ์ด	ภายนอก	t
951	205	24	เครื่องซักผ้า	ภายนอก	t
952	204	1	แอร์	ภายใน	t
953	204	3	TV	ภายใน	t
954	204	4	ตู้เย็น	ภายใน	t
955	204	5	เตียงนอน	ภายใน	t
956	204	6	WIFI	ภายใน	t
957	204	7	ตู้เสื้อผ้า	ภายใน	t
958	204	8	โต๊ะทำงาน	ภายใน	t
959	204	10	เครื่องทำน้ำอุ่น	ภายใน	t
960	204	11	ซิงค์ล้างจาน	ภายใน	t
961	204	12	โต๊ะเครื่องแป้ง	ภายใน	t
962	204	13	กล้องวงจรปิด	ภายนอก	t
963	204	16	ที่จอดรถ	ภายนอก	t
964	204	21	ที่วางพัสดุ	ภายนอก	t
965	204	23	คีย์การ์ด	ภายนอก	t
966	204	24	เครื่องซักผ้า	ภายนอก	t
967	203	1	แอร์	ภายใน	t
968	203	3	TV	ภายใน	t
969	203	4	ตู้เย็น	ภายใน	t
970	203	5	เตียงนอน	ภายใน	t
971	203	6	WIFI	ภายใน	t
972	203	7	ตู้เสื้อผ้า	ภายใน	t
973	203	8	โต๊ะทำงาน	ภายใน	t
974	203	10	เครื่องทำน้ำอุ่น	ภายใน	t
975	203	11	ซิงค์ล้างจาน	ภายใน	t
976	203	13	กล้องวงจรปิด	ภายนอก	t
977	203	16	ที่จอดรถ	ภายนอก	t
978	203	21	ที่วางพัสดุ	ภายนอก	t
979	203	24	เครื่องซักผ้า	ภายนอก	t
1033	220	1	แอร์	ภายใน	t
1034	220	2	พัดลม	ภายใน	t
1035	220	3	TV	ภายใน	t
1036	220	4	ตู้เย็น	ภายใน	t
1037	220	5	เตียงนอน	ภายใน	t
1038	220	7	ตู้เสื้อผ้า	ภายใน	t
1039	220	10	เครื่องทำน้ำอุ่น	ภายใน	t
1040	220	13	กล้องวงจรปิด	ภายนอก	t
1041	220	14	รปภ.	ภายนอก	t
1042	220	16	ที่จอดรถ	ภายนอก	t
1043	220	18	Lobby	ภายนอก	t
1044	220	19	ตู้น้ำหยอดเหรียญ	ภายนอก	t
1045	220	21	ที่วางพัสดุ	ภายนอก	t
1046	220	24	เครื่องซักผ้า	ภายนอก	t
1047	122	1	แอร์	ภายใน	t
1048	122	3	TV	ภายใน	t
1049	122	5	เตียงนอน	ภายใน	t
1050	122	7	ตู้เสื้อผ้า	ภายใน	t
1051	122	9	ไมโครเวฟ	ภายใน	t
1052	122	11	ซิงค์ล้างจาน	ภายใน	t
1053	122	14	รปภ.	ภายนอก	t
1054	122	16	ที่จอดรถ	ภายนอก	t
1055	122	18	Lobby	ภายนอก	t
1056	122	20	สระว่ายน้ำ	ภายนอก	t
1057	122	22	อนุญาตให้เลี้ยงสัตว์	ภายนอก	t
1058	122	24	เครื่องซักผ้า	ภายนอก	t
\.


--
-- TOC entry 3447 (class 0 OID 24598)
-- Dependencies: 219
-- Data for Name: dormitory_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dormitory_images (image_id, dorm_id, image_url, upload_date, is_primary) FROM stdin;
325	186	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FDhevdanai%20Dormitory%2Fbf8a5700-aa20-4d4b-afcd-98c23b802a30-dhev2.png?alt=media&token=20f88dee-2e21-4937-9c34-85fde255bbf4	2025-10-19 21:14:12.967226	t
326	186	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FDhevdanai%20Dormitory%2F3fdd0e00-1f01-43ba-8fd2-3d10ef567fc6-dhev1.png?alt=media&token=113b45c7-5308-4f1f-93c5-8eb11e29dfe0	2025-10-19 21:14:12.967226	f
327	186	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FDhevdanai%20Dormitory%2Fb87dc6c1-3ada-4fe7-bf50-6be96cd95912-dhev3.png?alt=media&token=3df5d78d-1cbc-4c5d-a00d-14ddc6b81d1a	2025-10-19 21:14:12.967226	f
234	123	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%94%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B9%89%E0%B8%AD%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B8%A5%E0%B8%AA%2Fbe6b5ace-d354-410b-9724-00af1a080f13-Dragon1.jpg?alt=media&token=8baa72ff-0372-4a3a-bb08-f5cf7bc0c472	2025-10-07 17:59:20.595983	t
235	123	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%94%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B9%89%E0%B8%AD%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B8%A5%E0%B8%AA%2F196baf8b-b36e-490e-9ac4-cf7a877b6c2d-Dragon2.jpg?alt=media&token=3f2bc048-348d-498c-9ff2-148c77bcaca1	2025-10-07 17:59:20.595983	f
236	123	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%94%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B9%89%E0%B8%AD%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B8%A5%E0%B8%AA%2Faa5158c4-c694-46de-8056-f10fe66eca3c-Dragon3.jpg?alt=media&token=abe777b7-102e-4993-a9b1-4e961bd838af	2025-10-07 17:59:20.595983	f
328	186	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FDhevdanai%20Dormitory%2Faea1c9ff-4d45-4a5f-9ab2-05b6f0c1f076-dhev4.png?alt=media&token=b995828a-2c7c-4031-b0c7-163a8a39d7ce	2025-10-19 21:14:12.967226	f
329	186	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FDhevdanai%20Dormitory%2F67721aa8-c759-4a08-a521-93bd6b8293de-dhev5.png?alt=media&token=b5903090-7a59-4416-8ae0-6f095ca5b8a1	2025-10-19 21:14:12.967226	f
330	187	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FChaya%20Grand%20Female%20Dormitory%2Fa728acb0-203b-4fde-b000-3cfdf80ecc8b-chaya3.png?alt=media&token=a2b59797-dac8-4f5d-9647-2b2bded7033c	2025-10-19 21:15:59.891723	t
331	187	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FChaya%20Grand%20Female%20Dormitory%2F2d3e0000-2100-4d65-8e84-55bd302147f7-chaya1.png?alt=media&token=5f138c60-66af-47fa-a08e-3c43cc0cd11c	2025-10-19 21:15:59.891723	f
332	187	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FChaya%20Grand%20Female%20Dormitory%2Fbb11710a-3507-434e-a061-93e5e70c93bb-chaya2.png?alt=media&token=d10120ae-13bc-4458-9530-7e42a5ac1fee	2025-10-19 21:15:59.891723	f
333	187	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FChaya%20Grand%20Female%20Dormitory%2F0077473e-c1ac-4049-8cf1-f6c7d62c2fd8-chaya4.png?alt=media&token=e46c036c-54fa-43c2-bde4-7c319bf1c59d	2025-10-19 21:15:59.891723	f
237	123	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%94%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B9%89%E0%B8%AD%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B8%A5%E0%B8%AA%2Fa769fc68-a092-412f-95d4-43ed22125d9d-Dragon4.jpg?alt=media&token=af664969-ee71-459b-9848-ce2507663f9e	2025-10-07 17:59:20.595983	f
238	123	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%94%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B9%89%E0%B8%AD%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B8%A5%E0%B8%AA%2F781b8d6c-a164-4ff0-a399-c284c78850fd-Dragon5.jpg?alt=media&token=29f35c62-c3d3-49fb-a6bb-c38e91f9c887	2025-10-07 17:59:20.595983	f
244	125	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FChinjo%20Residence%201%2C%202%2Fe9477844-4efb-4b37-881f-2312c45be4a9-sinjo1.webp?alt=media&token=683a4451-1e44-40d7-9495-2801c5d0524a	2025-10-07 18:49:56.873599	t
245	125	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FChinjo%20Residence%201%2C%202%2F8413e7f4-c206-49c3-8e07-b24175e06966-sinjo2.webp?alt=media&token=92bcfd7f-1b46-408e-9e30-76b37e2e35e2	2025-10-07 18:49:56.873599	f
246	125	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FChinjo%20Residence%201%2C%202%2Ff5201646-3f1e-4780-a1b7-2f7b53c95a3c-sinjo3.webp?alt=media&token=2fd1b179-51ee-47df-8fab-7f4a3f559913	2025-10-07 18:49:56.873599	f
247	125	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FChinjo%20Residence%201%2C%202%2F9cd0907a-4236-4a2c-a81b-6e16a0eba445-sinjo4.webp?alt=media&token=5f949317-7863-4210-b9ec-018882c36767	2025-10-07 18:49:56.873599	f
248	125	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FChinjo%20Residence%201%2C%202%2F3586a620-ec2c-47f6-9cd0-d06504d45a58-sinjo5.webp?alt=media&token=54ba2c63-8eeb-4a01-9c00-2b40715eda62	2025-10-07 18:49:56.873599	f
249	126	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%99%E0%B8%B0%E0%B9%82%E0%B8%A1%20%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A1%E0%B8%99%E0%B8%95%E0%B9%8C%2Fa2cb163f-3167-42f0-b54a-a392e0d7842c-namo1.webp?alt=media&token=cf4cffad-3de4-4869-871e-a28946f0deae	2025-10-07 19:06:48.776313	t
250	126	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%99%E0%B8%B0%E0%B9%82%E0%B8%A1%20%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A1%E0%B8%99%E0%B8%95%E0%B9%8C%2F33d654d7-d62a-49c6-aaf9-07d598330afc-namo2.webp?alt=media&token=d6e04ce5-f7bf-4be1-946f-fdbd8c25dd4a	2025-10-07 19:06:48.776313	f
251	126	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%99%E0%B8%B0%E0%B9%82%E0%B8%A1%20%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A1%E0%B8%99%E0%B8%95%E0%B9%8C%2F405dd514-4f31-48c1-be91-bff8ab89ca4e-namo3.webp?alt=media&token=2cbee0a6-6254-4885-af69-bbabd4fc9662	2025-10-07 19:06:48.776313	f
252	126	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%99%E0%B8%B0%E0%B9%82%E0%B8%A1%20%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A1%E0%B8%99%E0%B8%95%E0%B9%8C%2F70a39a87-d34d-4422-81b9-2c1eb0f2acf2-namo4.webp?alt=media&token=6950cbd0-bfe7-4440-98a5-30991860ffdf	2025-10-07 19:06:48.776313	f
253	126	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%99%E0%B8%B0%E0%B9%82%E0%B8%A1%20%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A1%E0%B8%99%E0%B8%95%E0%B9%8C%2Fa7a21add-02f8-4d1d-a1a3-04a851d59c1b-namo5.webp?alt=media&token=8e019fd5-c44a-46a2-ae2c-a72398f74962	2025-10-07 19:06:48.776313	f
254	127	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%A5%E0%B8%B2%E0%B8%A7%E0%B8%B1%E0%B8%93%E0%B8%A2%E0%B9%8C%20%E0%B8%9B%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%84%E0%B8%A7%E0%B8%B4%E0%B8%A5%E0%B8%A5%E0%B9%8C%201%2C%202%2F38bb21f9-f7d1-4e91-a853-70189b7b2964-lawan1.webp?alt=media&token=9fbf08f9-a83c-402e-9032-005898c83234	2025-10-07 19:13:01.285042	t
255	127	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%A5%E0%B8%B2%E0%B8%A7%E0%B8%B1%E0%B8%93%E0%B8%A2%E0%B9%8C%20%E0%B8%9B%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%84%E0%B8%A7%E0%B8%B4%E0%B8%A5%E0%B8%A5%E0%B9%8C%201%2C%202%2Fd9bd9f00-77ca-44a7-943a-5c743066dbfc-lawan2.webp?alt=media&token=ef6b7371-951f-437f-b212-d87ce8e66f65	2025-10-07 19:13:01.285042	f
334	187	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FChaya%20Grand%20Female%20Dormitory%2F9339a6ae-98b9-413a-b221-0130b9898ae0-chaya5.png?alt=media&token=9305a8ad-32f8-4076-8b9c-c2df8781896e	2025-10-19 21:15:59.891723	f
335	189	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FPunthanakarn%20Female%20Dormitory%2Fedc0e5b8-dbf9-4b75-b282-0f46f152c194-punth2.png?alt=media&token=af355ce8-e09e-426d-8f3c-537d9480f945	2025-10-19 21:17:47.786002	t
336	189	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FPunthanakarn%20Female%20Dormitory%2F069c507f-ec2e-442f-8dbd-065d304dbc95-punth1.png?alt=media&token=51b3f854-3700-436f-8e90-2fe6fedbd92f	2025-10-19 21:17:47.786002	f
337	189	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FPunthanakarn%20Female%20Dormitory%2F96955b9b-9c43-4eaa-8b2f-0375f54c5f32-punth3.png?alt=media&token=687b0dde-73c0-448b-9529-e62824058bef	2025-10-19 21:17:47.786002	f
256	127	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%A5%E0%B8%B2%E0%B8%A7%E0%B8%B1%E0%B8%93%E0%B8%A2%E0%B9%8C%20%E0%B8%9B%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%84%E0%B8%A7%E0%B8%B4%E0%B8%A5%E0%B8%A5%E0%B9%8C%201%2C%202%2Fe28cafc6-3dda-455a-8efb-8fa5cc1730dd-lawan3.webp?alt=media&token=c9240462-aa26-4c8c-8d69-a5cf29b4826c	2025-10-07 19:13:01.285042	f
257	127	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%A5%E0%B8%B2%E0%B8%A7%E0%B8%B1%E0%B8%93%E0%B8%A2%E0%B9%8C%20%E0%B8%9B%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%84%E0%B8%A7%E0%B8%B4%E0%B8%A5%E0%B8%A5%E0%B9%8C%201%2C%202%2Fb3b016e7-001e-4e7d-9efc-5ad89891e558-lawan4.webp?alt=media&token=ff37799f-a08b-4163-b47e-cba2123f3119	2025-10-07 19:13:01.285042	f
258	127	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%A5%E0%B8%B2%E0%B8%A7%E0%B8%B1%E0%B8%93%E0%B8%A2%E0%B9%8C%20%E0%B8%9B%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%84%E0%B8%A7%E0%B8%B4%E0%B8%A5%E0%B8%A5%E0%B9%8C%201%2C%202%2F95be7fb6-1688-4869-a6ef-a49ec752907b-lawan5.webp?alt=media&token=95c81f8b-28fa-449d-b444-0f35558f2252	2025-10-07 19:13:01.285042	f
338	189	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FPunthanakarn%20Female%20Dormitory%2F19166e5b-37e3-472b-afa3-2ebe9a4e16a1-punth4.png?alt=media&token=82c16f37-8a48-49e4-9a1c-db3428448041	2025-10-19 21:17:47.786002	f
339	189	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FPunthanakarn%20Female%20Dormitory%2F65ca4d82-f7c8-425e-a2ac-b2326b5ac40c-punth5.png?alt=media&token=f8189617-7d70-48bd-b73a-3ef33dcb8940	2025-10-19 21:17:47.786002	f
340	190	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FAue%20Sabai%20Dormitory%20-%20%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%AD%E0%B8%A2%E0%B8%B9%E0%B9%88%E0%B8%AA%E0%B8%9A%E0%B8%B2%E0%B8%A2%2F696c5552-68bc-465f-bea8-e2fa56b50ea5-aue1.png?alt=media&token=c4790a4d-fe19-482a-93f5-72a3583c5c85	2025-10-19 21:19:28.439386	t
341	190	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FAue%20Sabai%20Dormitory%20-%20%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%AD%E0%B8%A2%E0%B8%B9%E0%B9%88%E0%B8%AA%E0%B8%9A%E0%B8%B2%E0%B8%A2%2Fc7ba103a-c245-4ede-8c22-efa141c9178f-aue2.png?alt=media&token=c3820ca9-3077-4c31-b588-4667a33325a5	2025-10-19 21:19:28.439386	f
342	190	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FAue%20Sabai%20Dormitory%20-%20%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%AD%E0%B8%A2%E0%B8%B9%E0%B9%88%E0%B8%AA%E0%B8%9A%E0%B8%B2%E0%B8%A2%2F5da30cbb-b731-496a-a43f-e3b679fcf22d-aue3.png?alt=media&token=afaad970-c0be-40ee-90b2-205216e6e0a3	2025-10-19 21:19:28.439386	f
343	190	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FAue%20Sabai%20Dormitory%20-%20%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%AD%E0%B8%A2%E0%B8%B9%E0%B9%88%E0%B8%AA%E0%B8%9A%E0%B8%B2%E0%B8%A2%2F52886386-47fe-4643-8813-c180181c1307-aue4.png?alt=media&token=61bb43b3-20d5-47b1-8d3b-9c240d9ad330	2025-10-19 21:19:28.439386	f
344	190	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FAue%20Sabai%20Dormitory%20-%20%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%AD%E0%B8%A2%E0%B8%B9%E0%B9%88%E0%B8%AA%E0%B8%9A%E0%B8%B2%E0%B8%A2%2Fd63d9f4f-dd06-4994-bff3-3d48a553cb27-aue5.png?alt=media&token=611a056b-aee8-4204-a185-16a450de8a79	2025-10-19 21:19:28.439386	f
345	191	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSri%20Chandra%20Orchid%20Dormitory%2Faff7232b-b825-4a13-b372-86b8e023092d-srijan2.png?alt=media&token=1bd8a0ac-0145-4202-8d7d-83048f8af96f	2025-10-19 21:21:59.407675	t
239	124	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FNada%20Living%20Place%2F58d4d595-d5e6-4973-ac4d-8fa8164ed92a-nada1.png?alt=media&token=99ddbba6-91b3-47be-99eb-e02afa3c244c	2025-10-07 18:16:01.966688	t
240	124	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FNada%20Living%20Place%2Fa5081054-d98c-40f8-be4c-ff49e03490cb-nada2.png?alt=media&token=5b09fb49-dec0-4885-92c3-54145ce8f392	2025-10-07 18:16:01.966688	f
241	124	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FNada%20Living%20Place%2Ff1ea70c6-1bc1-4d5b-baaa-3b53014c0934-nada3.png?alt=media&token=2aed2110-3c59-4df8-b22d-2c5c3269a740	2025-10-07 18:16:01.966688	f
242	124	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FNada%20Living%20Place%2F1b047a9b-6539-450a-a809-b44801b28a8e-nada4.png?alt=media&token=34bc775f-b2ba-450f-a543-a48029a4e38c	2025-10-07 18:16:01.966688	f
243	124	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FNada%20Living%20Place%2Fff3ed2ec-abbd-4dee-8f8c-fa6cc89a77df-nada5.png?alt=media&token=f4cbfbf7-d31b-41bf-b793-572eaff71d65	2025-10-07 18:16:01.966688	f
259	128	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FN.P.%20Place%20Dormitory%2F091a1317-790e-4f0b-bf48-ed5b03d42d1a-npplace1.png?alt=media&token=1e2f17d1-4b92-475b-8b0b-959ff7d260d9	2025-10-07 19:43:15.078959	t
260	128	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FN.P.%20Place%20Dormitory%2Fea04c17a-f5e7-4c3f-96aa-62dd04169436-npplace2.png?alt=media&token=67f4b654-6970-4adc-8788-48738b7f1220	2025-10-07 19:43:15.078959	f
261	128	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FN.P.%20Place%20Dormitory%2F150ecd2f-9e1d-43bd-a6af-1e6e95536266-npplace3.webp?alt=media&token=aea088b4-8a3f-4547-a79e-7181cd0d925a	2025-10-07 19:43:15.078959	f
262	128	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FN.P.%20Place%20Dormitory%2Fd5a1a80f-6f8f-4848-8cdd-db0af4053ef8-npplace4.webp?alt=media&token=8c71adf2-e491-4c2d-b438-6fd984f6e259	2025-10-07 19:43:15.078959	f
263	128	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FN.P.%20Place%20Dormitory%2F02361d71-2edb-44ca-a538-0351b329cc68-npplace5.webp?alt=media&token=11d3244d-f5e9-4098-962f-0af24f6e8759	2025-10-07 19:43:15.078959	f
264	129	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Best%2Ff9752c41-e169-4b6d-a841-7c8934caecab-thebest1.webp?alt=media&token=025c4170-468f-4d4e-8485-dd1710c6ed9a	2025-10-07 19:50:45.887584	t
265	129	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Best%2Fc179b502-8a40-4a81-91b7-377327a0152e-thebest2.webp?alt=media&token=43bc8f8f-8ed9-456d-a14f-b206435b6e71	2025-10-07 19:50:45.887584	f
266	129	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Best%2F21c03903-935c-4336-82d2-095551847cb5-thebest3.webp?alt=media&token=90dac644-59fa-4c18-a2bc-04a2f8aab54a	2025-10-07 19:50:45.887584	f
346	191	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSri%20Chandra%20Orchid%20Dormitory%2F7690fb01-dbdf-4407-94eb-32683a755790-srijan1.png?alt=media&token=f392d6ee-3e8c-4111-bd2e-2946f887a251	2025-10-19 21:21:59.407675	f
347	191	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSri%20Chandra%20Orchid%20Dormitory%2Fd91fb63f-5746-4cd2-b320-e66635d717fc-srijan3.png?alt=media&token=372e74cb-069b-4c45-9150-e19fd2ef3bb2	2025-10-19 21:21:59.407675	f
348	191	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSri%20Chandra%20Orchid%20Dormitory%2F83b326bf-0ad1-4a0d-b210-17baa63503a7-srijan4.png?alt=media&token=82046e70-d4e4-4254-afce-1438c53fc91c	2025-10-19 21:21:59.407675	f
349	191	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSri%20Chandra%20Orchid%20Dormitory%2F2c8006da-abb5-4026-ace7-22a7fa47e479-srijan5.png?alt=media&token=e1298f47-7c2d-4b3c-a43c-361776871191	2025-10-19 21:21:59.407675	f
360	200	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FNara%20Dahla%20Dormitory%2Fa940f26b-50f3-4221-b3b2-69dbc16c5d9d-nara3.png?alt=media&token=a47cc053-aecd-4801-8a63-65ab81aa6a4c	2025-10-19 21:43:59.280772	t
361	200	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FNara%20Dahla%20Dormitory%2Fcf18e509-ab96-42f7-8934-fa042bac161c-nara1.png?alt=media&token=159ca368-cc99-42cf-b234-21130a959a7c	2025-10-19 21:43:59.280772	f
362	200	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FNara%20Dahla%20Dormitory%2F0a2e928d-667e-4986-ad17-dae333893ba0-nara2.png?alt=media&token=69d2870e-d900-4517-afc5-4fe52007f7da	2025-10-19 21:43:59.280772	f
267	129	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Best%2F1361eff5-1507-4c3f-a608-8a8af68f046f-thebest4.webp?alt=media&token=add70278-ea75-4fbe-ae5f-4530a8da7f99	2025-10-07 19:50:45.887584	f
268	129	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Best%2Fc9fd04d7-dfc9-401d-b39e-a9121a34c93e-thebest5.webp?alt=media&token=8b1b23f5-104b-40cf-96ed-8a9ffd83e03e	2025-10-07 19:50:45.887584	f
269	130	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Night%20house%2F72d57adf-5a8f-40d3-9306-fc47cb9db421-thenight1.webp?alt=media&token=c2b05963-9b16-4ca4-8618-0ef5079c5fe8	2025-10-07 20:45:25.107805	t
270	130	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Night%20house%2Fadf81fdb-4a1d-4078-8876-dc3e68070249-thenight2.webp?alt=media&token=0010c62b-1f9f-46fc-8792-6f7ec9094dac	2025-10-07 20:45:25.107805	f
271	130	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Night%20house%2F74660544-0633-483c-9f28-c28eb365d754-thenight3.webp?alt=media&token=737bdf15-7d48-4355-bc92-72f368c7c37b	2025-10-07 20:45:25.107805	f
272	130	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Night%20house%2F23b5a24a-cd24-423e-851b-acd32c9486f3-thenight4.webp?alt=media&token=9191221d-bdfd-4e02-be9b-cb5f461c3257	2025-10-07 20:45:25.107805	f
273	130	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Night%20house%2F0a5175b1-6f00-430e-8700-2e3e346e5c69-thenight5.webp?alt=media&token=77b9eef8-0d81-4802-ab22-591f7deb2d93	2025-10-07 20:45:25.107805	f
274	131	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%9E%E0%B8%87%E0%B8%A8%E0%B9%8C%E0%B8%AA%E0%B8%B8%E0%B8%A3%E0%B8%B5%2F54c95b6f-9cf6-44b6-85d5-91d31488e6c5-punksuri1.webp?alt=media&token=3c3c52bc-bd70-4cba-8c63-f52d23d0c549	2025-10-07 20:51:52.370225	t
275	131	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%9E%E0%B8%87%E0%B8%A8%E0%B9%8C%E0%B8%AA%E0%B8%B8%E0%B8%A3%E0%B8%B5%2Fe62f255c-405a-47e1-b5ec-03064cedc713-punksuri2.webp?alt=media&token=fc0367e4-0e12-4dc6-8dec-5ac836f82667	2025-10-07 20:51:52.370225	f
276	131	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%9E%E0%B8%87%E0%B8%A8%E0%B9%8C%E0%B8%AA%E0%B8%B8%E0%B8%A3%E0%B8%B5%2F558839cd-5aa2-4aa6-b096-687bfe5603d7-punksuri3.webp?alt=media&token=1804867d-6ab5-49f2-8449-32fb97071f73	2025-10-07 20:51:52.370225	f
277	131	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%9E%E0%B8%87%E0%B8%A8%E0%B9%8C%E0%B8%AA%E0%B8%B8%E0%B8%A3%E0%B8%B5%2F699a6007-c21f-4080-a84e-2856c517d79a-punksuri4.webp?alt=media&token=cb3aa77f-edda-46e9-893b-618fab878325	2025-10-07 20:51:52.370225	f
278	131	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%9E%E0%B8%87%E0%B8%A8%E0%B9%8C%E0%B8%AA%E0%B8%B8%E0%B8%A3%E0%B8%B5%2F2c9dbcf4-c893-4bb5-8d5e-366911838f6d-punksuri5.webp?alt=media&token=09119f0b-92cb-4544-a8cb-1580c05adef5	2025-10-07 20:51:52.370225	f
279	132	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B9%83%E0%B8%81%E0%B8%A5%E0%B9%89%20%E0%B8%A1%E0%B8%A1%E0%B8%AA.%20%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%A5%E0%B8%94%E0%B8%B2%2F1fe1017c-d011-448d-9d16-b575298935e6-kornlada1.webp?alt=media&token=c799471c-fe76-4ce2-b508-7098112d5525	2025-10-07 20:57:29.504694	t
280	132	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B9%83%E0%B8%81%E0%B8%A5%E0%B9%89%20%E0%B8%A1%E0%B8%A1%E0%B8%AA.%20%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%A5%E0%B8%94%E0%B8%B2%2Fd15391e8-e8f7-4549-aca0-61eb3594886c-kornlada2.webp?alt=media&token=ff0eca52-707b-4e35-9cb6-e600018292d5	2025-10-07 20:57:29.504694	f
281	132	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B9%83%E0%B8%81%E0%B8%A5%E0%B9%89%20%E0%B8%A1%E0%B8%A1%E0%B8%AA.%20%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%A5%E0%B8%94%E0%B8%B2%2F8dc6e5c9-bb86-425b-a7e3-0dc0b1fdb7c2-kornlada3.webp?alt=media&token=443b6f9a-66d0-4689-bbaa-8fb539ec001a	2025-10-07 20:57:29.504694	f
282	132	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B9%83%E0%B8%81%E0%B8%A5%E0%B9%89%20%E0%B8%A1%E0%B8%A1%E0%B8%AA.%20%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%A5%E0%B8%94%E0%B8%B2%2Fd26853e7-6f99-4ac0-98ff-507b101c8829-kornlada4.webp?alt=media&token=7cf35882-3b6a-4163-92c4-8cc8fe8586c8	2025-10-07 20:57:29.504694	f
283	132	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B9%83%E0%B8%81%E0%B8%A5%E0%B9%89%20%E0%B8%A1%E0%B8%A1%E0%B8%AA.%20%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%A5%E0%B8%94%E0%B8%B2%2F7943fec1-f10c-4136-a5c1-248215bac14f-kornlada5.webp?alt=media&token=fcb63cf1-27f4-4adb-8584-7878a0cc5ff1	2025-10-07 20:57:29.504694	f
350	192	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSrichan%20Orchid%203%2Fac6e522e-d2c5-4aec-8334-9dbc63feb985-srijan31.png?alt=media&token=f0c4d17e-9cbe-440f-8378-74876adf772a	2025-10-19 21:28:02.648117	t
351	192	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSrichan%20Orchid%203%2F707010c6-9fbb-4b1e-b9a6-9660dd98dcb2-srijan32.png?alt=media&token=fcfc5ac1-75dd-458c-8fa8-40eecfbb1be5	2025-10-19 21:28:02.648117	f
352	192	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSrichan%20Orchid%203%2F4183d4a7-c079-4bc6-8bda-b0b885bd978d-srijan33.png?alt=media&token=2021e6f8-d6a2-4cc5-9dba-2dc78a42a486	2025-10-19 21:28:02.648117	f
353	192	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSrichan%20Orchid%203%2F4351a383-a1a6-4adb-b3ef-6e35525b3548-srijan34.png?alt=media&token=de56de60-5721-424d-b3d5-46da1c10ad63	2025-10-19 21:28:02.648117	f
354	192	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSrichan%20Orchid%203%2F54dd8c98-ef3f-4718-9681-71d91c8e2cae-srijan35.png?alt=media&token=4ba038ee-39c0-4228-a64a-f712f107c280	2025-10-19 21:28:02.648117	f
370	198	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FYok's%20Apartment%2F416cacfe-1ea0-404a-9e81-a421ba71ef5d-yok1.png?alt=media&token=8f9b3e64-bf95-423c-bbfa-e6b56974de37	2025-10-19 22:12:43.430926	t
289	99	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FArunchai%20Grand%20(%E0%B8%AD%E0%B8%A3%E0%B8%B1%E0%B8%8D%E0%B8%8A%E0%B8%B1%E0%B8%A2%E0%B9%81%E0%B8%81%E0%B8%A3%E0%B8%99%E0%B8%94%E0%B9%8C)%2Facc339fb-d8a7-4923-95e1-e8dccab289b6-FKe7hpwREAm7xmWTEJ6A.webp?alt=media&token=e4ba38a7-f2ec-4177-a882-31a711102aa8	2025-10-17 14:23:22.177872	t
290	99	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FArunchai%20Grand%20(%E0%B8%AD%E0%B8%A3%E0%B8%B1%E0%B8%8D%E0%B8%8A%E0%B8%B1%E0%B8%A2%E0%B9%81%E0%B8%81%E0%B8%A3%E0%B8%99%E0%B8%94%E0%B9%8C)%2F3e49bb6e-e2b2-458f-a651-5a47b60e5733-jRhnu3ME45kRhnU8sXzz.webp?alt=media&token=ab0fc716-87ea-44d8-b98c-02ec002ead5a	2025-10-17 14:23:22.177872	f
291	99	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FArunchai%20Grand%20(%E0%B8%AD%E0%B8%A3%E0%B8%B1%E0%B8%8D%E0%B8%8A%E0%B8%B1%E0%B8%A2%E0%B9%81%E0%B8%81%E0%B8%A3%E0%B8%99%E0%B8%94%E0%B9%8C)%2Fd6c296a0-63bc-4600-bbd1-82ba9e87057a-matp7XkW6Zka7ECHWPPj.webp?alt=media&token=59bd1352-3593-44a5-aeea-970b82aca12b	2025-10-17 14:23:22.177872	f
292	99	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FArunchai%20Grand%20(%E0%B8%AD%E0%B8%A3%E0%B8%B1%E0%B8%8D%E0%B8%8A%E0%B8%B1%E0%B8%A2%E0%B9%81%E0%B8%81%E0%B8%A3%E0%B8%99%E0%B8%94%E0%B9%8C)%2F8ccce817-4757-40bd-b08d-7ce8ad8b5e4d-qebsF65bZw6Xf1N3N2wT.webp?alt=media&token=b0e55c35-ec93-42e1-a661-49c1187a2f19	2025-10-17 14:23:22.177872	f
293	99	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FArunchai%20Grand%20(%E0%B8%AD%E0%B8%A3%E0%B8%B1%E0%B8%8D%E0%B8%8A%E0%B8%B1%E0%B8%A2%E0%B9%81%E0%B8%81%E0%B8%A3%E0%B8%99%E0%B8%94%E0%B9%8C)%2Feb61c13f-fb85-4a9d-a64d-ca631a367d83-x2XdUAEA4xqjrF5qcfzx.webp?alt=media&token=c4535afa-4730-4314-a066-c964bcbd883f	2025-10-17 14:23:22.177872	f
355	201	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FHuean%20Pen%20%7C%20%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B9%80%E0%B8%AE%E0%B8%B7%E0%B8%AD%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B9%87%E0%B8%8D%2Fd10c6b63-2cfe-4c7f-b005-173918632cd5-henpen1.png?alt=media&token=7f79b85a-5345-4254-92c9-732ca899c582	2025-10-19 21:38:33.235935	t
356	201	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FHuean%20Pen%20%7C%20%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B9%80%E0%B8%AE%E0%B8%B7%E0%B8%AD%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B9%87%E0%B8%8D%2Fdcdc3052-3b46-47db-ba04-ec94e2c37969-henpen2.png?alt=media&token=dc595f62-a0fa-4e8a-b9a2-791a033f1143	2025-10-19 21:38:33.235935	f
357	201	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FHuean%20Pen%20%7C%20%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B9%80%E0%B8%AE%E0%B8%B7%E0%B8%AD%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B9%87%E0%B8%8D%2F7138aee8-d5b6-46a5-ad09-f6e7aab9b00c-henpen3.png?alt=media&token=10dcce1c-8fa6-4f5e-8637-959353b1f90b	2025-10-19 21:38:33.235935	f
358	201	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FHuean%20Pen%20%7C%20%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B9%80%E0%B8%AE%E0%B8%B7%E0%B8%AD%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B9%87%E0%B8%8D%2F4acac075-78e7-4fe9-b7db-e45b8de86082-henpen4.png?alt=media&token=84f7a4f4-895f-4104-a1c7-290610939f44	2025-10-19 21:38:33.235935	f
359	201	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FHuean%20Pen%20%7C%20%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B9%80%E0%B8%AE%E0%B8%B7%E0%B8%AD%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B9%87%E0%B8%8D%2Fb3428a7c-60d0-4be3-869f-ec1af9f408bc-henpen5.png?alt=media&token=98ffe1f7-6e50-43a9-b741-0ed4d3cab768	2025-10-19 21:38:33.235935	f
365	199	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2Fthe%20snooze%2066%20(%E0%B9%80%E0%B8%94%E0%B8%AD%E0%B8%B0%20%E0%B8%AA%E0%B8%99%E0%B8%B9%E0%B8%8B%2066)%2F02fc3f90-101d-4520-a1de-cda1b6c946bc-snooze1.png?alt=media&token=e8c2638d-5525-494b-856c-f684de177cf5	2025-10-19 21:50:28.579123	t
286	133	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B9%82%E0%B8%A3%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%99%2Fd5e09a3b-72b2-43c5-96b4-3425e24c755b-556645825_4306384562.jpg?alt=media&token=45bc8ccc-d1d2-498d-9f1c-ed8c566158c4	2025-10-10 18:41:36.5678	f
288	133	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B9%82%E0%B8%A3%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%99%2F1ea6942c-fa84-44f8-ad85-0195a60133b4-558099042_4306384472.jpg?alt=media&token=f10f933e-4e63-4fb0-8e63-40d12a8277c0	2025-10-10 18:41:36.5678	t
371	198	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FYok's%20Apartment%2F2a21e3ee-e615-403f-95cb-418bc71d4451-yok2.png?alt=media&token=56dcc8d5-3f9a-4363-b5f7-c0056c3391a8	2025-10-19 22:12:43.430926	f
287	133	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B9%82%E0%B8%A3%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%99%2F1c0f422b-0572-49ef-b515-bc5fd2d362b5-557717987_4306384486.jpg?alt=media&token=c17662af-237f-4241-8d5c-3ae06d868852	2025-10-10 18:41:36.5678	f
363	200	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FNara%20Dahla%20Dormitory%2Fdac10a91-9635-4bb6-9706-227c61ad3ff1-nara4.png?alt=media&token=2f38299c-d01a-4cd9-895c-7271582b9ece	2025-10-19 21:43:59.280772	f
285	133	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B9%82%E0%B8%A3%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%99%2Fc610e190-0c52-4bb9-820c-086bcdfd1c04-557645159_4306384512.jpg?alt=media&token=b16ff7b1-f8d1-4cd8-a422-297349871641	2025-10-10 18:41:36.5678	f
295	133	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B9%82%E0%B8%A3%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%99%2Fbd4b3c6d-5cdf-4ab6-9bb2-e21a595ba52f-matp7XkW6Zka7ECHWPPj.webp?alt=media&token=bbd76c49-e537-49de-8753-43afe6612206	2025-10-18 18:30:47.599202	f
296	133	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B9%82%E0%B8%A3%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%99%2Fdb604e9d-45f4-4e57-9584-0d764a4510c6-qebsF65bZw6Xf1N3N2wT.webp?alt=media&token=fb816b2e-6659-49ff-9dfb-1b47360c0e16	2025-10-18 18:30:47.599202	f
364	200	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FNara%20Dahla%20Dormitory%2F9262150d-c623-454d-89bb-9bdc5aeb1044-nara5.png?alt=media&token=e7d723ee-1d5f-414e-a1ad-01d916eaadce	2025-10-19 21:43:59.280772	f
298	133	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B9%82%E0%B8%A3%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%99%2F1ad238a1-a164-42cf-9ba6-f749490ec5e4-x2XdUAEA4xqjrF5qcfzx.webp?alt=media&token=0417e2f7-b148-451e-b055-d162b0d0981f	2025-10-18 18:30:47.599202	f
366	199	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2Fthe%20snooze%2066%20(%E0%B9%80%E0%B8%94%E0%B8%AD%E0%B8%B0%20%E0%B8%AA%E0%B8%99%E0%B8%B9%E0%B8%8B%2066)%2F6d298064-a907-4a6b-9af8-fc21f53c5f69-snooze2.png?alt=media&token=b6b9b26a-fcdc-41b3-8e10-7c8e815c6bd2	2025-10-19 21:50:28.579123	f
294	133	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B9%82%E0%B8%A3%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%99%2F0f1b6203-bb7e-4cf8-aa54-717e14f3bc49-jRhnu3ME45kRhnU8sXzz.webp?alt=media&token=2cdb85ba-f7c2-4ede-86e6-fa4eaf4f39b3	2025-10-18 18:30:47.599202	t
367	199	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2Fthe%20snooze%2066%20(%E0%B9%80%E0%B8%94%E0%B8%AD%E0%B8%B0%20%E0%B8%AA%E0%B8%99%E0%B8%B9%E0%B8%8B%2066)%2Fb622a977-f3ee-47b2-9dbe-5db44bbc97ae-snooze3.png?alt=media&token=0deb33d6-bc4a-4e92-9eef-4148bf704f45	2025-10-19 21:50:28.579123	f
368	199	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2Fthe%20snooze%2066%20(%E0%B9%80%E0%B8%94%E0%B8%AD%E0%B8%B0%20%E0%B8%AA%E0%B8%99%E0%B8%B9%E0%B8%8B%2066)%2F7df4b62b-e7e1-44e8-ba3e-7534dd04e585-snooze4.png?alt=media&token=5e30b251-d1f2-4063-95cc-b854bd2c7cbc	2025-10-19 21:50:28.579123	f
369	199	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2Fthe%20snooze%2066%20(%E0%B9%80%E0%B8%94%E0%B8%AD%E0%B8%B0%20%E0%B8%AA%E0%B8%99%E0%B8%B9%E0%B8%8B%2066)%2Fda84b806-5e56-4eab-963d-2d353343d7bd-snooze5.png?alt=media&token=a19ef1a5-5d7e-453d-aeb7-c61ea45b82c5	2025-10-19 21:50:28.579123	f
372	198	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FYok's%20Apartment%2F0d3eb35e-ab7d-4f24-946e-646c54cae05f-yok3.png?alt=media&token=9ab1a6b7-fc37-4d75-812d-4447f700b3b7	2025-10-19 22:12:43.430926	f
373	198	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FYok's%20Apartment%2F34495688-96bd-4236-97eb-85d149d5fb55-yok4.png?alt=media&token=177a2315-7073-4462-959b-496c8e3e18ed	2025-10-19 22:12:43.430926	f
374	198	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FYok's%20Apartment%2F5fb33b57-2f37-4007-b9fe-20d02677a9b5-yok5.png?alt=media&token=5664696a-fd24-4d39-b48b-be7f96015e29	2025-10-19 22:12:43.430926	f
375	196	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThana%20Park%20Dormitory%2F7e59f259-393c-47f2-abc3-51a57ea7482b-thana1.png?alt=media&token=4b79213c-9f76-44bf-88b5-45046aa7d2c8	2025-10-19 22:18:38.854199	t
376	196	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThana%20Park%20Dormitory%2Ff69a4e7a-7e48-455b-8728-660032bee329-thana2.png?alt=media&token=d2f10d0f-a434-4f36-8fcf-19cf7cda4a1f	2025-10-19 22:18:38.854199	f
377	196	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThana%20Park%20Dormitory%2Fb55b6b16-00c1-4fd5-b90d-40f9aaea28ac-thana3.png?alt=media&token=6fb30af0-bde7-477b-b82f-cc01133bf127	2025-10-19 22:18:38.854199	f
378	196	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThana%20Park%20Dormitory%2Ff9ad1906-5910-4f75-85b5-a70e2a4e383d-thana4.png?alt=media&token=d17d6dbb-f38f-4c0e-b7ad-9251ad624afc	2025-10-19 22:18:38.854199	f
379	196	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThana%20Park%20Dormitory%2F119f7292-63ef-43fe-bb7a-439f5af29cae-thana5.png?alt=media&token=cfdd6a53-ffe2-4c89-954d-443b2646a9d3	2025-10-19 22:18:38.854199	f
380	194	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FB.B.Mansion%2F5c4cb0f7-60c6-4a52-bf4c-6da3e99bca91-BB1.png?alt=media&token=2b6ba144-81a0-4552-9597-f6baaec49e04	2025-10-19 22:24:39.537552	t
381	194	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FB.B.Mansion%2F83b54ffd-29d9-473c-99ec-541aa9fb974f-BB2.png?alt=media&token=a8944814-1a5e-4cfb-b1a5-04457956e0bc	2025-10-19 22:24:39.537552	f
382	194	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FB.B.Mansion%2F2dbb7214-0949-4acd-86c1-790432ec0815-BB3.png?alt=media&token=c1ecc48f-66f6-49df-817c-5ffa21f8693a	2025-10-19 22:24:39.537552	f
383	194	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FB.B.Mansion%2Ff3d4f4f8-1d76-4f16-befe-243b31d98c2a-BB4.png?alt=media&token=d424e2d8-4395-4536-80c0-c9a5e23c8ce5	2025-10-19 22:24:39.537552	f
384	194	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FB.B.Mansion%2Fc0a0cb96-926f-454e-af56-42c51d2025f4-BB5.png?alt=media&token=6207434a-c1ff-4bad-91f5-450031c7d4ef	2025-10-19 22:24:39.537552	f
385	193	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FRom%20Chatra%20Female%20Dormitory%2Fcff6378f-3fec-4d0b-9d21-3919895a23f4-chatfe1.png?alt=media&token=a0c53522-0c48-4785-9970-3ff31cbea379	2025-10-19 22:32:16.732957	t
386	193	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FRom%20Chatra%20Female%20Dormitory%2F6ec70cfd-9815-4c04-8528-1467e39a597d-chatfe2.png?alt=media&token=c8dd191d-5fa5-4f9f-9756-30361bd10880	2025-10-19 22:32:16.732957	f
387	193	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FRom%20Chatra%20Female%20Dormitory%2F66ee2113-ef26-4ccb-bc13-dcc617c84589-chatfe3.png?alt=media&token=76700412-a6b3-4f45-953e-911fc4990137	2025-10-19 22:32:16.732957	f
388	193	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FRom%20Chatra%20Female%20Dormitory%2Fc7bd59d3-2fa8-4120-916b-fd729f6346e0-chatfe4.png?alt=media&token=3d2b5cbc-6f8e-480a-9fc0-1e2864867cc2	2025-10-19 22:32:16.732957	f
389	193	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FRom%20Chatra%20Female%20Dormitory%2F51fba7d6-65b6-472b-b3e0-d62c4ef199e6-chatfe5.png?alt=media&token=4d7b12b4-71b7-4359-b41c-d40d318cf821	2025-10-19 22:32:16.732957	f
390	205	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Peace%2F481e711e-4922-4d7f-8df7-f539ee1c7633-thepeace1.png?alt=media&token=9f4588f2-055f-46dc-88e6-445a72f480d5	2025-10-19 22:41:16.933466	t
391	205	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Peace%2Fd0db72e2-5c6b-4209-8e2b-79199c0cbe31-thepeace2.png?alt=media&token=fc30b9f4-c731-4270-97d6-30f4d8bd8b64	2025-10-19 22:41:16.933466	f
392	205	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Peace%2Fd59fc36b-71d3-4d20-b574-53471cb2c786-thepeace3.png?alt=media&token=addb8d17-f126-4b9e-9aa1-a73f5c857950	2025-10-19 22:41:16.933466	f
393	205	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Peace%2Fc2c130ec-d727-4522-8699-44c46056f8e4-thepeace4.png?alt=media&token=a83902bd-e625-4eeb-93bc-a767b3845661	2025-10-19 22:41:16.933466	f
394	205	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FThe%20Peace%2F66974330-e073-49b8-8933-fb01d4975877-thepeace5.png?alt=media&token=5d93c4ae-007c-4e61-bc6b-20eaf452c45a	2025-10-19 22:41:16.933466	f
395	204	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A1%E0%B8%9E%E0%B8%B5%E0%B9%88%E0%B8%99%E0%B9%89%E0%B8%AD%E0%B8%87%2Fd3c0472e-e391-44aa-ad39-934ae087b788-3pee1.png?alt=media&token=1f2a640c-9293-4b50-88b4-d7569f4e98cb	2025-10-19 23:10:38.101128	t
396	204	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A1%E0%B8%9E%E0%B8%B5%E0%B9%88%E0%B8%99%E0%B9%89%E0%B8%AD%E0%B8%87%2F287d8533-4fb3-4872-a21f-2f35d2aa5e79-3pee2.png?alt=media&token=533960b1-0782-48f5-9f69-2ff2cd98a2ed	2025-10-19 23:10:38.101128	f
397	204	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A1%E0%B8%9E%E0%B8%B5%E0%B9%88%E0%B8%99%E0%B9%89%E0%B8%AD%E0%B8%87%2F2e6e9724-ba3e-4127-8b34-8637adbfd867-3pee3.png?alt=media&token=184b38d7-59b0-4e0a-92b2-c6e6fb0ffc7c	2025-10-19 23:10:38.101128	f
398	204	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A1%E0%B8%9E%E0%B8%B5%E0%B9%88%E0%B8%99%E0%B9%89%E0%B8%AD%E0%B8%87%2F2d51e4e7-dcbc-4947-bf4a-c87ddd498ffe-3pee4.png?alt=media&token=43ef486a-a7f0-436d-9c99-bd856b18f40d	2025-10-19 23:10:38.101128	f
399	204	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AB%E0%B8%AD%E0%B8%9E%E0%B8%B1%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A1%E0%B8%9E%E0%B8%B5%E0%B9%88%E0%B8%99%E0%B9%89%E0%B8%AD%E0%B8%87%2F74279ffc-06cc-4e50-ad10-06a4ff25d91e-3pee5.png?alt=media&token=ec45ca5f-49a8-4d37-859a-0aa493320b25	2025-10-19 23:10:38.101128	f
400	203	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSombutsiri%20Female%20Dormitory%2F154b1257-addc-4a42-9acf-e634c119e96a-sombut1.png?alt=media&token=8380635a-22a3-429a-94e9-31db4728ace5	2025-10-19 23:16:51.768291	t
401	203	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSombutsiri%20Female%20Dormitory%2F05ad624c-5d85-4a26-a9cf-0d41b5c9540c-sombut2.png?alt=media&token=3e341b21-3a73-4b26-b4ff-be3ff0a29332	2025-10-19 23:16:51.768291	f
402	203	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSombutsiri%20Female%20Dormitory%2F581375f3-6ff9-43d5-aa07-f461c21c827f-sombut3.png?alt=media&token=0b027fbf-cdc1-4f6d-a82d-7c3fdb811ce3	2025-10-19 23:16:51.768291	f
403	203	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSombutsiri%20Female%20Dormitory%2F254a4552-9091-4ea9-944a-4f9ad6b5f04d-sombut4.png?alt=media&token=dac050e2-55f2-49da-a2b0-9808f71bd6fc	2025-10-19 23:16:51.768291	f
404	203	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FSombutsiri%20Female%20Dormitory%2F272f233f-706e-4507-ab52-99590b985336-sombut5.png?alt=media&token=bd02990e-b57e-4c82-9332-60ef1f440cb5	2025-10-19 23:16:51.768291	f
420	220	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FE%26T%20Place%20Dormitory%2Fc173e7bc-59a9-4683-be53-e9089be01cf4-ET1.png?alt=media&token=3b6fbfad-c255-4c05-8e4e-676a3331adfd	2025-10-19 23:42:22.669715	t
421	220	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FE%26T%20Place%20Dormitory%2Faecec28f-be23-4c3f-829c-8f5c3bca601d-ET2.png?alt=media&token=e0b1e5fc-3530-455b-910f-7b262c2ca94f	2025-10-19 23:42:22.669715	f
422	220	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FE%26T%20Place%20Dormitory%2F13e701b5-6812-44cf-a899-e2ec8ec6ca33-ET3.png?alt=media&token=235a6f93-bda0-44ca-a76b-3cf8d52e99eb	2025-10-19 23:42:22.669715	f
423	220	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FE%26T%20Place%20Dormitory%2Fbb5b8cdc-b979-40f5-8cc9-76516fa4abe9-ET4.png?alt=media&token=51a3c6df-dff3-490f-9fc5-3d8bd5867c3d	2025-10-19 23:42:22.669715	f
424	220	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2FE%26T%20Place%20Dormitory%2F07877b12-7556-41f9-84b2-0bb166945bf0-ET5.png?alt=media&token=2f5650c6-f983-4585-9129-746ae833146f	2025-10-19 23:42:22.669715	f
425	122	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AA%E0%B8%B4%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%B1%E0%B8%9E%E0%B8%A2%E0%B9%8C%E0%B8%8B%E0%B8%B4%E0%B8%95%E0%B8%B5%E0%B9%89%E0%B9%82%E0%B8%AE%E0%B8%A1%20%E0%B8%AA%E0%B8%A3%E0%B8%B0%E0%B8%A7%E0%B9%88%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%9B%E0%B8%A5%E0%B8%B2%E0%B9%82%E0%B8%A5%E0%B8%A1%E0%B8%B2%2Faf8c73e7-d00f-4d79-8fcd-b20e07534150-DsPfrjySWEwKQJV5MvDB.webp?alt=media&token=1ebf15da-c2a4-41b7-bafe-dcd1103d82a4	2025-10-20 05:08:23.670536	t
426	122	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AA%E0%B8%B4%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%B1%E0%B8%9E%E0%B8%A2%E0%B9%8C%E0%B8%8B%E0%B8%B4%E0%B8%95%E0%B8%B5%E0%B9%89%E0%B9%82%E0%B8%AE%E0%B8%A1%20%E0%B8%AA%E0%B8%A3%E0%B8%B0%E0%B8%A7%E0%B9%88%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%9B%E0%B8%A5%E0%B8%B2%E0%B9%82%E0%B8%A5%E0%B8%A1%E0%B8%B2%2F8a5a3b68-62bb-4d5b-83bb-12d382782d7d-b5VmkqVYUuLH7hmAw4zu.webp?alt=media&token=ee911502-f80d-4b0f-ac83-5b7d42ab890f	2025-10-20 05:08:23.670536	f
427	122	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AA%E0%B8%B4%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%B1%E0%B8%9E%E0%B8%A2%E0%B9%8C%E0%B8%8B%E0%B8%B4%E0%B8%95%E0%B8%B5%E0%B9%89%E0%B9%82%E0%B8%AE%E0%B8%A1%20%E0%B8%AA%E0%B8%A3%E0%B8%B0%E0%B8%A7%E0%B9%88%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%9B%E0%B8%A5%E0%B8%B2%E0%B9%82%E0%B8%A5%E0%B8%A1%E0%B8%B2%2F576b05bc-7c8f-407e-93f9-92f84a61e6d7-b5VmkqVYUuLH7hmAw4zu.webp?alt=media&token=295aa13a-aef7-4278-aec4-93eb08d396db	2025-10-20 05:08:23.670536	f
428	122	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AA%E0%B8%B4%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%B1%E0%B8%9E%E0%B8%A2%E0%B9%8C%E0%B8%8B%E0%B8%B4%E0%B8%95%E0%B8%B5%E0%B9%89%E0%B9%82%E0%B8%AE%E0%B8%A1%20%E0%B8%AA%E0%B8%A3%E0%B8%B0%E0%B8%A7%E0%B9%88%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%9B%E0%B8%A5%E0%B8%B2%E0%B9%82%E0%B8%A5%E0%B8%A1%E0%B8%B2%2F30cdd39a-95b2-42a8-b440-e775a4053aeb-2WZJtKcQWsiTHkbaSDUS.webp?alt=media&token=0bc207dd-d36c-476c-97a0-0c193f3811ce	2025-10-20 05:08:23.670536	f
429	122	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Dorm_Gallery%2F%E0%B8%AA%E0%B8%B4%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%B1%E0%B8%9E%E0%B8%A2%E0%B9%8C%E0%B8%8B%E0%B8%B4%E0%B8%95%E0%B8%B5%E0%B9%89%E0%B9%82%E0%B8%AE%E0%B8%A1%20%E0%B8%AA%E0%B8%A3%E0%B8%B0%E0%B8%A7%E0%B9%88%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%9B%E0%B8%A5%E0%B8%B2%E0%B9%82%E0%B8%A5%E0%B8%A1%E0%B8%B2%2F454b0d93-2b6c-4007-8aab-4da7071bb464-b5VmkqVYUuLH7hmAw4zu.webp?alt=media&token=b094615c-3e8d-4da1-a8f1-516e3f519293	2025-10-20 05:08:23.670536	f
\.


--
-- TOC entry 3449 (class 0 OID 24606)
-- Dependencies: 221
-- Data for Name: member_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.member_requests (request_id, user_id, dorm_id, request_date, status, approved_date, response_note) FROM stdin;
103	143	99	2025-10-04 15:48:02.657807	ยกเลิก	2025-10-04 15:49:41.521099	\N
139	149	128	2025-10-20 04:24:40.826938	รออนุมัติ	\N	\N
140	150	201	2025-10-20 04:41:46.334994	รออนุมัติ	\N	\N
141	151	130	2025-10-20 04:42:54.81992	ยกเลิก	\N	\N
142	151	201	2025-10-20 04:44:19.546473	รออนุมัติ	\N	\N
113	137	122	2025-10-19 12:11:29.733804	ยกเลิก	\N	\N
114	137	122	2025-10-19 12:16:20.748281	ยกเลิก	2025-10-19 12:16:29.998494	\N
107	137	128	2025-10-12 05:53:57.411896	ยกเลิก	2025-10-12 08:34:41.762781	\N
109	128	122	2025-10-15 10:53:27.454627	ยกเลิก	2025-10-15 10:53:39.378556	\N
108	137	129	2025-10-15 10:42:50.564003	ยกเลิก	\N	\N
110	137	125	2025-10-15 13:20:13.08076	ยกเลิก	\N	\N
143	137	99	2025-10-20 04:56:01.493915	ปฏิเสธ	2025-10-20 04:56:12.81614	ไม่ใช่ลูกหอ
144	137	99	2025-10-20 04:58:10.560906	ปฏิเสธ	\N	ไม่ใช่ลูกหอ
145	137	122	2025-10-20 05:12:06.974684	อนุมัติ	2025-10-20 05:12:18.376325	\N
111	137	125	2025-10-15 13:20:57.363516	ยกเลิก	2025-10-19 11:55:17.842742	\N
147	153	220	2025-10-21 10:56:56.142909	รออนุมัติ	\N	\N
146	128	122	2025-10-20 05:13:02.338759	ยกเลิก	2025-10-20 05:13:09.40123	ไม่ให้อยู่
117	145	128	2025-10-19 12:33:24.686869	ยกเลิก	2025-10-19 12:34:47.655986	\N
91	143	99	2025-10-04 10:52:14.58962	ยกเลิก	\N	\N
95	143	99	2025-10-04 14:57:07.196095	ยกเลิก	\N	\N
96	143	99	2025-10-04 14:57:41.908044	ยกเลิก	2025-10-04 14:57:52.70529	\N
100	143	99	2025-10-04 15:39:04.984227	ยกเลิก	2025-10-04 15:39:16.986964	\N
106	143	122	2025-10-10 16:56:34.166692	ยกเลิก	\N	ไม่ใช่คนของหอค่ะ
115	143	122	2025-10-19 12:20:27.489368	ยกเลิก	2025-10-19 12:20:42.539188	\N
120	143	122	2025-10-19 13:02:08.991655	ยกเลิก	2025-10-19 13:02:26.001739	\N
112	128	122	2025-10-17 00:19:04.715071	ยกเลิก	2025-10-17 00:19:14.768462	\N
116	145	122	2025-10-19 12:21:49.189268	ปฏิเสธ	2025-10-19 12:22:32.762184	ปฏิเสธ
122	145	122	2025-10-19 16:40:16.405686	ปฏิเสธ	\N	ปฏิเสธ
121	147	132	2025-10-19 13:32:04.014209	ปฏิเสธ	\N	das
118	146	124	2025-10-19 12:54:31.609958	ยกเลิก	2025-10-19 12:56:01.598021	\N
123	147	128	2025-10-19 20:58:11.598945	ยกเลิก	2025-10-19 20:59:12.806249	\N
124	147	128	2025-10-19 21:01:45.140879	ยกเลิก	2025-10-19 21:02:19.357478	\N
126	145	129	2025-10-19 21:52:15.443285	ยกเลิก	2025-10-19 21:52:44.873964	\N
125	147	128	2025-10-19 21:02:55.767625	อนุมัติ	\N	\N
127	145	130	2025-10-19 21:53:41.47436	ยกเลิก	2025-10-19 21:54:23.118707	\N
129	145	125	2025-10-19 21:59:22.240946	อนุมัติ	\N	\N
132	148	132	2025-10-19 22:22:46.548905	ยกเลิก	2025-10-19 22:25:05.54348	\N
133	148	99	2025-10-19 22:25:32.716145	อนุมัติ	2025-10-19 22:25:46.219819	\N
131	145	123	2025-10-19 22:00:57.321571	ยกเลิก	2025-10-19 22:01:34.853334	\N
128	145	124	2025-10-19 21:58:16.071346	ยกเลิก	\N	\N
\.


--
-- TOC entry 3451 (class 0 OID 24614)
-- Dependencies: 223
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (review_id, user_id, dorm_id, rating, comment, review_date, is_resident) FROM stdin;
6	143	122	4	หอดีนะโอเครมากๆ ดีมากกกกกก	2025-10-19 12:31:26.790407	f
7	145	128	5	หอพักสะอาดน่าอยู่มาก	2025-10-19 12:40:20.620892	f
8	148	132	2	หอพักดีมากกกกก	2025-10-19 22:28:47.716561	f
9	148	99	2	หอพักดีมากกก	2025-10-19 23:03:31.829267	f
5	128	122	4	หอแย่มาก	2025-10-17 00:22:44.653716	t
\.


--
-- TOC entry 3453 (class 0 OID 24623)
-- Dependencies: 225
-- Data for Name: room_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.room_types (room_type_id, dorm_id, room_name, bed_type, monthly_price, daily_price, summer_price, term_price) FROM stdin;
138	129	ห้องพัดลม + แอร์	เตียงเดี่ยว	4000	\N	\N	\N
139	130	ห้องแอร์	เตียงเดี่ยว	3500	\N	\N	\N
140	131	ห้องแอร์	เตียงเดี่ยว	2500	\N	\N	\N
141	132	ห้องพัดลม + แอร์	เตียงเดี่ยว	2200	\N	\N	\N
123	99	ห้องแอร์ชั้น 1 ชั้น 2	เตียงเดี่ยว	5000	\N	\N	\N
143	99	ห้องแอร์	เตียงเดี่ยว	3800	\N	\N	\N
144	99	ห้องแอร์	เตียงเดี่ยว	\N	500	\N	\N
155	190	ห้องพัดลม + แอร์	เตียงเดี่ยว	4200	\N	\N	\N
156	191	ห้องแอร์	เตียงเดี่ยว	4500	\N	\N	24000
142	133	ห้องแอร์	เตียงเดี่ยว	3600	\N	\N	\N
145	133	ห้องพัดลม + แอร์	เตียงเดี่ยว	3800	350	7500	15000
157	192	ห้องแอร์	เตียงเดี่ยว	4300	\N	\N	\N
158	201	ห้องแอร์	เตียงเดี่ยว	3800	\N	\N	\N
159	200	ห้องพัดลม + แอร์	เตียงเดี่ยว	3700	\N	\N	\N
160	199	ห้องแอร์	เตียงเดี่ยว	3300	480	\N	\N
161	198	ห้องแอร์	เตียงเดี่ยว	4600	\N	\N	\N
162	196	ห้องพัดลม	เตียงเดี่ยว	2800	\N	\N	\N
132	123	ห้องพัดลม	เตียงเดี่ยว	3700	\N	\N	\N
133	124	ห้องพัดลม + แอร์	เตียงเดี่ยว	2800	\N	\N	\N
134	125	ห้องแอร์	เตียงเดี่ยว	3700	\N	\N	\N
135	126	ห้องพัดลม + แอร์	เตียงเดี่ยว	3000	\N	\N	\N
136	127	ห้องพัดลม + แอร์	เตียงคู่	3500	\N	\N	\N
137	128	ห้องพัดลม + แอร์	เตียงเดี่ยว	3800	\N	\N	\N
163	194	ห้องแอร์	เตียงเดี่ยว	3300	\N	\N	\N
164	193	ห้องพัดลม + แอร์	เตียงเดี่ยว	3100	\N	\N	\N
165	205	ห้องแอร์	เตียงเดี่ยว	3800	\N	\N	\N
166	204	ห้องแอร์	เตียงเดี่ยว	3200	\N	\N	\N
167	203	ห้องแอร์	เตียงเดี่ยว	3900	\N	\N	\N
171	220	ห้องพัดลม + แอร์	เตียงเดี่ยว	2400	\N	\N	\N
130	122	ห้องพัดลม + แอร์	เตียงเดี่ยว	3500	\N	\N	\N
131	122	ห้องพัดลม + แอร์	เตียงคู่	3500	\N	\N	\N
172	122	ห้องแอร์ ชั้น 4	เตียงเดี่ยว	3000	\N	\N	\N
152	186	ห้องพัดลม + แอร์	เตียงเดี่ยว	3500	\N	\N	\N
153	187	ห้องแอร์	เตียงเดี่ยว	3000	350	\N	\N
154	189	ห้องพัดลม + แอร์	เตียงเดี่ยว	3800	\N	\N	\N
\.


--
-- TOC entry 3462 (class 0 OID 65537)
-- Dependencies: 234
-- Data for Name: stay_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stay_history (stay_id, user_id, dorm_id, start_date, end_date, is_current, status) FROM stdin;
53	137	125	2025-10-15 13:20:16.868136	2025-10-19 11:55:17.842742	f	ย้ายออก
54	137	125	2025-10-15 13:21:01.520948	2025-10-19 11:55:17.842742	f	ย้ายออก
89	137	99	2025-10-20 04:56:12.81614	2025-10-20 04:57:34.089908	f	ยกเลิก
56	128	122	2025-10-17 00:19:14.768462	2025-10-19 16:39:12.300561	f	ยกเลิก
3	128	99	2025-09-29 14:49:46.543019	2025-09-29 14:56:16.796835	f	กำลังอยู่
10	129	99	2025-09-29 15:17:05.049082	\N	t	กำลังอยู่
18	128	99	2025-09-29 16:00:23.348224	2025-10-03 16:38:12.523166	f	กำลังอยู่
23	143	99	2025-10-04 09:26:47.363095	2025-10-04 09:29:43.881338	f	กำลังอยู่
36	143	99	2025-10-04 14:57:52.70529	2025-10-04 14:58:30.636871	f	กำลังอยู่
41	143	99	2025-10-04 15:39:16.986964	2025-10-04 15:40:45.161699	f	กำลังอยู่
2	128	99	2025-09-29 14:46:52.384426	2025-09-29 14:49:46.543019	f	ย้ายออก
9	129	99	2025-09-29 15:15:59.745428	2025-09-29 15:17:05.049082	f	ย้ายออก
13	128	99	2025-09-29 15:22:56.775705	2025-09-29 15:35:23.42193	f	ย้ายออก
14	128	99	2025-09-29 15:34:25.485684	2025-09-29 15:35:23.42193	f	ย้ายออก
15	128	99	2025-09-29 15:35:23.42193	2025-09-29 16:00:23.348224	f	ย้ายออก
17	128	99	2025-09-29 16:00:14.544331	2025-09-29 16:00:23.348224	f	ย้ายออก
20	143	99	2025-10-03 10:36:00.922001	2025-10-04 09:26:47.363095	f	ย้ายออก
29	143	99	2025-10-04 10:10:15.075024	2025-10-04 11:15:16.281315	f	ย้ายออก
30	143	99	2025-10-04 10:52:18.009334	2025-10-04 11:15:16.281315	f	ย้ายออก
34	143	99	2025-10-04 14:57:11.095557	2025-10-04 14:57:52.70529	f	ย้ายออก
35	143	99	2025-10-04 14:57:43.394852	2025-10-04 14:57:52.70529	f	ย้ายออก
40	143	99	2025-10-04 15:39:06.441385	2025-10-04 15:39:16.986964	f	ย้ายออก
45	143	99	2025-10-04 15:48:04.726497	2025-10-04 15:49:41.521099	f	ย้ายออก
59	137	122	2025-10-19 12:16:29.998494	2025-10-20 04:56:12.81614	f	ย้ายออก
90	137	122	2025-10-20 05:12:18.376325	\N	t	กำลังอยู่
51	128	122	2025-10-15 10:53:32.417438	2025-10-15 10:53:39.378556	f	ย้ายออก
55	128	122	2025-10-17 00:19:08.416556	2025-10-17 00:19:14.768462	f	ย้ายออก
46	143	99	2025-10-04 15:49:41.521099	2025-10-04 15:50:06.228318	f	ยกเลิก
49	143	122	2025-10-10 16:56:38.075481	2025-10-10 19:22:05.229525	f	ยกเลิก
50	137	128	2025-10-12 08:34:41.762781	2025-10-15 10:40:12.500359	f	ยกเลิก
52	128	122	2025-10-15 10:53:39.378556	2025-10-15 10:56:16.664035	f	ยกเลิก
57	137	125	2025-10-19 11:55:17.842742	2025-10-19 12:10:30.021327	f	ยกเลิก
58	137	122	2025-10-19 12:16:25.007926	2025-10-19 12:16:29.998494	f	ย้ายออก
60	143	122	2025-10-19 12:20:31.631556	2025-10-19 12:20:42.539188	f	ย้ายออก
62	145	122	2025-10-19 12:22:32.762184	2025-10-19 12:33:29.283982	f	กำลังอยู่
63	145	128	2025-10-19 12:33:29.283982	2025-10-19 12:34:47.655986	f	ย้ายออก
64	145	128	2025-10-19 12:34:47.655986	2025-10-19 12:48:02.586149	f	ยกเลิก
61	143	122	2025-10-19 12:20:42.539188	2025-10-19 13:01:21.481047	f	กำลังอยู่
91	128	122	2025-10-20 05:13:09.40123	2025-10-21 13:04:49.434368	f	ยกเลิก
68	143	122	2025-10-19 13:02:13.533869	2025-10-19 13:02:26.001739	f	ย้ายออก
69	143	122	2025-10-19 13:02:26.001739	2025-10-19 13:04:08.591093	f	ยกเลิก
65	146	124	2025-10-19 12:56:01.598021	2025-10-19 20:53:59.196432	f	ยกเลิก
71	147	128	2025-10-19 20:58:15.203096	2025-10-19 20:59:12.806249	f	ย้ายออก
72	147	128	2025-10-19 20:59:12.806249	2025-10-19 21:00:50.315584	f	ยกเลิก
73	147	128	2025-10-19 21:01:48.705538	2025-10-19 21:02:19.357478	f	ย้ายออก
74	147	128	2025-10-19 21:02:19.357478	2025-10-19 21:02:27.579737	f	ยกเลิก
75	147	128	2025-10-19 21:02:58.751318	\N	t	เข้าพัก
70	145	122	2025-10-19 16:40:20.084225	2025-10-19 21:52:44.873964	f	ย้ายออก
76	145	129	2025-10-19 21:52:18.972985	2025-10-19 21:52:44.873964	f	ย้ายออก
77	145	129	2025-10-19 21:52:44.873964	2025-10-19 21:52:52.978179	f	ยกเลิก
78	145	130	2025-10-19 21:53:44.973357	2025-10-19 21:54:23.118707	f	ย้ายออก
79	145	130	2025-10-19 21:54:23.118707	2025-10-19 21:58:20.02745	f	กำลังอยู่
80	145	124	2025-10-19 21:58:20.02745	2025-10-19 22:01:34.853334	f	ย้ายออก
81	145	125	2025-10-19 21:59:25.848861	2025-10-19 22:01:34.853334	f	ย้ายออก
82	145	123	2025-10-19 22:01:00.970836	2025-10-19 22:01:34.853334	f	ย้ายออก
84	148	132	2025-10-19 22:25:05.54348	2025-10-19 22:25:36.962716	f	กำลังอยู่
85	148	99	2025-10-19 22:25:36.962716	2025-10-19 22:25:46.219819	f	ย้ายออก
86	148	99	2025-10-19 22:25:46.219819	\N	t	กำลังอยู่
83	145	123	2025-10-19 22:01:34.853334	2025-10-19 22:26:54.263176	f	ยกเลิก
\.


--
-- TOC entry 3455 (class 0 OID 24630)
-- Dependencies: 227
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, firebase_uid, email, username, display_name, photo_url, phone_number, member_type, residence_dorm_id, created_at, updated_at, secondary_phone, line_id, manager_name) FROM stdin;
132	qbzxXXEgQNgMWkzw6mmzduroAlx2	hermione@hogwarts.com	Leviosa	วิงการ์เดี้ยม เลวีโอซา~	https://s.t13.cl/sites/default/files/styles/manualcrop_1600x800/public/t13/field-imagen/2018-01/1516358263-hermione-leviosa.jpg.jpeg	089-919-1979	admin	\N	2025-09-27 09:40:44.55308	2025-09-27 09:40:44.55308	089-197-9400	its_leviooosa	Professor Minerva McGonagall
130	bmszl7EZIOeCL05KrdfSWIzMTft2	somchai@moderndorm.com	somchai174	สมชาย ดราก้อน	\N	0812345678	owner	\N	2025-09-24 05:56:33.20247	2025-09-24 05:56:33.20247	0891112222	dragonline	สมชาย ดราก้อน
131	kO9y3iDCDHUvUaYQoUGNQItdoJT2	leejainmate@gmail.com	leejainmate126	InVisiBle CH	https://lh3.googleusercontent.com/a/ACg8ocLfUEQMDtAunhumoh-gwucXv4ObyvUv-3_VQFJYxNrrmgsaSBsq=s96-c	0990990987	owner	\N	2025-09-24 08:27:02.767765	2025-09-24 08:27:02.767765	\N	\N	adsad
133	VXT9RIFWJpO4fOq3ZPyMaRG2dO73	malfoy@hogwarts.com	Malfoy	พ่อฉันต้องรู้เรื่องนี้แน่!	https://i.imgflip.com/5366gq.jpg	089-060-1980	admin	\N	2025-09-27 09:40:44.55308	2025-09-27 09:40:44.55308	089-506-1980	malfoy_ferret	Professor Severus Snape
144	SjRYXcvjgGWIZL6x3MR7GcKuY8D2	figooleo000@gmail.com	figooleo000463	คุณนายสมศรี มีรวย	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Profile_Roomaroo%2Fd402e374-f0ee-4563-85f1-4ae46f970881-wallpaperflare.com_w.jpg?alt=media&token=b2b7f9c4-13c2-4d13-8aef-cdd705ffa9ea	0852085202	owner	\N	2025-10-03 11:45:18.911579	2025-10-03 11:53:36.988407	1911911919	Somsri_Dorm	คุณนายสมศรี
149	9LLc7V8ROWafAP8BDQ8gdaOm9ik1	figooleo1@gmail.com	figooleo1728	Muklai Studio	https://lh3.googleusercontent.com/a/ACg8ocKohQ3vu--4v01RW2glFewUvEP0W4e_1gfzW5CcYRpr6YAIfw=s96-c	0930300726	member	\N	2025-10-20 04:24:41.434126	2025-10-20 04:24:41.434126	\N	\N	\N
137	BdlCCu9U0Vaw0KB4U8a1vCahuu13	65011212132@msu.ac.th	65011212132220	วิริทธิ์พล ดวงดูสัน	https://lh3.googleusercontent.com/a/ACg8ocKMLoPkfLP9K90AR1x_yGVkBeE1bjrKENBnchTn4UoSSbosNQ=s96-c	1231232134	member	122	2025-10-02 11:16:42.756024	2025-10-20 05:12:18.376325	\N	\N	\N
129	wBWxKBPJ3FTVTfuL0m1kAELswlt1	goku.dragonball@modern-dorm.com	gokudragonball287	โกคู แห่งดราก้อนบอล	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Profile_Roomaroo%2F7aaa368d-4f2d-4a7e-8094-14444a0dd7bb-King_Piccolo_Episode.webp?alt=media&token=7d27dae9-a073-498e-a0b4-16b8611da674	0812345678	member	\N	2025-09-24 05:47:27.915629	2025-09-29 15:17:05.049082	\N	\N	\N
150	h5sSVNArP3VAE3CMgHVjxo4m4b12	figooleo8@gmail.com	figooleo8576	PhutawanChog	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Profile_Roomaroo%2Fadb9a841-b919-4845-9ab1-5668bbe54376-%C3%A0%C2%B8%C2%AA%C3%A0%C2%B8%C2%81%C3%A0%C2%B8%C2%A3%C3%A0%C2%B8%C2%B5%C3%A0%C2%B8%C2%99%C3%A0%C2%B8%C2%8A%C3%A0%C2%B9.png?alt=media&token=fbb77019-fa23-4bf9-bb5d-ba39ebc71b47	1234562584	member	\N	2025-10-20 04:41:46.995756	2025-10-20 04:41:46.995756	\N	\N	\N
68	0EZ0sI1flAVobykTbRM9FBkW0d22	jiw0863906315@gmail.com	SomchaiSrisuk025	สมชาย ศรีสุข	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Profile_Roomaroo%2Fca933227-09d4-451d-a29d-41e24b23ca1c-ofww0h2a0pxOJdsXyAu-.jpg?alt=media&token=4e2e4419-6042-4827-a975-085e79339c52	0258745698	owner	\N	2025-07-22 20:32:26.898867	2025-10-10 17:04:56.574447	0258741236	somchai_srisuk025	Somchai Srisuk
146	2m6WL06i7kQNJEqair6d5xdbU792	aaa@gmail.com	aaaaaa	aaa	\N	1231231233	member	\N	2025-10-19 12:54:32.830934	2025-10-19 20:53:59.196432	\N	\N	\N
134	UJ8lAOl5LZRnhhnlvh8reU3wEes2	kittipong@gmail.com	kittipong196	กิตติพงศ์ สุวรรณรักษ์	\N	0912345678	member	\N	2025-10-02 10:09:23.002676	2025-10-02 10:09:23.002676	\N	\N	\N
135	BmQv8ZBeHhdaguwt7DUwV9CFQbL2	ricax68432@hiepth.com	ricax68432398	shsh	\N	1234567895	member	\N	2025-10-02 10:38:47.365982	2025-10-02 10:38:47.365982	\N	\N	\N
136	OdxuXdKhlSYtVn3kv1EPJ5YsS4C3	narumon@gmail.com	narumon773	นฤมล เพ็ญศรี	\N	0912345678	owner	\N	2025-10-02 10:47:10.664012	2025-10-02 10:47:10.664012	0911111111	narumon	นฤมล เพ็ญศรี
152	BOofIlxB44dVroyfHKvwY8H9Xjb2	figooleo9795@gmail.com	figooleo9795182	Phutawan Chonsakorn	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Profile_Roomaroo%2Fc2549c47-213d-41a9-a0b6-6b8d5983a79a-Screenshot%20(599).png?alt=media&token=1672e913-054a-4faa-905b-40875667e109	0843973976	owner	\N	2025-10-20 04:51:10.573511	2025-10-20 04:51:10.573511	1234567895	PTW_0258	PtjPTW
148	0rHcmX9rX6UEtGlPTyO5oYa3JoN2	g2@gmail.com	g2127	ดีเจ G2	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Profile_Roomaroo%2F3924d3c1-2a0e-4bde-a5af-47fa8249689f-Screenshot%20(575).png?alt=media&token=65e6e841-3832-4e8c-9029-1aa2664253c5	1234567895	member	99	2025-10-19 22:22:49.899414	2025-10-19 22:25:46.219819	\N	\N	\N
145	32AIMp2dVZaDxGPwVRvzrnDP7Br2	kiwwiritphon48190@gmail.com	kiwwiritphon481675	Wiritphon Duangdusan	https://lh3.googleusercontent.com/a/ACg8ocLO6pephlqoYG0lgtJlaRzgwP8UOFYo4IKXbRGROP7A_9jwiR4=s96-c	1212331234	member	\N	2025-10-03 18:55:28.609727	2025-10-19 22:26:54.263176	\N	\N	\N
143	tLNc819H6cdOJnSuwJHfEN9aSDT2	figooleo01@gmail.com	figooleo01422	ภูตะเว็น สุดสาคร	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Profile_Roomaroo%2F24366d59-5133-469e-9311-100c6128a0d7-%C3%A0%C2%B8%C2%AA%C3%A0%C2%B8%C2%81%C3%A0%C2%B8%C2%A3%C3%A0%C2%B8%C2%B5%C3%A0%C2%B8%C2%99%C3%A0%C2%B8%C2%8A%C3%A0%C2%B9.png?alt=media&token=e3212cff-4202-4278-8d62-038a9c7cf3b0	000000000000	member	\N	2025-10-02 16:23:32.040388	2025-10-20 02:27:39.992429	\N	\N	\N
151	CY4zaSyqUFMy3XQXSCNnmL6XU4m2	figooleo788@gmail.com	PtjPTW	Phutawan Chonsakorn22	https://firebasestorage.googleapis.com/v0/b/projectviewmash-bac0a.appspot.com/o/Profile_Roomaroo%2F62b9a63c-a0cb-4984-9754-0dc3970f29fb-Screenshot%20(599).png?alt=media&token=68eb2e5d-c871-4d74-8fc7-4ac32544c389	0930300726	member	\N	2025-10-20 04:42:55.088663	2025-10-20 04:44:18.62379	\N	\N	\N
147	r86DodxrO4g1VYyaB4ur1QbvceB2	bbb@gmail.com	bbb801	bbbbbb	\N	1231231232	member	\N	2025-10-19 13:32:05.872843	2025-10-19 21:02:54.040798	\N	\N	\N
153	yVV7317R6mfUe9sla028XQdsYcv2	figooleo00@gmail.com	figooleo00774	eydhdtik futiyfgk	https://lh3.googleusercontent.com/a/ACg8ocLSiKqzsrojT0KDsl0XD7-2O6xK4FkJ-8oHwB6dWmZiNm8l4A=s96-c	0930300158	member	\N	2025-10-21 10:56:57.084123	2025-10-21 10:56:57.084123	\N	\N	\N
128	ZKcXG9V6xgUJeVyDyiNu6rd3B6T2	65011212025@msu.ac.th	Phutawan_Ptw	ภูตะวัน ชลสาคร	https://lh3.googleusercontent.com/a/ACg8ocLSeVKTTKINTFbuTDTOgbmK5AmwzVWxeMH9WYlCx4qwNjXnQXuW=s96-c	0258844788	member	\N	2025-09-24 02:25:12.279849	2025-10-21 13:04:49.434368	\N	\N	\N
\.


--
-- TOC entry 3457 (class 0 OID 24638)
-- Dependencies: 229
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zones (zone_id, zone_name) FROM stdin;
5	ดอนนา
1	หน้ามอ
2	ท่าขอนยาง
3	ขามเรียง
4	กู่แก้ว
\.


--
-- TOC entry 3477 (class 0 OID 0)
-- Dependencies: 218
-- Name: dormitories_dorm_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dormitories_dorm_id_seq', 223, true);


--
-- TOC entry 3478 (class 0 OID 0)
-- Dependencies: 231
-- Name: dormitory_amenities_dorm_amenity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dormitory_amenities_dorm_amenity_id_seq', 1058, true);


--
-- TOC entry 3479 (class 0 OID 0)
-- Dependencies: 220
-- Name: dormitory_images_image_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dormitory_images_image_id_seq', 429, true);


--
-- TOC entry 3480 (class 0 OID 0)
-- Dependencies: 222
-- Name: member_requests_request_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.member_requests_request_id_seq', 147, true);


--
-- TOC entry 3481 (class 0 OID 0)
-- Dependencies: 224
-- Name: reviews_review_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reviews_review_id_seq', 9, true);


--
-- TOC entry 3482 (class 0 OID 0)
-- Dependencies: 226
-- Name: room_types_room_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.room_types_room_type_id_seq', 172, true);


--
-- TOC entry 3483 (class 0 OID 0)
-- Dependencies: 233
-- Name: stay_history_stay_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stay_history_stay_id_seq', 91, true);


--
-- TOC entry 3484 (class 0 OID 0)
-- Dependencies: 228
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 153, true);


--
-- TOC entry 3485 (class 0 OID 0)
-- Dependencies: 230
-- Name: zones_zone_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zones_zone_id_seq', 5, true);


--
-- TOC entry 3256 (class 2606 OID 24657)
-- Name: dormitories dormitories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT dormitories_pkey PRIMARY KEY (dorm_id);


--
-- TOC entry 3279 (class 2606 OID 57368)
-- Name: dormitory_amenities dormitory_amenities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitory_amenities
    ADD CONSTRAINT dormitory_amenities_pkey PRIMARY KEY (dorm_amenity_id);


--
-- TOC entry 3259 (class 2606 OID 24661)
-- Name: dormitory_images dormitory_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitory_images
    ADD CONSTRAINT dormitory_images_pkey PRIMARY KEY (image_id);


--
-- TOC entry 3261 (class 2606 OID 24663)
-- Name: member_requests member_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_requests
    ADD CONSTRAINT member_requests_pkey PRIMARY KEY (request_id);


--
-- TOC entry 3264 (class 2606 OID 24665)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (review_id);


--
-- TOC entry 3267 (class 2606 OID 24667)
-- Name: room_types room_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_pkey PRIMARY KEY (room_type_id);


--
-- TOC entry 3281 (class 2606 OID 65544)
-- Name: stay_history stay_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stay_history
    ADD CONSTRAINT stay_history_pkey PRIMARY KEY (stay_id);


--
-- TOC entry 3269 (class 2606 OID 131073)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3271 (class 2606 OID 131075)
-- Name: users users_firebase_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);


--
-- TOC entry 3273 (class 2606 OID 24673)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3275 (class 2606 OID 24675)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 3277 (class 2606 OID 24677)
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (zone_id);


--
-- TOC entry 3257 (class 1259 OID 24678)
-- Name: idx_dorm_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dorm_zone ON public.dormitories USING btree (zone_id);


--
-- TOC entry 3265 (class 1259 OID 24679)
-- Name: idx_room_types_dorm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_types_dorm_id ON public.room_types USING btree (dorm_id);


--
-- TOC entry 3262 (class 1259 OID 139264)
-- Name: unique_active_request_per_dorm; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_active_request_per_dorm ON public.member_requests USING btree (user_id, dorm_id) WHERE ((status)::text = ANY ((ARRAY['รออนุมัติ'::character varying, 'อนุมัติ'::character varying])::text[]));


--
-- TOC entry 3282 (class 2606 OID 24685)
-- Name: dormitories dormitories_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT dormitories_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- TOC entry 3283 (class 2606 OID 24690)
-- Name: dormitories dormitories_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT dormitories_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(zone_id);


--
-- TOC entry 3296 (class 2606 OID 57369)
-- Name: dormitory_amenities dormitory_amenities_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitory_amenities
    ADD CONSTRAINT dormitory_amenities_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id);


--
-- TOC entry 3286 (class 2606 OID 24705)
-- Name: dormitory_images dormitory_images_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitory_images
    ADD CONSTRAINT dormitory_images_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id) ON DELETE CASCADE;


--
-- TOC entry 3292 (class 2606 OID 49196)
-- Name: room_types fk_dorm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT fk_dorm FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id);


--
-- TOC entry 3297 (class 2606 OID 57377)
-- Name: dormitory_amenities fk_dorm_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitory_amenities
    ADD CONSTRAINT fk_dorm_id FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id);


--
-- TOC entry 3287 (class 2606 OID 24710)
-- Name: dormitory_images fk_images_dorm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitory_images
    ADD CONSTRAINT fk_images_dorm FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id) ON DELETE CASCADE;


--
-- TOC entry 3284 (class 2606 OID 49191)
-- Name: dormitories fk_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- TOC entry 3294 (class 2606 OID 49176)
-- Name: users fk_residence_dorm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_residence_dorm FOREIGN KEY (residence_dorm_id) REFERENCES public.dormitories(dorm_id);


--
-- TOC entry 3295 (class 2606 OID 49169)
-- Name: users fk_users_residence_dorm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_residence_dorm FOREIGN KEY (residence_dorm_id) REFERENCES public.dormitories(dorm_id);


--
-- TOC entry 3285 (class 2606 OID 49186)
-- Name: dormitories fk_zone; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT fk_zone FOREIGN KEY (zone_id) REFERENCES public.zones(zone_id);


--
-- TOC entry 3288 (class 2606 OID 24715)
-- Name: member_requests member_requests_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_requests
    ADD CONSTRAINT member_requests_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id);


--
-- TOC entry 3289 (class 2606 OID 24720)
-- Name: member_requests member_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_requests
    ADD CONSTRAINT member_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3290 (class 2606 OID 24725)
-- Name: reviews reviews_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id);


--
-- TOC entry 3291 (class 2606 OID 24730)
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3293 (class 2606 OID 24735)
-- Name: room_types room_types_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id) ON DELETE CASCADE;


--
-- TOC entry 3298 (class 2606 OID 65550)
-- Name: stay_history stay_history_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stay_history
    ADD CONSTRAINT stay_history_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id) ON DELETE CASCADE;


--
-- TOC entry 3299 (class 2606 OID 65545)
-- Name: stay_history stay_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stay_history
    ADD CONSTRAINT stay_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2025-10-23 04:05:46

--
-- PostgreSQL database dump complete
--

