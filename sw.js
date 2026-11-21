/* 小家 · Service Worker
   作用：①让浏览器把它当"可安装应用"(配合 manifest) ②离线秒开 ③给每个请求自动补 sharecode */
const SC=(self.location.search.match(/[?&]sharecode=([^&]+)/)||[])[1]||"";
const Q=SC?("?sharecode="+SC):"";
const CACHE="xiaojia-oss-v2";
const CORE=[
  "./"+Q,
  "manifest.webmanifest"+Q,
  "icon.png"+Q,
  "home.jpg"+Q,
  "gpt_bust2.webp"+Q,
  "claude_bust2.webp"+Q,
  "deepseek_bust2.webp"+Q
];

self.addEventListener("install",e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",e=>{
  let req=e.request;   /* 下面要补 sharecode 换对象，必须是 let */
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  // 同源资源才管；第三方(API)不碰
  if(url.origin!==self.location.origin)return;

  // 没有 sharecode 的设备，自动补上（manifest 图标、页面里漏拼的图都靠这条兜底）
  if(SC&&!url.searchParams.has("sharecode")){
    url.searchParams.set("sharecode",SC);
    req=new Request(url,req);
  }

  // 导航(点桌面图标打开页面)：先联网拿新版，断网才用缓存 —— 保证版本更新不被缓存卡住
  if(req.mode==="navigate"){
    e.respondWith(
      fetch(req).then(resp=>{
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put("./"+Q,copy)).catch(()=>{});
        return resp;
      }).catch(()=>caches.match("./"+Q).then(r=>r||Response.error()))
    );
    return;
  }

  // 其它静态资源：缓存优先，后台顺手更新
  e.respondWith(
    caches.match(req).then(hit=>{
      const net=fetch(req).then(resp=>{
        if(resp&&resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}
        return resp;
      }).catch(()=>hit);
      return hit||net;
    })
  );
});
