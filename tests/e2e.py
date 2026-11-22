"""Carrega a extensão montada (dist/extensao) num Chromium e confere a nova aba.
   python build.py && python tests/e2e.py"""
import asyncio, pathlib, shutil, tempfile
from playwright.async_api import async_playwright
EXT = str(pathlib.Path(__file__).resolve().parent.parent / 'dist' / 'extensao')
async def main():
    prof = tempfile.mkdtemp()
    errors = []
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(prof, headless=False, viewport={'width': 1280, 'height': 800},
            args=['--headless=new', f'--disable-extensions-except={EXT}', f'--load-extension={EXT}'])
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.goto('chrome://newtab/'); await pg.wait_for_timeout(1500)
        assert 'newtab.html' in pg.url, 'a nova aba não é a do Pouso'
        await pg.click('[data-ob=skip]'); await pg.wait_for_timeout(800)
        for ed in ['meia-noite', 'atelie', 'vigilia', 'farol']:
            await pg.evaluate(f"Pouso.act('edition', '{ed}')"); await pg.wait_for_timeout(500)
        for lay in ['centro', 'canto', 'coluna']:
            await pg.evaluate(f"Pouso.act('layout', '{lay}')"); await pg.wait_for_timeout(300)
        await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(400)
        assert await pg.is_visible('#palette'), 'a busca rápida não abriu'
        sleep = await sw.evaluate("chrome.storage.local.get('sleep').then(r => r.sleep)")
        assert sleep and sleep['on'], 'configuração de dormir abas não chegou ao segundo plano'
        await ctx.close()
    shutil.rmtree(prof, ignore_errors=True)
    assert not errors, errors
    print('ok: nova aba, edições, disposições, busca rápida e dormir abas')
asyncio.run(main())
