# Git Workflow & Contribution Guidelines

> **Project:** BhoomiNexus — National Land Acquisition & Management System  
> **Target Audience:** All Collaborators, Developers & Contributors

---

## 🚨 The Golden Rules

### 1. NEVER Commit Directly to `main`
* The `main` branch is protected and represents production-ready, stable code.
* **Always create a dedicated feature or personal branch** before writing or committing code.
* Direct pushes to `main` are strictly forbidden. All merges into `main` must happen through reviewed and verified Pull Requests (PRs).

### 2. ALWAYS Update `README.md`
Whenever you add a new package, service, route, environment variable, or startup step:
* **Update `README.md` immediately** in the same commit or PR.
* Ensure anyone cloning or pulling the repository has **exact, copy-pasteable terminal commands** to successfully install, configure, and launch the application without asking for help.

---

## 🌿 Branch Naming Convention

Always create descriptive branches prefixed with the scope of work:

| Branch Prefix | Usage | Example |
| :--- | :--- | :--- |
| `feature/` | New functionality or module | `feature/phase0-frontend-scaffolding` |
| `fix/` | Bug fixes or issue resolutions | `fix/auth-token-expiration` |
| `chore/` | Tooling, dependencies, configs | `chore/update-oxlint-rules` |
| `docs/` | Documentation or README changes | `docs/add-setup-instructions` |
| `dev/<username>/` | Developer sandbox / WIP branch | `dev/raj/gis-cadastral-map` |

---

## 🛠️ Step-by-Step Daily Workflow

### Step 1: Sync Your Local Repository
Before starting any new work, ensure your local `main` branch has the latest updates:

```bash
# Switch to main
git checkout main

# Pull latest changes from remote
git pull origin main
```

---

### Step 2: Create Your Dedicated Branch
Create and switch to your new dedicated branch:

```bash
# Example for a feature branch
git checkout -b feature/phase0-auth-guards

# OR example for personal work branch
git checkout -b dev/yourname/my-feature
```

Verify you are on your dedicated branch:
```bash
git branch
```

---

### Step 3: Make Your Code Changes
Work on your assigned task. If you install dependencies or modify setup steps:
* Update `package.json` / dependencies.
* **Update `README.md`** with any new command or requirement.

---

### Step 4: Pre-Commit Verification
Before staging and committing, verify that your code compiles and passes linters:

```bash
# Navigate to the relevant directory (e.g., Frontend)
cd Frontend

# 1. Run linter
npm run lint

# 2. Run TypeScript build verification
npm run build
```

> ⚠️ **Never commit broken code or build failures to remote.**

---

### Step 5: Check Git Status & Stage Files
Review what files were modified, created, or deleted:

```bash
# Inspect changed files
git status

# Inspect code diffs
git diff

# Stage specific files (recommended over blind 'git add .')
git add src/layouts/PublicLayout.tsx README.md

# Or stage all tracked changes
git add -u
```

> 🛑 **Check for secrets**: Never stage `.env`, private keys, certificates, or local temporary files!

---

### Step 6: Commit Your Changes
Write clear, meaningful commit messages using the Conventional Commits format:

```bash
# Format: <type>(<scope>): <concise description>

# Examples:
git commit -m "feat(frontend): add public and government layouts with auth guards"
git commit -m "docs(readme): document frontend install and dev server run commands"
git commit -m "fix(auth): handle 401 token expiration redirect"
```

Common types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation updates (README, guides)
- `refactor`: Code refactoring without changing functionality
- `style`: Formatting, missing semi-colons, whitespace
- `chore`: Dependency updates, build configs

---

### Step 7: Push Your Dedicated Branch
Push your branch to GitHub / remote repository:

```bash
# First push of a new branch (sets upstream tracking)
git push -u origin feature/your-branch-name

# Subsequent pushes on the same branch
git push
```

---

### Step 8: Open a Pull Request (PR)
1. Go to the repository on GitHub/GitLab.
2. You will see a banner: *"feature/your-branch-name had recent pushes — Compare & pull request"*.
3. Click **Create Pull Request**:
   - **Base:** `main`
   - **Compare:** `feature/your-branch-name`
4. Fill in the PR description:
   - What changes were made.
   - How you verified them (`npm run lint`, `npm run build`).
   - Confirm that `README.md` was updated (if instructions or dependencies changed).
5. Request review from teammates or merge once checks pass.

---

## 📋 Pre-Commit & PR Checklist

Before creating a commit or submitting a PR, verify each item:

- [ ] I am **NOT** on the `main` branch (`git branch` confirms my dedicated branch).
- [ ] Code compiles with zero TypeScript errors (`npm run build`).
- [ ] Code passes linter with zero errors (`npm run lint`).
- [ ] `README.md` is updated with any new terminal commands, packages, or config instructions.
- [ ] No secrets, credentials, API keys, or `.env` files are being committed.
- [ ] Commit message is concise, clear, and informative.

---

## 🆘 Troubleshooting Common Mistakes

### "I accidentally committed directly to `main` locally (not pushed yet)!"
Do not panic. You can move your commits to a new branch without losing work:

```bash
# 1. Create a new branch with your current commits
git branch feature/my-saved-work

# 2. Reset local main back to match remote origin/main
git reset --hard origin/main

# 3. Switch to your new branch
git checkout feature/my-saved-work

# Now your work is safe on the dedicated branch!
```

---

### "My branch is out of date with `main`"
Bring in the latest changes from `main` cleanly:

```bash
# Fetch latest updates from remote
git fetch origin

# Rebase your branch onto updated main
git rebase origin/main

# If there are conflicts, resolve them, then:
git add <resolved-files>
git rebase --continue
```

---

### "I have uncommitted changes but need to switch branches"
Stash your changes temporarily:

```bash
# Save your working changes
git stash save "WIP: auth layout updates"

# Switch branches safely
git checkout other-branch

# When back on your branch, restore your work:
git checkout feature/my-branch
git stash pop
```
