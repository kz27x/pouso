"""Pouso — montagem.
   python build.py  →  dist/pouso-prototipo.html  (protótipo de um arquivo só, dados de exemplo)
                       dist/extensao/              (extensão MV3 para carregar no Chrome/Edge)
"""
import pathlib, shutil, re, json

ROOT = pathlib.Path(__file__).parent
SRC, STATIC, FONTS, DIST = ROOT / 'src', ROOT / 'ext-static', ROOT / 'fonts', ROOT / 'dist'
JS = ['platform.js', 'i18n.js', 'palette.js', 'shaders.js', 'renderer.js', 'ui.js', 'temas.js', 'quick.js', 'app.js']
GOOGLE = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
          '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Geist:wght@300..700'
          '&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap">')

def read(name): return (SRC / name).read_text(encoding='utf-8')

def strip_glsl(js):
    """Encolhe o GLSL dos papéis de parede (espaços e quebras). Não ofusca: só minifica."""
    def squash(m):
        body = m.group(1)
        lines = []
        for ln in body.split('\n'):
            ln = ln.strip()
            if not ln: continue
            lines.append(ln if ln.startswith('#') else re.sub(r'\s+', ' ', ln))
        out, buf = [], []
        for ln in lines:
            if ln.startswith('#'):
                if buf: out.append(' '.join(buf)); buf = []
                out.append(ln)
            else: buf.append(ln)
        if buf: out.append(' '.join(buf))
        return '`' + '\n'.join(out) + '`'
    return re.sub(r'`([^`]*?(?:gl_FragColor|precision|vec3 col|float )[^`]*?)`', squash, js, flags=re.S)

def prototype():
    html = read('index.html')
    css = read('style.css')
    js = '\n'.join(read(f) for f in ['boot.js'] + JS)
    html = (html.replace('<!--FONTS-->', GOOGLE).replace('<!--CSS-->', '<style>\n' + css + '\n</style>')
                .replace('<!--BOOT-->', '').replace('<!--JS-->', '<script>\n' + js + '\n</script>')
                .replace('__TITLE__', 'Pouso — protótipo'))
    (DIST / 'pouso-prototipo.html').write_text(html, encoding='utf-8')
    return len(html)

def extension():
    out = DIST / 'extensao'
    if out.exists(): shutil.rmtree(out)
    shutil.copytree(STATIC, out)
    html = read('index.html')
    html = (html.replace('<!--FONTS-->', '<link rel="stylesheet" href="fonts.css">')
                .replace('<!--CSS-->', '<link rel="stylesheet" href="style.css">')
                .replace('<!--BOOT-->', '<script src="boot.js"></script>')
                .replace('<!--JS-->', '\n'.join(f'<script src="{f}"></script>' for f in JS))
                .replace('__TITLE__', 'Pouso'))
    (out / 'newtab.html').write_text(html, encoding='utf-8')
    for f in JS + ['boot.js', 'popup.js', 'popup.html', 'background.js', 'style.css', 'fonts.css']:
        txt = read(f)
        if f == 'shaders.js': txt = strip_glsl(txt)
        (out / f).write_text(txt, encoding='utf-8')
    (out / 'fonts').mkdir(exist_ok=True)
    missing = []
    for f in ['archivo.woff2', 'newsreader.woff2', 'newsreader-italic.woff2', 'geist.woff2']:
        if (FONTS / f).exists(): shutil.copy(FONTS / f, out / 'fonts' / f)
        else: missing.append(f)
    json.loads((out / 'manifest.json').read_text(encoding='utf-8'))
    size = sum(p.stat().st_size for p in out.rglob('*') if p.is_file())
    return size, missing

if __name__ == '__main__':
    DIST.mkdir(exist_ok=True)
    print('protótipo:', prototype() // 1024, 'KB')
    size, missing = extension()
    print('extensão:', size // 1024, 'KB', '| fontes faltando:', missing or 'nenhuma')
