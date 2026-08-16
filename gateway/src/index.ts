/**
 * AGU_app ゲートウェイ Worker
 *
 * ポータルと各アプリ(Cloudflare Pages / Workers に個別デプロイ済み)を
 * すべて同一オリジン(このWorkerに割り当てたカスタムドメイン)の下に
 * パスプレフィックスで束ねるリバースプロキシ。
 *
 * これが必要な理由: iOSの「ホーム画面に追加」(standalone表示)は、
 * オリジン(スキーム+ホスト+ポート)が変わるナビゲーションでSafariの
 * ブラウザUI(アドレスバー等)を再表示してしまう。ポータルと各アプリが
 * *.pages.dev / *.workers.dev の別オリジンに分かれていたため、
 * 「← ポータル」やアプリカードのタップのたびにヘッダーが出ていた。
 * 全部を1つのドメイン配下のパスにすることで解消する。
 *
 * ルーティング方式は2種類:
 *   - STATIC_ROUTES: 静的サイト/Viteアプリ(Cloudflare Pages)。
 *     アプリ自体は `base: './'` などの相対パスでビルドされているだけで、
 *     プレフィックス自体は知らない。ここでプレフィックスを剥がしてから
 *     元のPagesオリジンへ転送する。
 *   - PREFIXED_ROUTES: Next.js(Cloudflare Workers / OpenNext)。
 *     アプリ自体が next.config.ts の `basePath` でプレフィックスを
 *     知った上でビルドされている(HTML内の /_next/... や fetch("/api/...")
 *     が全部プレフィックス付きで生成される)。ここではパスを一切
 *     書き換えず、そのまま元のWorkerオリジンへ転送するだけでよい。
 */

interface Env {}

const STATIC_ROUTES: Record<string, string> = {
  tokei: 'agu-tokei.pages.dev',
  stopwatch: 'agu-stopwatch.pages.dev',
  taskkyoyu: 'agu-taskkyoyu.pages.dev',
  ryouhi: 'agu-ryouhi.pages.dev',
  meal_traker: 'agu-meal-traker.pages.dev',
  label_create: 'agu-label-create.pages.dev',
};

const PREFIXED_ROUTES: Record<string, string> = {
  'tiryou-karte': 'agu-tiryou-karte.aoyamagakuin-shimoda.workers.dev',
  'spm-medical-record': 'agu-spm-medical-record.aoyamagakuin-shimoda.workers.dev',
  itonomaki: 'agu-itonomaki.aoyamagakuin-shimoda.workers.dev',
};

const PORTAL_ORIGIN = 'agu-portal.pages.dev';

function firstSegment(pathname: string): string {
  const idx = pathname.indexOf('/', 1);
  return idx === -1 ? pathname.slice(1) : pathname.slice(1, idx);
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    const seg = firstSegment(url.pathname);

    let targetHost: string;
    let targetPath: string;
    let prefix = '';

    if (seg && STATIC_ROUTES[seg]) {
      targetHost = STATIC_ROUTES[seg];
      prefix = `/${seg}`;
      targetPath = url.pathname.slice(prefix.length) || '/';
    } else if (seg && PREFIXED_ROUTES[seg]) {
      targetHost = PREFIXED_ROUTES[seg];
      targetPath = url.pathname;
    } else {
      targetHost = PORTAL_ORIGIN;
      targetPath = url.pathname;
    }

    const targetUrl = new URL(targetPath + url.search, `https://${targetHost}`);

    const proxyRequest = new Request(targetUrl, request);
    proxyRequest.headers.set('Host', targetHost);
    // 元アプリ側で使うことがある(itonomakiのBasic Auth痕跡など)ため、
    // 実際にアクセスしてきたホスト名も別ヘッダーで伝える
    proxyRequest.headers.set('X-Forwarded-Host', url.hostname);

    const originResponse = await fetch(proxyRequest, { redirect: 'manual' });

    // オリジンがルート相対のLocationでリダイレクトしてきた場合、
    // プレフィックスを剥がして転送している静的サイト系だけ付け直す
    if (
      prefix &&
      originResponse.status >= 300 &&
      originResponse.status < 400 &&
      originResponse.headers.has('location')
    ) {
      const location = originResponse.headers.get('location')!;
      if (location.startsWith('/') && !location.startsWith('//')) {
        const headers = new Headers(originResponse.headers);
        headers.set('location', prefix + location);
        return new Response(originResponse.body, {
          status: originResponse.status,
          statusText: originResponse.statusText,
          headers,
        });
      }
    }

    return originResponse;
  },
};
