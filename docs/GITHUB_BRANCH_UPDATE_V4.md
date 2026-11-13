# Applying v4 to an existing local GitHub branch

You already have a branch and Git history. **Do not run `git init`, reset, force-push, or recreate a repository.**

1. Save/commit your existing local changes first and create a backup of the cloned repo.
2. Extract the v4 full-stack ZIP to a **separate temporary folder** (not inside the Git checkout).
3. Compare the contents and copy the `frontend/`, `backend/`, `scripts/`, `docs/`, `architecture/`, `.github/workflows/ci.yml`, `.gitignore` and `README.md` into your existing checkout. Keep your actual `backend/.env`, `frontend/.env`, venv, node_modules and local PostgreSQL database unchanged.
4. On your existing branch run:

```bash
git status
git diff --stat
git diff --check
git add frontend backend scripts docs architecture .github/workflows/ci.yml .gitignore README.md
git commit -m "Add PostgreSQL 18 E2E setup and schema verification"
git push origin HEAD
```

Commands are identical in Windows PowerShell, Git Bash and macOS Terminal (assuming Git is installed).

The full-stack `.github/workflows/ci.yml` runs Python tests, a frontend build, and a PostgreSQL 18 migration+synthetic-API smoke test. It does **not deploy or access your local PostgreSQL instance**. You must run Alembic locally to create your own tables. GitHub Actions triggers on pushes to any branch, pull requests to `main`, and manual dispatch.

If your branch already has custom frontend/backend changes, do **not** blindly overwrite them—compare and merge the updated files. The provided ZIP is a standalone updated source tree based on v3, not an automatic patch of your local working copy.
