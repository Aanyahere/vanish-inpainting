# Vanish — Exemplar-Based Object Removal Tool

[![Paper](https://img.shields.io/badge/IEEE%20TIP%202004-Criminisi%20et%20al.-amber.svg)](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/criminisi_tip2004.pdf)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20TypeScript%20%7C%20Vite%20%7C%20TailwindCSS-violet.svg)](#tech-stack)
[![Tests](https://img.shields.io/badge/Tests-Passing%20(Vitest)-emerald.svg)](#testing)
[![Runs](https://img.shields.io/badge/Runs-100%25%20Client--Side%20in%20Browser-blue.svg)](#overview)

**Vanish** is a darkroom-themed, client-side web application for interactive photo object removal and region inpainting. It implements the classic exemplar-based image inpainting algorithm by **A. Criminisi, P. Pérez, and K. Toyama** (*"Region Filling and Object Removal by Exemplar-Based Image Inpainting"*, IEEE Transactions on Image Processing, Vol. 13, No. 9, September 2004).

This is a **classical, non-AI, patch-sampling algorithm** — no neural networks, no heavy weights, no training data, and zero cloud API calls. Everything runs client-side in the browser using HTML5 Canvas and Web Workers.

---

## Table of Contents
1. [Overview & Motivation](#overview--motivation)
2. [How the Algorithm Works (Criminisi 2004)](#how-the-algorithm-works-criminisi-2004)
   - [Fill Front Identification](#step-1-fill-front-identification)
   - [Priority Computation: Confidence vs Data Term](#step-2-priority-computation)
   - [Patch Selection](#step-3-patch-selection)
   - [Exemplar Search in CIE L*a*b* Space](#step-4-exemplar-search)
   - [Patch Copying & Confidence Propagation](#step-5-patch-copying--confidence-propagation)
3. [Studio Darkroom Theme & UI Features](#studio-darkroom-theme--ui-features)
4. [Benchmark Presets](#benchmark-presets)
5. [Tech Stack & Architecture](#tech-stack--architecture)
6. [Getting Started (Local Development)](#getting-started-local-development)
7. [Testing](#testing)
8. [Deployment Guide](#deployment-guide)
9. [Paper Citation & References](#paper-citation--references)

---

## Overview & Motivation

When presenting image processing techniques, deep learning image erasers (such as Google Magic Eraser or Stable Diffusion Inpainting) can feel like opaque "black boxes" that hallucinate pixels from billions of training weights.

In contrast, **Criminisi et al. (2004)** introduced an intuitive, deterministic, and elegant insight:

> **Core Observation:** Natural scenes consist of two elements: **2D textures** (grass, water, sand) and **1D linear structures** (horizons, table edges, sign poles).
> By prioritizing patches where linear structures (isophotes) strike the boundary perpendicularly, the algorithm continues edges straight into the hole first before filling textured areas — avoiding the blur of diffusion algorithms and the broken-line artifacts of concentric "onion-peel" synthesis.

---

## How the Algorithm Works (Criminisi 2004)

Given an input image $I$ and a user-painted binary mask $\Omega$ (where $\Omega$ is the target hole to remove and $\Phi = I \setminus \Omega$ is the source region):

### Step 1: Fill Front Identification
The fill front $\delta\Omega$ is defined as the set of unfilled pixels in $\Omega$ that share at least one 4-connected neighbor with the known source region $\Phi$:
$$\delta\Omega = \{ p \in \Omega \mid \exists q \in \mathcal{N}_4(p), q \notin \Omega \}$$

### Step 2: Priority Computation
For every pixel $p \in \delta\Omega$, a priority value $P(p)$ is computed as the product of two competing forces:
$$P(p) = C(p) \cdot D(p)$$

#### 1. Confidence Term $C(p)$
$$C(p) = \frac{\sum_{q \in \Psi_p \cap (I \setminus \Omega)} C(q)}{|\Psi_p|}$$
- $|\Psi_p|$ is the patch area (e.g., $9 \times 9 = 81$ pixels).
- **Initialization:** $C(p) = 0$ for $p \in \Omega$, and $C(p) = 1$ for $p \in I \setminus \Omega$.
- **Intuition:** Favors patches surrounded by already-known, high-confidence information. It naturally smooths out sharp corners and inward tendrils, preventing noise amplification.

#### 2. Data Term $D(p)$ (Isophotes & Normals)
$$D(p) = \frac{|\nabla I_p^\perp \cdot \mathbf{n}_p|}{\alpha}$$
- $\mathbf{n}_p$ is the unit vector orthogonal to the fill front $\delta\Omega$ at point $p$.
- $\nabla I_p^\perp = (-I_y, I_x)$ is the **isophote** (vector orthogonal to the local luminance gradient $\nabla I_p = (I_x, I_y)$), computed from the pixel in $\Psi_p \cap (I \setminus \Omega)$ with maximum gradient magnitude.
- $\alpha = 255$ is the normalization factor.
- **Intuition:** When a prominent edge strikes the boundary head-on, its isophote aligns with the boundary normal, maximizing the dot product $|\nabla I_p^\perp \cdot \mathbf{n}_p|$. This boosts the priority of boundary edges, compelling them to propagate into the hole **first**.

### Step 3: Patch Selection
Select the center point $\hat{p}$ on the fill front with the global maximum priority:
$$\hat{p} = \arg\max_{p \in \delta\Omega} P(p)$$

### Step 4: Exemplar Search
Search the known source region $\Phi$ for a candidate patch $\Psi_{\hat{q}}$ that minimizes the Sum of Squared Differences (SSD) over known pixels:
$$\Psi_{\hat{q}} = \arg\min_{\Psi_q \in \Phi} d(\Psi_{\hat{p}}, \Psi_q)$$
$$d(\Psi_{\hat{p}}, \Psi_q) = \sum_{k \in \Psi_{\hat{p}} \cap (I \setminus \Omega)} \| I(k) - I(q_k) \|^2$$

Colors are compared in the **CIE L\*a\*b\* color space** (per paper Footnote 3) because Euclidean distance in CIE Lab is perceptually uniform.

### Step 5: Patch Copying & Confidence Propagation
1. Copy the RGB (and Lab) color values from $\Psi_{\hat{q}}$ into the unfilled pixels of $\Psi_{\hat{p}} \cap \Omega$.
2. Update the confidence:
   $$C(p) = C(\hat{p}) \quad \forall p \in \Psi_{\hat{p}} \cap \Omega$$
3. Remove the filled pixels from $\Omega$ and repeat until the target hole $\Omega$ is empty.

---

## Studio Darkroom Theme & UI Features

- **Darkroom Safelight Aesthetic:** Deep charcoal backgrounds (`#0B0C10` to `#15171D`), warm safelight amber accents (`#F5A623`), subtle film-grain texture, and glowing cursor indicators.
- **Dual-Layer Canvas:**
  - Base Image Layer
  - Amber Mask Layer (semi-transparent `rgba(245, 166, 35, 0.7)`)
  - Interactive custom cursor showing accurate brush radius.
- **Tools:**
  - Brush tool with adjustable radius slider (8px to 80px).
  - Eraser tool for fine mask touchups.
  - Clear mask button.
- **Web Worker Architecture:** The entire Criminisi algorithm runs inside a background Web Worker, ensuring the UI stays at 60 FPS while streaming live progress.
- **Real-Time Iterative Progress Bar:**
  - Percentage filled
  - Number of pixels remaining vs initial hole size
  - Iteration counter and elapsed time
  - Instant Stop / Cancel capability
- **Interactive Before / After Comparison:**
  - Draggable split-view comparison slider with amber divider handle
  - View modes: Split Slider, Side-by-Side, Inpainted Result, Original Photo, and Mask Overlay
  - One-click PNG Export

---

## Benchmark Presets

Four built-in procedural scenes directly replicate key experiments from the 2004 Criminisi paper:

1. **Coastal Beach & Buoy** *(Horizon Continuation — Fig. 20)*:
   Tests continuation of a straight ocean-sky horizon across an occluding orange buoy.
2. **Street Signpost & Road** *(Pole Reconstruction — Fig. 11)*:
   Tests vertical structure synthesis and curb alignment when removing an occluding post.
3. **Kanizsa Triangle** *(Geometric Benchmark — Fig. 7)*:
   Recreates the classic synthetic Kanizsa experiment demonstrating the Gestalt "Connectivity Principle".
4. **Alpine Peak & Hiker** *(Scenic Object Removal — Fig. 1 & Fig. 21)*:
   Tests organic texture synthesis across jagged rocks and mountain ridges.

Each sample includes a **"Preset Mask"** button for instant one-click testing without manual drawing!

---

## Tech Stack & Architecture

- **React 19** + **TypeScript**
- **Vite 8** + **@tailwindcss/vite (Tailwind CSS v4)**
- **Framer Motion** + **Lucide React**
- **HTML5 Canvas API** + **TypedArrays** (`Float32Array`, `Uint8ClampedArray`, `Uint8Array`)
- **Web Worker** (`inpainting.worker.ts`) for asynchronous inpainting
- **Vitest** for algorithm unit testing

---

## Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation & Run

```bash
# 1. Clone repository (or navigate to workspace)
cd ipa_research

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open your browser at the local URL (usually `http://localhost:5173/`).

### Production Build

```bash
npm run build
```
Creates an optimized static bundle in `dist/`.

---

## Testing

Run the automated Vitest test suite covering color conversions, fill-front detection, normal vectors, isophotes, and iterative inpainting:

```bash
npm test
```

---

## Deployment Guide

The build output in `dist/` consists of static HTML, CSS, JavaScript, and Web Worker assets.

- **Vercel:** Run `vercel` or link your Git repository (Build command: `npm run build`, Output: `dist`).
- **Netlify:** Drag and drop the `dist/` directory or link Git.
- **GitHub Pages:** Deploy the `dist/` directory using `gh-pages` or GitHub Actions.

---

## Paper Citation & References

```bibtex
@article{criminisi2004region,
  author    = {Criminisi, Antonio and P{\'e}rez, Patrick and Toyama, Kentaro},
  title     = {Region Filling and Object Removal by Exemplar-Based Image Inpainting},
  journal   = {IEEE Transactions on Image Processing},
  volume    = {13},
  number    = {9},
  pages     = {1200--1212},
  year      = {2004},
  publisher = {IEEE}
}
```

Official Microsoft Research paper: [https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/criminisi_tip2004.pdf](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/criminisi_tip2004.pdf)
