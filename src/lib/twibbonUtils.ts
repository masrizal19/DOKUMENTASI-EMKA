import { Twibbon } from "../types";

/**
 * Generates a stunning Base64 PNG Twibbon frame dynamically using HTML5 Canvas.
 * This ensures our default mock data campaigns are fully interactive instantly!
 */
export function generateMockFrame(title: string, ratio: "1:1" | "4:3" | "16:9" | "9:16"): string {
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  let width = 1000;
  let height = 1000;

  if (ratio === "4:3") {
    height = 750;
  } else if (ratio === "16:9") {
    height = 562.5;
  } else if (ratio === "9:16") {
    width = 562.5;
    height = 1000;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Clear Canvas (Transparent)
  ctx.clearRect(0, 0, width, height);

  // Define Colors
  const gold = "#f6c374";
  const darkBrown = "#17130e";
  const goldDark = "#d8a85c";

  // 2. Draw Decorative Borders
  ctx.strokeStyle = gold;
  ctx.lineWidth = 15;
  ctx.strokeRect(15, 15, width - 30, height - 30);

  // Thin inner gold border
  ctx.strokeStyle = "rgba(246, 195, 116, 0.4)";
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // 3. Decorative Corner Accents
  const cornerSize = Math.min(width, height) * 0.12;
  ctx.fillStyle = gold;
  
  // Top-Left corner accent
  ctx.beginPath();
  ctx.moveTo(15, 15);
  ctx.lineTo(15 + cornerSize, 15);
  ctx.lineTo(15, 15 + cornerSize);
  ctx.closePath();
  ctx.fill();

  // Top-Right corner accent
  ctx.beginPath();
  ctx.moveTo(width - 15, 15);
  ctx.lineTo(width - 15 - cornerSize, 15);
  ctx.lineTo(width - 15, 15 + cornerSize);
  ctx.closePath();
  ctx.fill();

  // 4. Draw Header/Footer Banner
  // We place a solid premium dark-gold banner at the bottom for the title
  const bannerHeight = height * 0.18;
  const bannerY = height - bannerHeight - 15;

  ctx.fillStyle = darkBrown;
  ctx.fillRect(15, bannerY, width - 30, bannerHeight);

  // Border between transparent area and footer banner
  ctx.fillStyle = gold;
  ctx.fillRect(15, bannerY, width - 30, 8);

  // 5. Draw Badges & Logo Motifs
  // Draw an elegant circular badge at top center
  const badgeRadius = Math.min(width, height) * 0.08;
  const badgeX = width / 2;
  const badgeY = 15 + badgeRadius * 0.4;

  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.fillStyle = darkBrown;
  ctx.fill();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Inner gold circle
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius - 10, 0, Math.PI * 2);
  ctx.strokeStyle = goldDark;
  ctx.lineWidth = 2;
  ctx.stroke();

  // "EMKA" text inside top badge
  ctx.fillStyle = gold;
  ctx.font = `bold ${Math.round(badgeRadius * 0.4)}px "Playfair Display", "Georgia", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EMKA", badgeX, badgeY);

  // 6. Draw Text in Footer Banner
  ctx.fillStyle = gold;
  ctx.font = `bold ${Math.round(bannerHeight * 0.28)}px "Playfair Display", "Georgia", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Main Campaign Title
  ctx.fillText(title, width / 2, bannerY + bannerHeight * 0.4);

  // Subtitle/School Name
  ctx.fillStyle = "#eae1d8";
  ctx.font = `tracking-widest uppercase ${Math.round(bannerHeight * 0.16)}px "Plus Jakarta Sans", "Helvetica", sans-serif`;
  ctx.fillText("SMK MULTI KARYA MEDAN", width / 2, bannerY + bannerHeight * 0.72);

  // Small decorative ribbon or stars on the footer banner
  const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = gold;
    ctx.fill();
  };

  // Draw 3 gold stars below the main text
  drawStar(width / 2 - 40, bannerY + bannerHeight * 0.12, 5, 8, 4);
  drawStar(width / 2, bannerY + bannerHeight * 0.12, 5, 10, 5);
  drawStar(width / 2 + 40, bannerY + bannerHeight * 0.12, 5, 8, 4);

  return canvas.toDataURL("image/png");
}

/**
 * Gets local twibbons or initializes them with beautifully generated mock campaigns
 */
export function getStoredTwibbons(): Twibbon[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem("galeri_emka_twibons");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (_) {}
  }

  // Initialize with beautiful mock data
  const mockTwibbons: Twibbon[] = [
    {
      id: "1",
      title: "MPLS SMK MULTI KARYA 2026",
      slug: "mpls-2026",
      description: "Gunakan Twibbon resmi untuk menyambut Masa Pengenalan Lingkungan Sekolah (MPLS) SMK Multi Karya Medan tahun pelajaran 2026/2027.",
      ratio: "1:1",
      designUrl: generateMockFrame("MPLS 2026", "1:1"),
      isActive: true,
      useCount: 142,
      createdAt: "2026-07-10T08:00:00Z"
    },
    {
      id: "2",
      title: "MILAD SMK MULTI KARYA",
      slug: "milad-smk-2026",
      description: "Mari meriahkan perayaan Milad ke-45 SMK Multi Karya Medan dengan menggunakan Twibbon resmi kebanggaan kita.",
      ratio: "4:3",
      designUrl: generateMockFrame("MILAD KE-45", "4:3"),
      isActive: true,
      useCount: 88,
      createdAt: "2026-08-15T09:30:00Z"
    },
    {
      id: "3",
      title: "PORSENIK EMKA 2026",
      slug: "porsenik-2026",
      description: "Tunjukkan semangat sportivitas dan kreativitasmu dalam Pekan Olahraga dan Seni (Porsenik) SMK Multi Karya Medan tahun 2026.",
      ratio: "9:16",
      designUrl: generateMockFrame("PORSENIK 2026", "9:16"),
      isActive: true,
      useCount: 205,
      createdAt: "2026-09-01T10:15:00Z"
    }
  ];

  localStorage.setItem("galeri_emka_twibons", JSON.stringify(mockTwibbons));
  return mockTwibbons;
}

export function saveStoredTwibbons(twibbons: Twibbon[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("galeri_emka_twibons", JSON.stringify(twibbons));
  }
}

/**
 * Checks if a base64 PNG data URL has transparency.
 * We analyze a thumbnail-sized version or probe the image.
 */
export async function checkPngTransparency(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Scale down to a 50x50 grid for fast analysis
      canvas.width = 50;
      canvas.height = 50;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(true); // Fallback
        return;
      }
      ctx.drawImage(img, 0, 0, 50, 50);
      try {
        const imgData = ctx.getImageData(0, 0, 50, 50);
        const data = imgData.data;
        // Check if any pixel has an alpha value < 240 (which means transparent/semi-transparent)
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 240) {
            resolve(true);
            return;
          }
        }
        resolve(false); // Fully opaque
      } catch (_) {
        resolve(true); // Cross-origin or other error, assume yes
      }
    };
    img.onerror = () => {
      resolve(true);
    };
  });
}
