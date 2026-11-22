"""Gera os blocos promocionais da loja (440x280 e 1400x560) em dist/."""
import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        for k, (w, h) in {'small': (440, 280), 'marquee': (1400, 560)}.items():
            for l in ['pt', 'en']:
                pg = await b.new_page(viewport={'width': w, 'height': h})
                await pg.goto((ROOT / 'temas').as_uri() + f'/promo.html?k={k}&l={l}'); await pg.wait_for_timeout(900)
                await pg.screenshot(path=str(ROOT / 'dist' / f'promo-{k}-{l}.png')); await pg.close()
        await b.close()
asyncio.run(main())
