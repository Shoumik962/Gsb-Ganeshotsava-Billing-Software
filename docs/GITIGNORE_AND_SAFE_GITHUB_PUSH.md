# GitHub: safe staging and clean repository (Version 5)

The root `.gitignore` excludes developer-local files on **both Windows and macOS**: Python `.venv`, `__pycache__`, pytest cache, frontend `node_modules` and `dist`, `.env` secrets, logs, DB/pgAdmin exports, local SQLite, generated receipts, personal IDE state and archives.

**Keep in Git:** the React and FastAPI source, migration `0003_admin_portal`, `requirements.txt` and `requirements-dev.txt`, `frontend/package-lock.json`, `.env.example` templates, GitHub Actions workflows, documentation and `backend/app/sevas.json` (the original **27 seva definitions**). These files are needed for reproducible setup. `backend/app/seed_sevas.py` and `seed_demo_users.py` are *source scripts*, not real users; running them generates rows only inside your own local database. The optional ₹101 dummy seva is added only when you explicitly use `--demo`, and demo receipts remain marked `DEMO-RCP-`.

Do **not** commit actual devotees, passwords, QA user credentials, receipts, GPS traces or local database exports, even as example CSV/JSON files. Place local outputs under `qa-output/`, `exports/`, `uploads/` or `local_data/`; these directories are ignored. Never commit a PostgreSQL data directory or a backup to GitHub.

## From your existing local GitHub branch

In **Windows CMD** or **macOS Terminal**, run in the repository root:

```bash
git branch --show-current
git status --short
git add .gitignore backend/ frontend/ scripts/ docs/ architecture/ .github/ README.md
git diff --cached --name-only
python scripts/check_git_staged.py
```

Review the staged file list before you commit. If it includes `.env`, `.venv`, `node_modules`, dumps, receipts, credentials or real customer data, STOP. `.gitignore` **does not untrack a file already committed or staged**. To untrack it without deleting your local copy, use:

```bash
git rm --cached -- path/to/accidentally-tracked-file
# Or for an already-tracked dependency directory:
git rm -r --cached -- frontend/node_modules
```

Then re-check `git diff --cached --name-only` and `python scripts/check_git_staged.py`. If actual secrets were ever pushed to a remote, **rotate them**; removing files in a new commit does not remove them from Git history.

Commit after backend tests, migration verification, frontend build and browser flow pass:

```bash
git diff --check
git commit -m "Admin seva portal, devotee signup and secure test booking"
git push origin HEAD
```

`python scripts/check_git_staged.py` is a **best-effort file-path guard**, not a comprehensive secret scanner. Always review diffs manually and configure GitHub secret scanning when available.
