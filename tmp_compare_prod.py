import re
import urllib.request
from pathlib import Path

def norm(html: str) -> str:
    return re.sub(r"\r\n?", "\n", html).strip()

remote = urllib.request.urlopen('https://www.careersourcer.co.ke/atlas').read().decode('utf-8', errors='replace')
remote_norm = norm(remote)
local = Path('dist/index.html').read_text(encoding='utf-8')
local_norm = norm(local)
print('REMOTE_LEN', len(remote_norm))
print('LOCAL_LEN', len(local_norm))
print('SAME' if remote_norm == local_norm else 'DIFFERENT')
print('REMOTE_HAS_ROOT', '<div id="root"></div>' in remote_norm)
print('REMOTE_HAS_APP_SHELL', '<script type="module" crossorigin src="/assets/index-P6r9eQap.js"></script>' in remote_norm)
print('REMOTE_TITLE', 'CareerSourcer - Build your future' in remote_norm)
print('REMOTE_CANONICAL', 'https://careersourcer.lovable.app/' in remote_norm)
print('REMOTE_SCRIPT', '/src/main.tsx' in remote_norm)
print('DIFF_LINES', len(list(re.findall('^.*$', remote_norm, re.MULTILINE))))
print('\n=== DIFF HEAD ===')
for line in list(re.match(re.compile('.*', re.MULTILINE), '').group(0)): pass

diff = []
try:
    import difflib
    diff = list(difflib.unified_diff(local_norm.split('\n'), remote_norm.split('\n'), n=3))
    print('TOTAL_UNIFIED_DIFF_LINES', len(diff))
    for line in diff[:80]:
        print(line)
except Exception as exc:
    print('DIFF_ERROR', exc)

print('\n=== REMOTE FIRST 40 LINES ===')
for line in remote_norm.split('\n')[:40]:
    print(line)
print('\n=== LOCAL FIRST 40 LINES ===')
for line in local_norm.split('\n')[:40]:
    print(line)
