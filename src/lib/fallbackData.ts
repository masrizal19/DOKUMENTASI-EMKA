// Fallback data structure for GALERI EMKA to replace db.json completely.
// This prevents compile-time file-system import failures.

export const fallbackData = {
  "activities": [],
  "photos": [],
  "settings": {
    "site_name": "GALERI EMKA",
    "logo": "",
    "whatsapp": "628123456789",
    "accent_color": "#f6c374",
    "updated_at": "2026-08-27T06:17:10.069Z",
    "school_name": "SMK Multi Karya",
    "address": "Jl. SMK Multi Karya No. 45",
    "city": "Medan",
    "province": "Sumatera Utara",
    "country": "Indonesia",
    "email": "info@multikarya.sch.id",
    "phone": "(061) 1234567",
    "tata_usaha": "Senin - Sabtu",
    "whatsapp_title": "Narahubung Cepat",
    "whatsapp_description": "Hubungi admin secara langsung melalui WhatsApp untuk permintaan arsip beresolusi penuh.",
    "about_title": "Mengabadikan Jejak, Mengukir Kenangan Sinematik",
    "about_desc1": "Galeri EMKA adalah wadah dokumentasi visual yang berfokus pada keanggunan, estetika, dan cerita di balik setiap kegiatan sekolah. Kami percaya bahwa setiap kenangan layak disimpan dengan penghormatan tertinggi.",
    "about_desc2": "Kami tidak hanya mengambil foto; kami mendokumentasikan emosi, antusiasme, dan khidmatnya setiap upacara, tawa ceria pada masa orientasi, karsa pada sabtu kreatif, dan harunya momen kelulusan.",
    "about_photo": "https://lh3.googleusercontent.com/aida-public/AB6AXuDUIWUTpU9L6rWIPSvj7HHxKYp5MyIlSXwvEsqL-tW6v6GfCLvaaEffEXHfQ77mBbEYaZw1BF3EcDHw0lOCi5vW8MPkBpT22H3x8wdiXxzETSwxlrZB068547LOB_u9sqAfel2p41Lf2y-thR-6B9PHMWL6KgNu3a67v3J4MedZhF3Z_AbGLjnFAL4hHkRJf073lHOcFkWpyu4J-Tiw3LXR5B4Q-bVLUczAQy718Z_UqhyfJvg9M2AT",
    "vision_title": "Visi & Seni Visual",
    "vision_content": "Menjadi pusat dokumentasi visual sekolah yang informatif, modern, estetis, dan mudah diakses untuk seluruh civitas akademika dan masyarakat luas.",
    "missions": [
      "Mendokumentasikan seluruh kegiatan sekolah secara profesional.",
      "Menyediakan arsip visual yang terstruktur and mudah diakses.",
      "Memudahkan siswa dan alumni mengakses dokumentasi kenangan mereka.",
      "Menampilkan karya, kreativitas, dan aktivitas berharga civitas akademika."
    ],
    "hero_label": "DOKUMENTASI SINEMATIK",
    "hero_title": "GALERI EMKA",
    "hero_description": "Elevating School Memories into Fine-Art Archives.",
    "hero_image": "https://lh3.googleusercontent.com/aida-public/AB6AXuDiwkKynY0e3IvvUAxEmtVZ2u6YZsowG5mH3l-zc6gcn5mgrMmkyLvOFh0ly7EMHYxMeLM6YbZfoIuD28BSAt6kQSyyS2xerZiM8e8Y2nBQ3wHh4h1KsBlXB1CgSdokMiaOQqGjzCv-N5FBMdWyescacStvofAlUq4Ssr_mwwCviBoNGNiEucMbgxtUSUcrOPn-gYMIpk7adM_Sr0Nzag2CcpWUo29jNQLnQAOhKxFYIJ1QHdbMV74X",
    "hero_video": "https://assets.mixkit.co/videos/preview/mixkit-national-flag-of-indonesia-waving-in-the-wind-41620-large.mp4",
    "hero_source": "auto",
    "hero_activity_id": "",
    "sections": [
      {
        "id": "hero",
        "section_name": "Hero Homepage",
        "enabled": true,
        "layout": "cinematic",
        "sort_order": 1,
        "item_limit": "all",
        "custom_label": "Hero"
      },
      {
        "id": "galeri",
        "section_name": "Arsip Galeri",
        "enabled": true,
        "layout": "cinematic",
        "sort_order": 2,
        "item_limit": 9,
        "custom_label": "Galeri Foto"
      },
      {
        "id": "kegiatan",
        "section_name": "Arsip Kegiatan",
        "enabled": true,
        "layout": "grid",
        "sort_order": 3,
        "item_limit": 3,
        "custom_label": "Arsip Kegiatan Pilihan",
        "sorting": "latest"
      },
      {
        "id": "foto-terbaru",
        "section_name": "Foto Terbaru",
        "enabled": true,
        "layout": "grid",
        "sort_order": 4,
        "item_limit": 6,
        "custom_label": "Momen Terkini",
        "sorting": "latest",
        "source": "all"
      },
      {
        "id": "tentang",
        "section_name": "Tentang Kami",
        "enabled": true,
        "layout": "editorial",
        "sort_order": 5,
        "item_limit": "all",
        "custom_label": "Tentang Kami"
      },
      {
        "id": "visi-misi",
        "section_name": "Visi & Misi",
        "enabled": true,
        "layout": "grid",
        "sort_order": 6,
        "item_limit": "all",
        "custom_label": "Visi & Misi"
      },
      {
        "id": "kontak",
        "section_name": "Informasi Kontak",
        "enabled": true,
        "layout": "grid",
        "sort_order": 7,
        "item_limit": "all",
        "custom_label": "Hubungi Kami"
      },
      {
        "id": "kegiatan_page",
        "section_name": "Status Halaman Kegiatan",
        "enabled": true,
        "layout": "page",
        "sort_order": 8,
        "item_limit": "all",
        "custom_label": "Halaman Kegiatan"
      },
      {
        "id": "foto_terbaru_page",
        "section_name": "Status Halaman Foto Terbaru",
        "enabled": true,
        "layout": "page",
        "sort_order": 9,
        "item_limit": "all",
        "custom_label": "Halaman Foto Terbaru"
      }
    ],
    "enable_kegiatan_page": true,
    "enable_foto_terbaru_page": true,
    "copyright_year": "2026",
    "copyright_author": ""
  }
};
