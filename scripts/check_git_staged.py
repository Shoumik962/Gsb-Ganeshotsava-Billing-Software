"""Reject obvious developer-local/sensitive files staged for GitHub.

Run from any working directory: python scripts/check_git_staged.py
Uses Python standard library only, works on Windows/macOS/Linux.
This does not inspect the content of files or detect every possible secret.
"""
from pathlib import PurePosixPath
import re
import subprocess
import sys

DANGEROUS_PARTS = {
    '.venv', 'venv', 'node_modules', '__pycache__', '.pytest_cache',
    '.mypy_cache', '.ruff_cache', '.idea', '.vscode', 'dist',
    'uploads', 'receipts', 'exports', 'backups', 'generated', 'logs',
    'local_data', 'qa-output', 'test-output', 'test-results',
    'playwright-report', 'secrets',
}
DANGEROUS_NAMES = {
    '.env', '.env.local', '.env.development', '.env.production',
    '.npmrc', 'credentials.json', 'secrets.json', '.coverage',
}
DANGEROUS_SUFFIXES = (
    '.pem', '.key', '.p12', '.pfx', '.p8', '.jks', '.keystore',
    '.sqlite', '.sqlite3', '.db', '.db3', '.dump', '.backup', '.pgdump',
    '.zip', '.7z', '.tar.gz', '.sql.gz', '.log', '.pyc',
    '.csv', '.tsv', '.xls', '.xlsx', '.parquet', '.jsonl', '.ndjson',
)


def bad_path(raw):
    path = PurePosixPath(raw.replace('\\', '/'))
    parts = {part.lower() for part in path.parts}
    name = path.name.lower()
    if parts & DANGEROUS_PARTS:
        return True
    if name in DANGEROUS_NAMES or (name.startswith('.env.') and name not in ('.env.example', '.env.sample', '.env.template')):
        return True
    if name.startswith('service-account') and name.endswith('.json'):
        return True
    if name.endswith(DANGEROUS_SUFFIXES) or re.search(r'\.coverage\.', name):
        return True
    return False


def main():
    mode = '--tracked' if '--tracked' in sys.argv[1:] else '--staged'
    command = ['git', 'ls-files', '-z'] if mode == '--tracked' else ['git', 'diff', '--cached', '--name-only', '-z']
    proc = subprocess.run(command, capture_output=True, check=False)
    if proc.returncode:
        print('Could not inspect Git files. Run inside the Git repository.', file=sys.stderr)
        return 2
    filenames = [b.decode('utf-8', errors='replace') for b in proc.stdout.split(b'\x00') if b]
    blocked = [path for path in filenames if bad_path(path)]
    if blocked:
        print(f'STOP: sensitive/local/generated files are {mode[2:]}:')
        for path in blocked:
            print('  -', path)
        print('Unstage with: git rm --cached -- <path> (keeps local copy).')
        return 1
    print(f'PASS: {len(filenames)} {mode[2:]} files checked for forbidden local paths.')
    print('Also review diffs; secrets hidden in source content are NOT detected.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
