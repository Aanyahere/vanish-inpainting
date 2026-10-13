export interface SampleImage {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  paperReference: string;
  width: number;
  height: number;
  render: (ctx: CanvasRenderingContext2D) => void;
  renderMask: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * Procedurally generated sample scenes designed to replicate
 * key benchmark tests from Criminisi et al. (2004).
 */
export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'beach-buoy',
    title: 'Coastal Beach & Buoy',
    subtitle: 'Linear Horizon Continuation',
    description: 'A coastal scene featuring a crisp horizon dividing ocean and sky, with an unwanted orange buoy straddling the shore.',
    paperReference: 'Tests linear structure continuation across horizon (Fig. 20 in Criminisi 2004)',
    width: 440,
    height: 330,
    render: (ctx) => {
      const w = 440;
      const h = 330;

      // 1. Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 140);
      skyGrad.addColorStop(0, '#5A9AD4');
      skyGrad.addColorStop(0.6, '#9EC6EB');
      skyGrad.addColorStop(1, '#D9E8F5');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, 140);

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(80, 50, 35, 0, Math.PI * 2);
      ctx.arc(120, 45, 45, 0, Math.PI * 2);
      ctx.arc(160, 55, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(320, 60, 25, 0, Math.PI * 2);
      ctx.arc(350, 55, 35, 0, Math.PI * 2);
      ctx.arc(380, 65, 20, 0, Math.PI * 2);
      ctx.fill();

      // 2. Distant sea horizon (crisp horizontal edge at y = 140)
      const seaGrad = ctx.createLinearGradient(0, 140, 0, 210);
      seaGrad.addColorStop(0, '#1E486A');
      seaGrad.addColorStop(0.3, '#2A628F');
      seaGrad.addColorStop(1, '#3E82AF');
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, 140, w, 70);

      // Subtle sea waves
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let y = 145; y < 205; y += 8) {
        ctx.fillRect(0, y, w, 1);
      }

      // Shoreline foam / boundary at y = 210
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(0, 208, w, 3);

      // 3. Wet sand & dry sand
      const sandGrad = ctx.createLinearGradient(0, 210, 0, h);
      sandGrad.addColorStop(0, '#C29F6C');
      sandGrad.addColorStop(0.3, '#D8B884');
      sandGrad.addColorStop(1, '#E6CB9E');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, 210, w, h - 210);

      // Sand pebbles / grain texture
      ctx.fillStyle = 'rgba(140, 90, 40, 0.15)';
      for (let i = 0; i < 600; i++) {
        const sx = (i * 37) % w;
        const sy = 215 + ((i * 47) % (h - 220));
        ctx.fillRect(sx, sy, 2, 2);
      }

      // 4. Unwanted Object: Orange Maritime Buoy
      const bx = 220;
      const by = 195;

      // Shadow on sand
      ctx.fillStyle = 'rgba(50, 30, 10, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 32, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Buoy body
      const buoyGrad = ctx.createRadialGradient(bx - 8, by - 6, 4, bx, by, 30);
      buoyGrad.addColorStop(0, '#FF7830');
      buoyGrad.addColorStop(0.7, '#D4380D');
      buoyGrad.addColorStop(1, '#8C1D04');
      ctx.fillStyle = buoyGrad;
      ctx.beginPath();
      ctx.arc(bx, by, 26, 0, Math.PI * 2);
      ctx.fill();

      // Buoy ring / stripe
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(bx, by, 25, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Buoy top handle
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bx, by - 26, 7, Math.PI, 0);
      ctx.stroke();
    },
    renderMask: (ctx) => {
      // Precise mask covering the orange buoy and its shadow
      const bx = 220;
      const by = 195;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(bx, by, 34, 0, Math.PI * 2);
      ctx.fill();

      // Cover shadow & handle
      ctx.beginPath();
      ctx.ellipse(bx, by + 30, 35, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bx, by - 28, 14, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: 'street-pole',
    title: 'Street Signpost & Road',
    subtitle: 'Boundary & Pole Reconstruction',
    description: 'A roadway and grassy park scene intersected vertically by an occluding signpost. Tests pole removal and background alignment.',
    paperReference: 'Inspired by Fig. 11 sign pole experiment in Criminisi (2004)',
    width: 440,
    height: 330,
    render: (ctx) => {
      const w = 440;
      const h = 330;

      // Top background: Foliage and trees
      const foliageGrad = ctx.createLinearGradient(0, 0, 0, 160);
      foliageGrad.addColorStop(0, '#214D28');
      foliageGrad.addColorStop(0.5, '#356E3B');
      foliageGrad.addColorStop(1, '#4A8550');
      ctx.fillStyle = foliageGrad;
      ctx.fillRect(0, 0, w, 160);

      // Leaves texture
      ctx.fillStyle = 'rgba(70, 150, 80, 0.3)';
      for (let i = 0; i < 400; i++) {
        const lx = (i * 53) % w;
        const ly = (i * 29) % 150;
        ctx.beginPath();
        ctx.arc(lx, ly, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Middle: Stone curb / barrier line at y = 160
      const curbGrad = ctx.createLinearGradient(0, 160, 0, 180);
      curbGrad.addColorStop(0, '#B3B3B3');
      curbGrad.addColorStop(0.5, '#8C8C8C');
      curbGrad.addColorStop(1, '#666666');
      ctx.fillStyle = curbGrad;
      ctx.fillRect(0, 160, w, 20);

      // Asphalt Road
      const roadGrad = ctx.createLinearGradient(0, 180, 0, h);
      roadGrad.addColorStop(0, '#36393E');
      roadGrad.addColorStop(1, '#25272B');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, 180, w, h - 180);

      // White road marker line
      ctx.fillStyle = '#E6E6E6';
      ctx.fillRect(0, 240, w, 8);

      // Unwanted Foreground Object: Street Signpost
      const px = 220;

      // Vertical pole
      const poleGrad = ctx.createLinearGradient(px - 6, 0, px + 6, 0);
      poleGrad.addColorStop(0, '#737373');
      poleGrad.addColorStop(0.5, '#E6E6E6');
      poleGrad.addColorStop(1, '#4D4D4D');
      ctx.fillStyle = poleGrad;
      ctx.fillRect(px - 6, 70, 12, h - 70);

      // Signboard
      const signGrad = ctx.createLinearGradient(px - 35, 60, px + 35, 120);
      signGrad.addColorStop(0, '#F5A623');
      signGrad.addColorStop(1, '#D97706');
      ctx.fillStyle = signGrad;
      ctx.beginPath();
      ctx.roundRect(px - 36, 60, 72, 54, 8);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Sign icon / symbol
      ctx.fillStyle = '#1A1A1A';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠', px, 96);
    },
    renderMask: (ctx) => {
      const px = 220;
      ctx.fillStyle = '#FFFFFF';

      // Cover signboard
      ctx.beginPath();
      ctx.roundRect(px - 44, 52, 88, 70, 12);
      ctx.fill();

      // Cover pole
      ctx.fillRect(px - 14, 110, 28, 220);
    },
  },
  {
    id: 'kanizsa-synthetic',
    title: 'Kanizsa Triangle Benchmark',
    subtitle: 'Classic Geometric Edge Synthesis',
    description: 'The famous synthetic benchmark from the Criminisi paper. An occluding shape breaks linear edges to test the connectivity principle.',
    paperReference: 'Exact replication of Fig. 7 synthetic test in Criminisi (2004)',
    width: 440,
    height: 330,
    render: (ctx) => {
      const w = 440;
      const h = 330;

      // Clean neutral background with subtle noise
      ctx.fillStyle = '#E8E8E8';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2 - 10;
      const r = 90;

      // Three vertices of the outer triangle
      const p1 = { x: cx, y: cy - r };
      const p2 = { x: cx - r * Math.cos(Math.PI / 6), y: cy + r * Math.sin(Math.PI / 6) };
      const p3 = { x: cx + r * Math.cos(Math.PI / 6), y: cy + r * Math.sin(Math.PI / 6) };

      // Three black "Pacman" circles at vertices
      const pacmanRadius = 38;
      const drawPacman = (center: { x: number; y: number }, angleStart: number, angleEnd: number) => {
        ctx.fillStyle = '#1E1E1E';
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.arc(center.x, center.y, pacmanRadius, angleStart, angleEnd);
        ctx.closePath();
        ctx.fill();
      };

      drawPacman(p1, Math.PI / 6, (5 * Math.PI) / 6);
      drawPacman(p2, (9 * Math.PI) / 6, (13 * Math.PI) / 6);
      drawPacman(p3, (5 * Math.PI) / 6, (9 * Math.PI) / 6);

      // Sharp green inverted triangle outlines
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y + 40);
      ctx.lineTo(p2.x + 35, p2.y - 20);
      ctx.lineTo(p3.x - 35, p3.y - 20);
      ctx.closePath();
      ctx.stroke();

      // Unwanted Occluding Shape in center: Red Hexagon / Diamond
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(cx, cy + 15, 34, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.stroke();
    },
    renderMask: (ctx) => {
      const cx = 220;
      const cy = 165;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, 42, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: 'cliff-traveler',
    title: 'Alpine Peak & Hiker',
    subtitle: 'Scenic Object Removal',
    description: 'A hiker standing on an alpine ridge. Removing the hiker tests texture propagation of jagged rocks and distant mountain ridgeline.',
    paperReference: 'Inspired by Fig. 1 & Fig. 21 person removal in Criminisi (2004)',
    width: 440,
    height: 330,
    render: (ctx) => {
      const w = 440;
      const h = 330;

      // Sunset / Alpine sky
      const sky = ctx.createLinearGradient(0, 0, 0, 160);
      sky.addColorStop(0, '#2C3E50');
      sky.addColorStop(0.5, '#4CA1AF');
      sky.addColorStop(1, '#F3904F');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, 160);

      // Distant mountain range
      ctx.fillStyle = '#34495E';
      ctx.beginPath();
      ctx.moveTo(0, 160);
      ctx.lineTo(80, 110);
      ctx.lineTo(160, 140);
      ctx.lineTo(250, 90);
      ctx.lineTo(340, 130);
      ctx.lineTo(w, 85);
      ctx.lineTo(w, 180);
      ctx.lineTo(0, 180);
      ctx.closePath();
      ctx.fill();

      // Midground mountain ridge
      ctx.fillStyle = '#22313F';
      ctx.beginPath();
      ctx.moveTo(0, 180);
      ctx.lineTo(120, 140);
      ctx.lineTo(210, 160);
      ctx.lineTo(310, 125);
      ctx.lineTo(w, 155);
      ctx.lineTo(w, 230);
      ctx.lineTo(0, 230);
      ctx.closePath();
      ctx.fill();

      // Foreground cliff ledge with rock texture
      const rockGrad = ctx.createLinearGradient(0, 210, 0, h);
      rockGrad.addColorStop(0, '#424242');
      rockGrad.addColorStop(0.4, '#303030');
      rockGrad.addColorStop(1, '#1A1A1A');
      ctx.fillStyle = rockGrad;
      ctx.beginPath();
      ctx.moveTo(0, 250);
      ctx.lineTo(150, 210);
      ctx.lineTo(280, 205);
      ctx.lineTo(w, 240);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Rocky details / textures
      ctx.fillStyle = '#555555';
      for (let i = 0; i < 250; i++) {
        const rx = (i * 41) % w;
        const ry = 220 + ((i * 31) % (h - 225));
        ctx.fillRect(rx, ry, 3, 2);
      }

      // Unwanted Hiker standing on ridge at (220, 205)
      const hx = 220;
      const hy = 205;

      // Backpack
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(hx - 9, hy - 32, 8, 16);

      // Red Jacket Body
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(hx - 5, hy - 36, 12, 20);

      // Head / Beanie
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(hx + 1, hy - 41, 6, 0, Math.PI * 2);
      ctx.fill();

      // Pants & Legs
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(hx - 4, hy - 16, 4, 16);
      ctx.fillRect(hx + 2, hy - 16, 4, 16);
    },
    renderMask: (ctx) => {
      const hx = 220;
      const hy = 205;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(hx - 18, hy - 52, 36, 56, 14);
      ctx.fill();
    },
  },
];
