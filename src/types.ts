export interface Activity {
  id: string;
  title: string;
  slug: string;
  category: string;
  date: string;
  description: string;
  cover_image: string;
  background_video?: string;
  background_video_start?: number;
  background_video_end?: number | null;
  background_video_loop?: boolean;
  google_drive_url?: string | null;
  status: 'published' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  activity_id: string;
  title: string;
  image_url: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SectionSetting {
  id: string;
  section_name: string;
  enabled: boolean;
  layout: string;
  sort_order: number;
  item_limit: number | 'all';
  custom_label: string;
  sorting?: 'latest' | 'oldest' | 'manual';
  source?: 'all' | 'specific';
  activity_id?: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  url: string;
  type: 'image' | 'video';
  created_at: string;
}

export interface Settings {
  site_name: string;
  logo: string;
  whatsapp: string;
  accent_color?: string;
  updated_at: string;
  
  // School Info
  school_name: string;
  address: string;
  city: string;
  province: string;
  country: string;
  
  // Contact
  email: string;
  phone: string;
  tata_usaha: string;
  
  // WhatsApp Quick Contact
  whatsapp_title: string;
  whatsapp_description: string;
  
  // About Us
  about_title: string;
  about_desc1: string;
  about_desc2: string;
  about_photo: string;
  
  // Vision & Misi
  vision_title: string;
  vision_content: string;
  missions: string[];
  
  // Hero Homepage
  hero_label: string;
  hero_title: string;
  hero_description: string;
  hero_image: string;
  hero_video: string;
  hero_source: 'auto' | 'manual';
  hero_activity_id?: string;
  
  // Section configurations
  sections: SectionSetting[];
  enable_kegiatan_page?: boolean;
  enable_foto_terbaru_page?: boolean;

  // Slideshow Settings
  slideshow_duration?: number;
  slideshow_transition?: string;
  slideshow_blur?: number;

  // Copyright Settings
  copyright_year?: string;
  copyright_author?: string;
}

export interface DashboardStats {
  totalActivities: number;
  totalPhotos: number;
  totalVideos: number;
  latestActivity?: Activity;
}
