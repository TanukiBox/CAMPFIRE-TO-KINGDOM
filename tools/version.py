# 公開前に実行する：index.html のファイル読み込みに版番号を付け、ブラウザに古いファイルを使わせない
#   py tools/version.py
import glob, os, re, time

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = time.strftime('%Y%m%d%H%M%S')
mods = sorted(os.path.relpath(p, root).replace(os.sep, '/') for p in glob.glob(os.path.join(root, 'js', '**', '*.js'), recursive=True))
imports = ',\n'.join(f'    "./{m}": "./{m}?v={v}"' for m in mods)
block = '<script type="importmap">\n{\n  "imports": {\n' + imports + '\n  }\n}\n</script>'
path = os.path.join(root, 'index.html')
html = open(path, encoding='utf-8').read()
if '<script type="importmap">' in html:
    html = re.sub(r'<script type="importmap">.*?</script>', lambda m: block, html, flags=re.S)
else:
    html = html.replace('<script type="module"', block + '\n<script type="module"', 1)
html = re.sub(r'css/style\.css\?v=\w+', f'css/style.css?v={v}', html)
html = re.sub(r'js/main\.js\?v=\w+', f'js/main.js?v={v}', html)
open(path, 'w', encoding='utf-8', newline='\n').write(html)
print('version', v, len(mods), 'modules')
