# BhoomiNexus UI/UX Design System & Specification Manual
**Style Standard:** OpenWeb Editorial Broadsheet on Blush Paper  
**Canonical Reference Document:** `Frontend/UI-Ux.md`  
**Base Stylesheet:** `Frontend/src/index.css`  

---

## 1. Design Philosophy & Aesthetic Identity

BhoomiNexus is styled as a **Sovereign Editorial Broadsheet**—a high-contrast, authoritative, architectural public record that pairs the tactile dignity of fine newsprint with modern spatial GIS intelligence.

### Key Tenets
1. **Blush Paper (`#f1e9e7`) Base**: The canvas is never harsh pure `#ffffff` or dark `#000000`. The entire page breathes on a bespoke warm blush paper hue.
2. **High-Contrast Transitional Serifs**: Typography is rooted in classic editorial serif faces (`Playfair Display`, `Lora`, Georgia) with crisp terminals, italic emphasis, and sharp negative tracking on large display headlines.
3. **Hairline Precision (1px Carbon Ink)**: Sections, tab rows, stat grids, and table cells are delineated by razor-thin `1px solid #000000` rules—echoing printed government gazettes and broadsheet broadsides.
4. **Strict Geometric Discipline (0px vs 40px)**:
   - **0px Radius**: All interactive elements (buttons, text inputs, radio dots, tags, badges, ghost tabs) have completely **square, unrounded edges**.
   - **40px Radius**: Exclusively reserved for large macro-surfaces (e.g., the Cadastral Hero Console chassis).
5. **Restrained Color Hierarchy**: 95% of the UI is strictly monochromatic (Carbon Ink `#000000` on Blush Paper `#f1e9e7`). The single vivid accent is **Signal Blue (`#0058fe`)**, reserved for statutory lifecycle highlights, active state indications, and primary spatial emphasis.

---

## 2. Color Palette & Token Definitions

All colors are exposed as CSS custom properties in `src/index.css`.

| Token Name | Hex Code | Visual Swatch | Semantic Role & Strict Usage |
|:---|:---:|:---:|:---|
| `--color-blush-paper` | `#f1e9e7` | ![#f1e9e7](https://via.placeholder.com/15/f1e9e7/000000?text=+) | Universal page background canvas, side drawers, modals, cards. |
| `--color-carbon-ink` | `#000000` | ![#000000](https://via.placeholder.com/15/000000/ffffff?text=+) | Primary headlines, body text, hairline dividers, solid CTA buttons, 16-point logo emblem. |
| `--color-bone-white` | `#ffffff` | ![#ffffff](https://via.placeholder.com/15/ffffff/000000?text=+) | Hero console interior floor, high-contrast button typography, badge text. |
| `--color-signal-blue` | `#0058fe` | ![#0058fe](https://via.placeholder.com/15/0058fe/ffffff?text=+) | Active ghost tab text, orbital concentric lifecycle ring, interactive state selections, primary explore CTAs. |
| `--color-fossil-gray` | `#7b7f83` | ![#7b7f83](https://via.placeholder.com/15/7b7f83/ffffff?text=+) | Secondary metadata timestamps, input placeholders, category tags, dividers. |
| `--color-paper-tint` | `#eae1df` | ![#eae1df](https://via.placeholder.com/15/eae1df/000000?text=+) | Hover highlights on list items, subtle borders, card secondary backgrounds. |

### Semantic Color Rules
- **DO NOT** use generic red, yellow, or green pill badges.
- **DO NOT** use drop shadows or blur glows (`box-shadow: none` across standard cards; depth is achieved solely via `1px solid #000000` borders).
- **Signal Blue (`#0058fe`)** must be used sparingly. Never use it for long-form body text.

---

## 3. Typography & Typesetting System

BhoomiNexus uses **transitional editorial serifs** (`Playfair Display`, `Lora`, Georgia) paired with clean geometric fallbacks for numerical readouts.

```css
--font-copernicus: 'Playfair Display', 'Lora', Georgia, serif;
--font-body-serif: 'Lora', 'Playfair Display', Georgia, serif;
--font-helvetica: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### Typographic Scale

| Class / Level | Size | Line Height | Letter Spacing | Font Style & Weight | Recommended Usage |
|:---|:---:|:---:|:---:|:---:|:---|
| `.editorial-section-tag` / `--text-nano` | `11px` | `1.3` | `+2px` | Normal 500, ALL-CAPS | Section eyebrows, agency labels |
| `.hero-meta` | `12.5px` | `1.3` | `+1.2px` | Normal 500, ALL-CAPS | Department subtitles, sovereign stamps |
| `--text-caption` | `14px` | `1.3` | `0px` | Normal 400 | Data labels, input labels, form footnotes |
| `--text-body` | `16px` | `1.55` | `-0.15px` | Normal 400 | Hero subtitle, explanatory body prose |
| `.node-title` | `13.5px` | `1.25` | `-0.15px` | Medium 500, Signal Blue | Lifecycle wheel stage headers |
| `.node-subtitle` | `11.5px` | `1.35` | `0px` | Italic 400, Carbon Ink | Lifecycle wheel statutory subtitles |
| `--text-subheading` | `24px` | `1.2` | `-0.8px` | Normal 400 | Section titles (e.g. Map Explorer, Inquiries) |
| `.hero-headline` | `48px` | `1.15` | `-1.8px` | Normal 400 | Primary hero headline |
| `.statutory-wheel-title` | `46px` | `1.15` | `-2px` | Normal 400 | Lifecycle wheel section headline |
| `.ghost-tab-btn` | `38px` | `1.1` | `-1.5px` | Italic 400 | Active & inactive form tab selectors |
| `--text-display-lg` | `70px – 90px`| `0.9` | `-4px to -8px` | Normal 400 | Massive sovereign numbers, KPI values |

### Italic Treatment Convention
Italics indicate **human touch, editorial curation, and active states**:
- Button labels (`.btn-cta-black`, `.btn-cta-blue`, `.btn-cta-outline`) are **always italicized** (`font-style: italic;`).
- Active Ghost Tabs are italicized in Signal Blue (`#0058fe`).
- Statutory sub-labels (e.g., *"Bhu-Aadhaar 14-Digit ULPIN"*, *"Live Synchronized Ledger"*) are italicized.

---

## 4. Spacing Scale & Layout Grid

### Spacing Tokens
Always use predefined CSS variables for margins, paddings, and gaps:
```css
--spacing-4:   4px;
--spacing-8:   8px;
--spacing-12:  12px;
--spacing-16:  16px;
--spacing-20:  20px;
--spacing-24:  24px;
--spacing-32:  32px;
--spacing-36:  36px;
--spacing-40:  40px;
--spacing-60:  60px;
--spacing-80:  80px;
--spacing-100: 100px;
--spacing-120: 120px;
```

### Layout Rules
- **Maximum Page Width**: `1200px` (`--page-max-width`), centered with `margin: 0 auto; padding: 0 24px;`.
- **Standard Section Padding**: `padding: 64px 24px;` or `padding: 80px 24px;`.
- **Section Dividers**: Every major section is divided by `<div className="hairline-fullwidth" />` (`1px solid #000000; opacity: 0.2;`).
- **Card Padding**: Standard interior card padding is `24px` to `30px`.

---

## 5. Geometric Principles & Border Radii

| Category | Value | Application |
|:---|:---:|:---|
| **Buttons** | `0px` | `.btn-cta-black`, `.btn-cta-blue`, `.btn-cta-outline`, `.panel-close-btn` |
| **Form Inputs** | `0px` | Bottom-border text fields, select boxes, textareas |
| **Badges & Tags** | `0px` | `.hero-badge`, `.editorial-tag`, `.editorial-badge` |
| **Cards & Drawers** | `0px` | State Inspector Drawer, Map Tooltip, Instrument Cards |
| **Large Macro Surfaces** | `40px` | Exclusively `.console-chassis` (Cadastral Console) |

> [!IMPORTANT]
> **No Rounded Buttons:** Standard rounded buttons (`border-radius: 6px`, `8px`, or `9999px`) are strictly forbidden. The crisp, razor-sharp `0px` edges evoke the formal lines of legal gazettes and architectural plans.

---

## 6. Official Brand Emblem: The 16-Point Geometric Starburst

The BhoomiNexus logo is a sharp, 16-point geometric starburst rendered via `<BhoomiLogo />` (`src/components/common/BhoomiLogo.tsx`).

### Placement & Standard Sizing
1. **Header Wordmark**: `size={22}`, `strokeWidth={2.4}` (positioned left of "BhoomiNexus" in navigation).
2. **Hero Header**: `size={38}`, `strokeWidth={2.4}`, centered with `margin-bottom: 22px;`.
3. **Statutory Lifecycle Wheel**: `size={70}`, `strokeWidth={2.4}`, fixed in the exact center of the concentric orbits.
4. **Footer Masthead**: `size={26}`, `strokeWidth={2.4}`.

```tsx
import BhoomiLogo from '../components/common/BhoomiLogo';

// Example: Standard Hero Brand Mark
<div className="hero-brand-mark">
  <BhoomiLogo size={38} strokeWidth={2.4} />
</div>
```

---

## 7. Component Specifications & Code Blueprints

### A. Navigation Header (`PublicLayout.tsx`)
- **Height**: Fixed `56px`, sticky at `top: 0`, `z-index: 1000`.
- **Background**: Solid Blush Paper (`#f1e9e7`) with `1px solid #000000` bottom border (`.hairline-divider-nav`).
- **Contents**:
  - Left: Starburst icon (`22px`) + "BhoomiNexus" wordmark (`24px`).
  - Right: Minimalist action buttons (`Cadastral Explorer ↓` outline + `Officer Sign In →` solid black CTA).

```tsx
<header className="site-nav">
  <div className="nav-inner">
    <div className="nav-brand-group">
      <Link to="/" className="nav-wordmark">
        <BhoomiLogo size={22} strokeWidth={2.4} />
        <span>BhoomiNexus</span>
      </Link>
    </div>

    <nav className="nav-links-wrapper" aria-label="Main Navigation">
      <ul className="nav-links-list" style={{ gap: '14px' }}>
        <li>
          <a href="#map-explorer" className="btn-cta-outline" style={{ padding: '6px 16px', fontSize: '13px' }}>
            Cadastral Explorer &darr;
          </a>
        </li>
        <li>
          <Link to="/login" className="btn-cta-black" style={{ padding: '6px 16px', fontSize: '13px' }}>
            Officer Sign In &rarr;
          </Link>
        </li>
      </ul>
    </nav>
  </div>
</header>
<div className="hairline-divider-nav" />
```

---

### B. Standard CTA Buttons

Buttons share: `0px` border-radius, Copernicus font, `font-style: italic`, `14px–15px`, `white-space: nowrap;`.

#### 1. Carbon Ink Black CTA (`.btn-cta-black`)
Primary action button across the site (e.g. "Submit Official Inquiry", "Officer Dossier Access").
```css
.btn-cta-black {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-8);
  background-color: var(--color-carbon-ink);
  color: var(--color-bone-white);
  font-family: var(--font-copernicus);
  font-size: 14px;
  font-style: italic;
  padding: 10px 22px;
  border-radius: 0px;
  border: 1px solid var(--color-carbon-ink);
  transition: opacity 0.15s ease, transform 0.1s ease;
  text-decoration: none;
  cursor: pointer;
}
.btn-cta-black:hover {
  opacity: 0.86;
}
```

#### 2. Signal Blue CTA (`.btn-cta-blue`)
Primary spatial or lifecycle action.
```css
.btn-cta-blue {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-8);
  background-color: var(--color-signal-blue);
  color: var(--color-white);
  font-family: var(--font-copernicus);
  font-size: 14px;
  font-style: italic;
  padding: 10px 22px;
  border-radius: 0px;
  border: 1px solid var(--color-signal-blue);
  cursor: pointer;
}
.btn-cta-blue:hover {
  opacity: 0.88;
}
```

#### 3. Outline Broadsheet CTA (`.btn-cta-outline`)
Secondary navigational action.
```css
.btn-cta-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-8);
  background-color: transparent;
  color: var(--color-carbon-ink);
  font-family: var(--font-copernicus);
  font-size: 14px;
  font-style: italic;
  padding: 10px 22px;
  border-radius: 0px;
  border: 1px solid var(--color-carbon-ink);
  cursor: pointer;
}
.btn-cta-outline:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
```

---

### C. Hero Section Pattern
The hero layout balances institutional gravity with generous white space:

```tsx
<section className="hero-section">
  <div className="hero-container">
    <div className="hero-brand-mark">
      <BhoomiLogo size={38} strokeWidth={2.4} />
    </div>
    
    <div className="hero-eyebrow">
      <span className="hero-meta">Ministry of Rural Development</span>
    </div>

    <h1 className="hero-headline">
      National Land Acquisition Portal
    </h1>

    <p className="hero-subtext">
      Sovereign digital framework for land acquisition lifecycle management, RFCTLARR 2013 statutory compliance, multi-modal parcel valuation, and direct benefit disbursement.
    </p>

    <div className="hero-actions">
      <a href="#statutory-pillars" className="btn-cta-outline">
        Statutory Lifecycle Wheel
      </a>
      <a href="#inquiry-portal" className="btn-cta-black">
        File Official Inquiry &rarr;
      </a>
    </div>

    {/* Hero Cadastral Console Chassis (40px Radius) */}
    <div className="hero-console-container">
      <CadastralHeroConsole />
    </div>
  </div>
</section>
```

---

### D. Statutory Lifecycle Wheel (`StatutoryArchitectureWheel.tsx`)
A circular orbital lifecycle visualization with concentric rings:
- **Diagram Stage Dimensions**: `max-width: 580px; height: 430px;` (centered).
- **Graphic Center**: `width: 340px; height: 340px;`.
  - Outer ring: Dashed black orbit (`strokeDasharray="5 6"`) with 4 directional arrows.
  - Inner ring: Solid Signal Blue (`#0058fe`, `strokeWidth="2.2"`).
  - Center: `BhoomiLogo` (`70px`).
- **Peripheral Nodes (6 steps)**:
  - Width: `165px`.
  - Node Title: `13.5px`, medium weight, Signal Blue (`#0058fe`).
  - Node Subtitle: `11.5px`, italic, Carbon Ink (`#000000`).
  - Clearances: Nodes hug the circumference closely (`14px`–`18px` clearance).

---

### E. National Aggregate Overview Bar
A broadsheet summary bar separated by vertical hairline borders:

```tsx
<section className="overview-bar">
  <div className="overview-container">
    <div className="overview-header-row">
      <h3 className="overview-section-title">National Summary Overview</h3>
      <span className="overview-period-stamp">Live Synchronized Ledger — MoRD &amp; DoLR</span>
    </div>

    <div className="overview-grid">
      <div className="overview-card">
        <div className="overview-value">36</div>
        <div className="overview-desc">States &amp; UTs Integrated</div>
      </div>
      <div className="overview-card">
        <div className="overview-value">347</div>
        <div className="overview-desc">Active Infrastructure Projects</div>
      </div>
      <div className="overview-card">
        <div className="overview-value">124.5<span className="unit">k Ha</span></div>
        <div className="overview-desc">Land Area Under Process</div>
      </div>
      <div className="overview-card">
        <div className="overview-value">₹89.7<span className="unit">k Cr</span></div>
        <div className="overview-desc">Total Capital Pipeline</div>
      </div>
    </div>
  </div>
</section>
```

---

### F. Interactive Cadastral Map & State Inspector Drawer
- **Map Base Layer**: Esri World Light Gray Canvas (`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`). 100% keyless, clean, blush-harmonized.
- **GeoJSON States**: Styled with `#000000` stroke (`0.9px`), `#000000` fill with `0.04` default opacity, `0.15` hover opacity, and `#0058fe` or high-contrast black fill when selected.
- **State Inspector Drawer**:
  - Attached to the right side of the map frame (`width: 360px`).
  - Background: Blush Paper (`#f1e9e7`).
  - Border: `1px solid #000000` on the left.
  - Displays: State name, State code, 4-stat KPI grid (Active Projects, Districts, Parcels, Est. Compensation), key projects list, and an "Officer Dossier Access →" link button.

---

### G. Statutory Inquiry & Gazette Form System

#### 1. Ghost Tab Selector
Switches roles or views without boxes or pills. Selection is indicated solely by **Signal Blue (`#0058fe`) italics**:
```tsx
<div className="ghost-tab-container">
  <div className="ghost-tab-row">
    <button
      type="button"
      className={`ghost-tab-btn ${activeTab === 'officer' ? 'active' : ''}`}
      onClick={() => setActiveTab('officer')}
    >
      Acquisition Authorities &amp; CALA
    </button>
    <button
      type="button"
      className={`ghost-tab-btn ${activeTab === 'citizen' ? 'active' : ''}`}
      onClick={() => setActiveTab('citizen')}
    >
      Citizen Landowners &amp; Stakeholders
    </button>
  </div>
</div>
```

#### 2. Bottom-Border Text Inputs
Inputs have **no background** and **no box enclosure**—only a clean `1px solid #000000` bottom border.
```css
.bottom-border-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bottom-border-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-carbon-ink);
  font-family: var(--font-copernicus);
  font-size: 15px;
  color: var(--color-carbon-ink);
  padding: 8px 0;
  border-radius: 0px;
  outline: none;
}
.bottom-border-input:focus {
  border-bottom: 2px solid var(--color-signal-blue);
}
```

#### 3. Custom Radio Option Row
- Circular 18px outer ring with `1px solid #000000`.
- When active, displays a centered 8px inner dot in Signal Blue (`#0058fe`).
- Label positioned to the right in Copernicus `14.5px`.

---

## 8. Layout Grid & Breakpoints Reference

| Breakpoint | Target Screen | Adjustments |
|:---|:---:|:---|
| **Desktop (> 1024px)** | 1200px Max Container | Full 4-column overview grid, full 580px lifecycle wheel, side-by-side map + inspector drawer. |
| **Tablet (768px – 1024px)** | Tablets & Small Laptops | 2-column overview grid, 520px wheel stage with 12.5px font, stacked inquiry form. |
| **Mobile (< 768px)** | Smartphones | 1-column overview grid, wheel nodes stack into sequential vertical list, map full-width with stacked inspector sheet below. |

---

## 9. Critical Anti-Patterns (What NEVER to Do)

1. ❌ **NEVER use soft rounded corners (`border-radius: 6px` or `8px`)** on buttons, cards, tags, or inputs. All edges are strictly `0px` (or `40px` for large console chassis).
2. ❌ **NEVER use standard generic box-shadows** (`box-shadow: 0 4px 12px rgba(0,0,0,0.1)`). Structural hierarchy must be achieved through 1px hairline rules and blush vs bone surface contrast.
3. ❌ **NEVER use default blue browser link styling**. All links must be explicitly styled as `.btn-cta-*` or `.btn-cta-link` with Copernicus italics.
4. ❌ **NEVER use dark mode or pure white `#ffffff` page backgrounds**. The entire platform exists on Blush Paper (`#f1e9e7`).
5. ❌ **NEVER introduce arbitrary accent colors** (e.g. bright purple, electric cyan, green pills). Stick strictly to Carbon Ink `#000000` and Signal Blue `#0058fe`.
6. ❌ **NEVER omit optional chaining or numerical defaults on data fields**. All numeric displays must safely use `(value ?? 0).toLocaleString()` to prevent undefined crashes.

---

## 10. Boilerplate Starter Template for New Pages

When creating a new page (e.g., `StateDetailPage.tsx`, `ClaimsPortal.tsx`), use this structural foundation:

```tsx
import React from 'react';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const NewBhoomiPage: React.FC = () => {
  return (
    <div className="landing-page-root">
      {/* Page Header */}
      <section style={{ padding: '48px 24px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="hero-eyebrow">
            <span className="hero-meta">Ministry of Rural Development</span>
          </div>
          
          <h1 className="hero-headline" style={{ fontSize: '42px', marginBottom: '16px' }}>
            New Statutory Subsystem
          </h1>
          
          <p className="hero-subtext" style={{ maxWidth: '680px', margin: '0 auto 24px' }}>
            Formal administrative overview and ledger interface conforming to RFCTLARR 2013 protocols.
          </p>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* Main Content Body */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Your Page Components Here */}
      </section>
    </div>
  );
};

export default NewBhoomiPage;
```

---
*BhoomiNexus Sovereign Design Standard &bull; Maintained for Ministry of Rural Development &bull; DoLR*
