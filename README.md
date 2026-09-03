# BhoomiNexus — National Land Acquisition & Management System

Unified spatial and workflow framework designed for the **Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement (RFCTLARR) Act, 2013**.

---

## ⚡ Quick Start: Running the Project Locally

Follow these exact steps to clone, install, and run the project on your machine.

### Prerequisites

Ensure you have installed:
- **Node.js**: `v20.x` or higher (tested on Node `v24.x`)
- **npm**: `v10.x` or higher
- **Git**

Verify your environment:
```bash
node -v
npm -v
git --version
```

---

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BhoomiNexus
```

If you already have the repository cloned, pull the latest updates:
```bash
git checkout main
git pull origin main
```

---

### 2. Frontend Setup & Execution

Navigate to the `Frontend` directory, install all required dependencies, and launch the development server:

```bash
# 1. Navigate to Frontend
cd Frontend

# 2. Install all dependencies
npm install

# 3. Verify TypeScript build and linting
npm run lint
npm run build

# 4. Start the Vite local development server
npm run dev
```

Once running, the terminal will output the local URL:
```text
  VITE v8.2.2  ready in 250 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open **`http://localhost:5173/`** in your browser to view the application.

---

## 🧭 Application Routes & Demo Roles

| URL Path | Access Tier | Description |
| :--- | :--- | :--- |
| `/` | Public | Citizen portal & project information landing |
| `/login` | Public | Government Officer login portal |
| `/dashboard` | Authenticated | Multi-role workspace dashboard |
| `/dashboard/admin` | Role: `ADMIN` | System administration & RBAC settings |

> 💡 **Development Tip**: The authenticated government layout includes an interactive **Dev Role Switcher** on the sidebar to test permissions for:
> - `REQUESTING_AUTHORITY` (RA)
> - `BOSS` (Section Supervisor)
> - `PROCESSING_OFFICER` (Field Officer)
> - `ADMIN` (System Administrator)

---

## 🛑 Contribution & Git Policy

> ⚠️ **CRITICAL INSTRUCTIONS FOR ALL DEVELOPERS:**
>
> 1. **DO NOT commit directly to `main`**:
>    Always create a dedicated feature or personal branch (`git checkout -b feature/your-feature-name`).
> 2. **ALWAYS update this `README.md`**:
>    If you add new packages, modify terminal commands, add environment variables, or change launch procedures, you **must update this README** in your PR so anyone pulling or cloning can launch without issues.

For the complete step-by-step Git branching, commit convention, and PR guide, please read:
👉 **[GIT_INSTRUCTIONS.md](./GIT_INSTRUCTIONS.md)**

---

## 📦 Tech Stack (Phase 0 Foundation)

- **UI Framework**: React 19 + TypeScript + Vite
- **Routing**: React Router DOM v7
- **Server State**: TanStack Query v5
- **Forms & Validation**: React Hook Form + Zod v4
- **Spatial & Maps**: Leaflet
- **HTTP Client**: Axios (with Bearer interceptors & error abstraction)
- **Linter**: Oxlint
