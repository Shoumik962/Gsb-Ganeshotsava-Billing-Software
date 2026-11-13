# GitHub repository and CI/CD handover

This project uses **GitHub**, **not GitLab**. The full-stack ZIP is a GitHub-ready monorepo with a `frontend/` React/Vite application, a `backend/` Python/FastAPI service, shared deployment documentation and `.github/workflows/ci.yml`.

## GitHub Actions: what runs

- **Backend tests:** Ubuntu runner + Python 3.11, install `backend/requirements-dev.txt` (which includes the shared cross-platform `requirements.txt`), `python -m pip check`, `python -m pytest -q`.
- **Frontend build:** Ubuntu runner + Node.js 22, `npm ci`, `npm run build`, upload `frontend/dist/` as an Actions artifact for 7 days.
- Runs on pushes and pull requests targeting `main`; also supports a manual run under **Actions > Ganeshotsav CI > Run workflow**.
- **CI is not deployment**. No AWS service, PostgreSQL production DB or Razorpay account is accessed by this CI workflow. Environment setup and actual Razorpay Test Mode checkout are separate steps.
- Choose **Settings > Branches > Add branch protection rule** (or repository rulesets) for `main` and require successful `backend-tests` and `frontend-build` checks. The exact GitHub UI may vary.

## Option A (recommended): one GitHub repository, separate backend/frontend folders

First create a **new empty** private GitHub repository under your account/organization. Keep the existing layout, and run the following from the extracted full-stack ZIP root.

### Windows PowerShell

```powershell
git init
git branch -M main
git add .
git commit -m "Initialize Ganeshotsav project"
git remote add origin https://github.com/YOUR_USER_OR_ORG/YOUR_REPO.git
git push -u origin main
```

### macOS Terminal (Bash/zsh)

```bash
git init
git branch -M main
git add .
git commit -m "Initialize Ganeshotsav project"
git remote add origin https://github.com/YOUR_USER_OR_ORG/YOUR_REPO.git
git push -u origin main
```

If you already cloned an existing repo, **do not reinitialize Git**. Copy/update files into the clone, make a feature branch, commit, push and create a Pull Request. If the remote repo already has an initial commit (e.g. README), **clone it first** instead of force-pushing an unrelated history.

For an existing clone, on both operating systems:

```bash
git checkout -b feature/dedup-sevadar
git status
git add .
git commit -m "Add backend API, PostgreSQL dedup, sevadar GPS and test receipts"
git push -u origin feature/dedup-sevadar
```

Open the Pull Request on GitHub. Branch protections and Actions status checks can be required before merge.

## Option B: two separate repositories

You can instead publish the **backend-only** and **frontend-only** ZIPs to two separate private GitHub repositories. Each contains a workflow for its own component. This allows independent releases but requires management of CORS, API URL, deployed versions and shared contract changes across two repos. The ZIPs preserve the `backend/` or `frontend/` top-level folders, so the workflows and setup paths work unchanged.

- Backend repo: `backend/`, `scripts/`, `.github/workflows/ci.yml`.
- Frontend repo: `frontend/`, `.github/workflows/ci.yml`.

## GitHub authentication (Windows & macOS)

**HTTPS:** Use Git Credential Manager or a personal access token when prompted; a GitHub account password is not accepted for Git over HTTPS. Do **not** put the token in your remote URL or commit it.

**SSH:** If your SSH public key has been added to GitHub, use an SSH remote:

```bash
git remote set-url origin git@github.com:YOUR_USER_OR_ORG/YOUR_REPO.git
git remote -v
git push -u origin main
```

On Windows, run those commands in PowerShell or Git Bash; on macOS, use Terminal. Replace placeholders with your real GitHub path.

## Developer environments remain independent

- **Windows:** `powershell -ExecutionPolicy Bypass -File .\scripts\setup-backend.ps1`
- **macOS:** `bash scripts/setup-backend.sh`
- Both create a local `backend/.venv` and install the **same** portable requirements, with Python 3.11 recommended. Each developer creates their own `backend/.env` and uses a separate development PostgreSQL database.
- For Razorpay use `RAZORPAY_MODE=test` with `rzp_test_...` credentials and review `docs/DEVELOPER_SETUP_AND_RAZORPAY_TESTING.md` for zero-real-money test receipts. Keep keys in local `.env`/protected deployment secrets, never in GitHub or React.

## Before any real deployment

CI is a validation baseline only; frontend installation/build had not completed in the previous packaging environment. Validate a GitHub Actions green build, test PostgreSQL migrations on a dedicated Postgres environment, complete sandbox Razorpay capture end-to-end, verify security/consent and obtain Trust sign-off. For deployments later, create separate protected GitHub **Environments** and use short-lived AWS OIDC role assumption rather than hard-coded long-lived AWS keys. No deployment workflow is bundled because AWS account details, target services and release controls have not been specified.
