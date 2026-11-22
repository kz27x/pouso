"""Gera as capturas da loja (foto-*.png) e os fundos (fundo-*.jpg) dos 12 temas.
   Antes: node temas/cores.js  e  python build.py"""
import asyncio, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
T = ROOT / 'temas'
cores = json.load(open(T / 'cores.json'))
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        for mode in ['foto', 'bg']:
            pg = await b.new_page(viewport={'width': 1920 if mode == 'bg' else 1280, 'height': 1080 if mode == 'bg' else 800})
            for c in cores:
                await pg.goto(T.as_uri() + '/vitrine.html?id=' + c['id'] + ('&bg=1' if mode == 'bg' else ''))
                await pg.wait_for_timeout(900)
                if mode == 'bg': await pg.screenshot(path=str(T / f"fundo-{c['id']}.jpg"), type='jpeg', quality=86)
                else: await pg.screenshot(path=str(T / f"foto-{c['id']}.png"))
            await pg.close()
        await b.close()
asyncio.run(main())
