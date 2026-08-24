
      let global = globalThis;
      globalThis.global = globalThis;

      if (typeof global.navigator === 'undefined') {
        global.navigator = {
          userAgent: 'edge-runtime',
          language: 'en-US',
          languages: ['en-US'],
        };
      } else {
        if (typeof global.navigator.language === 'undefined') {
          global.navigator.language = 'en-US';
        }
        if (!global.navigator.languages || global.navigator.languages.length === 0) {
          global.navigator.languages = [global.navigator.language];
        }
        if (typeof global.navigator.userAgent === 'undefined') {
          global.navigator.userAgent = 'edge-runtime';
        }
      }

      class MessageChannel {
        constructor() {
          this.port1 = new MessagePort();
          this.port2 = new MessagePort();
        }
      }
      class MessagePort {
        constructor() {
          this.onmessage = null;
        }
        postMessage(data) {
          if (this.onmessage) {
            setTimeout(() => this.onmessage({ data }), 0);
          }
        }
      }
      global.MessageChannel = MessageChannel;

      '__MIDDLEWARE_BUNDLE_CODE__'

      function recreateRequest(request, overrides = {}) {
        const cloned = typeof request.clone === 'function' ? request.clone() : request;
        const headers = new Headers(cloned.headers);

        if (overrides.headerPatches) {
          Object.keys(overrides.headerPatches).forEach((key) => {
            const value = overrides.headerPatches[key];
            if (value === null || typeof value === 'undefined') {
              headers.delete(key);
            } else {
              headers.set(key, value);
            }
          });
        }

        if (overrides.headers) {
          const extraHeaders = new Headers(overrides.headers);
          extraHeaders.forEach((value, key) => headers.set(key, value));
        }

        const url = overrides.url || cloned.url;
        const method = overrides.method || cloned.method || 'GET';
        const canHaveBody = method && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD';
        const body = overrides.body !== undefined ? overrides.body : canHaveBody ? cloned.body : undefined;

        // 如果rewrite传入的是完整URL（第三方地址），需要更新host
        if (overrides.url) {
          try {
            const newUrl = new URL(overrides.url, cloned.url);
            // 只有当新URL是绝对路径（包含协议和host）时才更新host
            if (overrides.url.startsWith('http://') || overrides.url.startsWith('https://')) {
              headers.set('host', newUrl.host);
            }
            // 相对路径时保持原有host不变
          } catch (e) {
            // URL解析失败时保持原有host
          }
        }

        const init = {
          method,
          headers,
          redirect: cloned.redirect,
          credentials: cloned.credentials,
          cache: cloned.cache,
          mode: cloned.mode,
          referrer: cloned.referrer,
          referrerPolicy: cloned.referrerPolicy,
          integrity: cloned.integrity,
          keepalive: cloned.keepalive,
          signal: cloned.signal,
        };

        if (canHaveBody && body !== undefined) {
          init.body = body;
        }

        if ('duplex' in cloned) {
          init.duplex = cloned.duplex;
        }

        return new Request(url, init);

      }

      
      async function executeMiddleware(context) {
        return null; // 没有中间件，继续执行后续函数
      }
    

      function usercode(ev, hookCtx) {
        hookCtx = hookCtx || { fetch: globalThis.fetch };
        const { fetch } = hookCtx;
        const globalthis = hookCtx;
        "use strict";
        // ↓ 用户原始代码
        return (async function handleRequest(context) {
          let routeParams = {};
          let pagesFunctionResponse = null;
          let request = context.request;
          const waitUntil = context.waitUntil;
          let urlInfo = new URL(request.url);
          const eo = request.eo || {};


          const normalizePathname = () => {
            if (urlInfo.pathname !== '/' && urlInfo.pathname.endsWith('/')) {
              urlInfo.pathname = urlInfo.pathname.slice(0, -1);
            }
          };

          function getSuffix(pathname = '') {
            // Use a regular expression to extract the file extension from the URL
            const suffix = pathname.match(/\.([^\.]+)$/);
            // If an extension is found, return it, otherwise return an empty string
            return suffix ? '.' + suffix[1] : null;
          }

          normalizePathname();

          let matchedFunc = false;

          
        const runEdgeFunctions = () => {
          
          if(!matchedFunc && /^\/api\/(.+?)$/.test(urlInfo.pathname)) {
            routeParams = {"id":"default","mode":2,"left":"/api/"};
            matchedFunc = true;
            "use strict";
(() => {
  // edge-functions/api/[[default]].js
  var memoryServices = [];
  var memoryCategories = [
    {
      id: "default",
      name: "\u9ED8\u8BA4\u5206\u7C7B (Default)",
      shortName: "\u9ED8\u8BA4",
      description: "\u57FA\u7840\u670D\u52A1\u4E0E\u751F\u4EA7 API \u7AEF\u70B9",
      icon: "server"
    }
  ];
  var memoryIncidents = [];
  var memoryNotifications = [];
  var memorySettings = {
    siteTitle: "FlareStatus",
    siteSubtitle: "Real-time telemetry and edge health across all global locations",
    targetSla: 99.9,
    probeInterval: 2,
    historyRetentionDays: 30
  };
  var memoryProbeResults = [];
  function getKvStore() {
    if (typeof STATUS_KV !== "undefined")
      return STATUS_KV;
    if (typeof my_kv !== "undefined")
      return my_kv;
    if (typeof KV !== "undefined")
      return KV;
    return null;
  }
  function generateCleanHistory(baseLatency) {
    const days = [];
    const now = /* @__PURE__ */ new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1e3);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        status: "operational",
        uptime: 100,
        avgLatency: baseLatency,
        incidentsCount: 0
      });
    }
    return days;
  }
  function generateClean24hLatencies(baseLatency) {
    const points = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const timeStr = new Date(now - i * 60 * 60 * 1e3).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      points.push({
        time: timeStr,
        latency: Math.max(1, baseLatency)
      });
    }
    return points;
  }
  function isAcceptedStatus(statusCode, pattern, fallback = 200) {
    if (!pattern)
      return statusCode === fallback;
    const parts = pattern.split(",").map((p) => p.trim());
    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        if (statusCode >= start && statusCode <= end)
          return true;
      } else if (Number(part) === statusCode) {
        return true;
      }
    }
    return statusCode === fallback;
  }
  async function probeEndpoint(service) {
    if (service.monitorType === "push") {
      const lastPing = service.lastHeartbeatPing ? new Date(service.lastHeartbeatPing).getTime() : 0;
      const intervalMs = (service.heartbeatInterval || 60) * 60 * 1e3;
      const isAlive = lastPing > 0 && Date.now() - lastPing <= intervalMs;
      return {
        status: isAlive ? "operational" : "outage",
        latency: 1,
        statusCode: isAlive ? 200 : 504,
        error: isAlive ? void 0 : "Heartbeat push overdue"
      };
    }
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutMs = (service.timeout || 8) * 1e3;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const headers = {
        "User-Agent": "FlareStatusProber/1.0 (EdgeOne Pages V8 Edge Compute)"
      };
      if (service.headers) {
        service.headers.split("\n").forEach((line) => {
          const idx = line.indexOf(":");
          if (idx > 0) {
            headers[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
          }
        });
      }
      if (service.authMethod === "bearer" && service.bearerToken) {
        headers["Authorization"] = `Bearer ${service.bearerToken}`;
      }
      const res = await fetch(service.url, {
        method: service.method || "GET",
        headers,
        body: service.body && (service.method === "POST" || service.method === "PUT" || service.method === "PATCH") ? service.body : void 0,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      const isStatusOk = isAcceptedStatus(res.status, service.acceptedStatusCodes, service.expectedStatus || 200);
      let isKeywordOk = true;
      if (service.monitorType === "keyword" && service.keywordMatch) {
        const text = await res.text();
        isKeywordOk = text.includes(service.keywordMatch);
      }
      let isHealthy = isStatusOk && isKeywordOk;
      if (service.upsideDown)
        isHealthy = !isHealthy;
      let status = "operational";
      if (!isHealthy) {
        status = "outage";
      } else if (latency > 1500) {
        status = "degraded";
      }
      return {
        status,
        latency,
        statusCode: res.status
      };
    } catch (err) {
      let status = service.upsideDown ? "operational" : "outage";
      return {
        status,
        latency: Date.now() - startTime,
        statusCode: 0,
        error: err?.message || "Connection failed"
      };
    }
  }
  async function getServices() {
    const kv = getKvStore();
    if (kv) {
      try {
        const raw = await kv.get("config:services", "json");
        if (raw && Array.isArray(raw))
          return raw;
      } catch (_e) {
      }
    }
    return memoryServices;
  }
  async function getCategories() {
    const kv = getKvStore();
    if (kv) {
      try {
        const raw = await kv.get("config:categories", "json");
        if (raw && Array.isArray(raw))
          return raw;
      } catch (_e) {
      }
    }
    return memoryCategories;
  }
  async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const kv = getKvStore();
    const corsHeaders = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Cache-Control": "no-store, no-cache, must-revalidate"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (url.pathname === "/api/status" && request.method === "GET") {
      const services = await getServices();
      const categories = await getCategories();
      let latestProbes = memoryProbeResults;
      if (kv) {
        try {
          const raw = await kv.get("latest_probe_results", "json");
          if (raw && Array.isArray(raw))
            latestProbes = raw;
        } catch (_e) {
        }
      }
      let activeIncidents = [];
      let pastIncidents = [];
      if (kv) {
        try {
          const rawInc = await kv.get("config:incidents", "json");
          if (rawInc && Array.isArray(rawInc)) {
            activeIncidents = rawInc.filter((i) => i.status !== "resolved");
            pastIncidents = rawInc.filter((i) => i.status === "resolved");
          }
        } catch (_e) {
        }
      } else {
        activeIncidents = memoryIncidents.filter((i) => i.status !== "resolved");
        pastIncidents = memoryIncidents.filter((i) => i.status === "resolved");
      }
      const liveServices = services.map((svc) => {
        const latest = latestProbes.find((p) => p.id === svc.id);
        const status = latest ? latest.status : svc.enabled ? "operational" : "maintenance";
        const latency = latest ? latest.latency : 18;
        return {
          id: svc.id,
          name: svc.name,
          url: svc.url,
          categoryId: svc.categoryId || "default",
          status,
          currentLatency: latency,
          uptime30d: 100,
          region: svc.region || "Global Anycast",
          description: svc.description,
          monitorType: svc.monitorType,
          history30d: generateCleanHistory(latency),
          latencyHistory24h: generateClean24hLatencies(latency),
          updatedAt: latest?.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        };
      });
      const existingCatIds = new Set(categories.map((c) => c.id));
      const mergedCategories = [...categories];
      for (const s of liveServices) {
        if (s.categoryId && !existingCatIds.has(s.categoryId)) {
          existingCatIds.add(s.categoryId);
          mergedCategories.push({
            id: s.categoryId,
            name: s.categoryId === "default" ? "\u9ED8\u8BA4\u5206\u7C7B (Default)" : s.categoryId,
            shortName: s.categoryId,
            description: "\u57FA\u7840\u670D\u52A1\u4E0E\u751F\u4EA7 API \u7AEF\u70B9",
            icon: "server"
          });
        }
      }
      const hasCritical = liveServices.some((s) => s.status === "outage");
      const hasDegraded = liveServices.some((s) => s.status === "degraded");
      const systemStatus = hasCritical ? "outage" : hasDegraded ? "degraded" : "operational";
      const response = {
        systemStatus,
        headline: systemStatus === "operational" ? "All Systems Operational" : "Partial Outage or Degraded Performance",
        subtitle: "Real-time telemetry and edge health across all global locations",
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        overallUptime90d: 100,
        avgLatencyMs: liveServices.length > 0 ? Math.round(liveServices.reduce((acc, s) => acc + s.currentLatency, 0) / liveServices.length) : 0,
        totalProbesToday: liveServices.length * 720,
        activeRegionsCount: liveServices.length > 0 ? 310 : 0,
        categories: mergedCategories.map((cat) => ({
          ...cat,
          services: liveServices.filter((s) => s.categoryId === cat.id)
        })).filter((cat) => cat.services.length > 0),
        activeIncidents,
        pastIncidents
      };
      return new Response(JSON.stringify(response), { headers: corsHeaders });
    }
    if (url.pathname === "/api/admin/data" && request.method === "GET") {
      const services = await getServices();
      const categories = await getCategories();
      let incidents = memoryIncidents;
      let notifications = memoryNotifications;
      let settings = memorySettings;
      if (kv) {
        try {
          const rawInc = await kv.get("config:incidents", "json");
          if (rawInc && Array.isArray(rawInc))
            incidents = rawInc;
          const rawNotif = await kv.get("config:notifications", "json");
          if (rawNotif && Array.isArray(rawNotif))
            notifications = rawNotif;
          const rawSet = await kv.get("config:settings", "json");
          if (rawSet)
            settings = rawSet;
        } catch (_e) {
        }
      }
      return new Response(
        JSON.stringify({
          userEmail: "admin@edgeone.internal",
          categories,
          services,
          incidents,
          notifications,
          settings
        }),
        { headers: corsHeaders }
      );
    }
    if (url.pathname === "/api/admin/services" && request.method === "POST") {
      const body = await request.json();
      memoryServices = body || [];
      if (kv) {
        try {
          await kv.put("config:services", JSON.stringify(body));
        } catch (_e) {
        }
      }
      return new Response(JSON.stringify({ success: true, count: Array.isArray(body) ? body.length : 0 }), { headers: corsHeaders });
    }
    if (url.pathname === "/api/admin/test-probe" && request.method === "POST") {
      const body = await request.json();
      const probeResult = await probeEndpoint({
        id: "test",
        name: "Test Probe",
        categoryId: "test",
        url: body.url,
        enabled: true,
        method: body.method || "GET",
        timeout: body.timeout || 5
      });
      return new Response(JSON.stringify(probeResult), { headers: corsHeaders });
    }
    if (url.pathname === "/api/admin/clear-data" && request.method === "POST") {
      memoryServices = [];
      memoryIncidents = [];
      memoryNotifications = [];
      memoryProbeResults = [];
      if (kv) {
        try {
          await kv.delete("config:services");
          await kv.delete("config:categories");
          await kv.delete("config:incidents");
          await kv.delete("config:notifications");
          await kv.delete("config:settings");
          await kv.delete("latest_probe_results");
        } catch (_e) {
        }
      }
      return new Response(JSON.stringify({ success: true, message: "Data cleared" }), { headers: corsHeaders });
    }
    if (url.pathname === "/api/cron-probe" || url.pathname === "/api/cron/probe") {
      const services = await getServices();
      const enabledServices = services.filter((s) => s.enabled);
      const results = [];
      for (const service of enabledServices) {
        const probeResult = await probeEndpoint(service);
        results.push({
          id: service.id,
          name: service.name,
          categoryId: service.categoryId,
          status: probeResult.status,
          latency: probeResult.latency,
          statusCode: probeResult.statusCode,
          error: probeResult.error,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      memoryProbeResults = results;
      if (kv) {
        try {
          await kv.put("latest_probe_results", JSON.stringify(results));
        } catch (_e) {
        }
      }
      return new Response(
        JSON.stringify({
          success: true,
          probedCount: enabledServices.length,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          results
        }),
        { headers: corsHeaders }
      );
    }
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  }

        pagesFunctionResponse = onRequest;
      })();
          }
        
        };
      

          
        const runMiddleware = typeof executeMiddleware !== 'undefined' ? executeMiddleware : async function() { return null; };
        let middlewareResponseHeaders = null; // 保存中间件设置的响应头
        const middlewareResponse = await runMiddleware({
          request,
          urlInfo: new URL(urlInfo.toString()),
          env: {"ProjectId":"makers-tm2mtbtsu6vo","NG_CLI_ANALYTICS":"false","NUXT_TELEMETRY_DISABLED":"1","COREPACK_ENABLE_DOWNLOAD_PROMPT":"0","COREPACK_ENABLE_STRICT":"0","YARN_ENABLE_INTERACTIVE":"0","NPM_CONFIG_YES":"true","CI":"true","TMPDIR":"/var/folders/21/pqxx_6d55gj2q27983h1rmnc0000gn/T/","EDGEONE_PROJECT_ID":"makers-tm2mtbtsu6vo","PAGES_PROJECT_ID":"makers-tm2mtbtsu6vo"},
          waitUntil,
          hookCtx
        });

        if (middlewareResponse) {
          const headers = middlewareResponse.headers;
          const hasNext = headers && headers.get('x-middleware-next') === '1';
          const rewriteTarget = headers && headers.get('x-middleware-rewrite');
          const requestHeadersOverride = headers && headers.get('x-middleware-request-headers');
          // Next.js 使用 x-middleware-override-headers 传递需要修改的请求头列表
          const overrideHeadersList = headers && headers.get('x-middleware-override-headers');

          if (rewriteTarget) {
            try {
              const rewrittenUrl = rewriteTarget.startsWith('http://') || rewriteTarget.startsWith('https://')
                ? rewriteTarget
                : new URL(rewriteTarget, urlInfo.origin).toString();
              request = recreateRequest(request, { url: rewrittenUrl });
              urlInfo = new URL(rewrittenUrl);
              normalizePathname();
            } catch (rewriteError) {
              console.error('Middleware rewrite error:', rewriteError);
            }
          }

          // 处理 Next.js 的 x-middleware-override-headers 机制
          if (overrideHeadersList) {
            try {
              const overrideKeys = overrideHeadersList.split(',').map(k => k.trim());
              for (const key of overrideKeys) {
                const newValue = headers.get('x-middleware-request-' + key);
                if (newValue !== null) {
                  request.headers.set(key, newValue);
                } else {
                  request.headers.delete(key);
                }
              }
            } catch (overrideError) {
              console.error('Middleware override headers error:', overrideError);
            }
          }
          // 处理旧的 x-middleware-request-headers 机制（兼容）
          else if (requestHeadersOverride) {
            try {
              const decoded = decodeURIComponent(requestHeadersOverride);
              const headerPatch = JSON.parse(decoded);
              Object.keys(headerPatch).forEach((key) => {
                const value = headerPatch[key];
                if (value === null || typeof value === 'undefined') {
                  request.headers.delete(key);
                } else {
                  request.headers.set(key, value);
                }
              });
            } catch (requestPatchError) {
              console.error('Middleware request header override error:', requestPatchError);
            }
          }

          if (!hasNext && !rewriteTarget) {
            return middlewareResponse;
          }

          if (hasNext) {
            middlewareResponseHeaders = new Headers();
            const skipHeaders = new Set([
              'x-middleware-next',
              'x-middleware-rewrite',
              'x-middleware-request-headers',
              'x-middleware-override-headers',
              'x-middleware-set-cookie',
              'date',
              'connection',
              'content-length',
              'content-encoding', // 避免中间件传递的压缩头覆盖到最终响应，破坏流式响应
              'transfer-encoding',
              'set-cookie', // Set-Cookie 需要特殊处理，避免重复
            ]);
            headers.forEach((value, key) => {
              const lowerKey = key.toLowerCase();
              // 过滤内部使用的 header：skipHeaders 中的 + x-middleware-request-* 前缀的请求头修改标记
              if (!skipHeaders.has(lowerKey) && !lowerKey.startsWith('x-middleware-request-')) {
                middlewareResponseHeaders.set(key, value);
              }
            });
            // 特殊处理 Set-Cookie，可能有多个，使用 getSetCookie 获取完整的 cookie 值
            const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
            setCookies.forEach(cookie => {
              middlewareResponseHeaders.append('Set-Cookie', cookie);
            });
          }
        }
      

          // 走到这里说明：
          // 1. 没有中间件响应（middlewareResponse 为 null/undefined）
          // 2. 或者中间件返回了 next
          // 需要判断是否命中边缘函数

          runEdgeFunctions();

          // 动态路由命中时，检查该路径的 runtime 是否为 edge
          // 如果不是 edge（如 node/file），则跳出边缘函数，走回源逻辑
          if (matchedFunc && routeParams.mode > 0 && hookCtx && hookCtx.getPathRuntime) {
            try {
              const pathRuntime = await hookCtx.getPathRuntime(urlInfo.pathname);
              if (pathRuntime && pathRuntime !== 'edge') {
                matchedFunc = false;
              }
            } catch(e) {
              // getPathRuntime 调用失败时不阻断，继续执行边缘函数
            }
          }

          //没有命中边缘函数，执行回源
          if (!matchedFunc) {
            const originResponse = await fetch(request);

            // 如果中间件设置了响应头，合并到回源响应中
            if (middlewareResponseHeaders) {
              const mergedHeaders = new Headers(originResponse.headers);
              // 删除可能导致问题的编码相关头
              mergedHeaders.delete('content-encoding');
              mergedHeaders.delete('content-length');
              middlewareResponseHeaders.forEach((value, key) => {
                if (key.toLowerCase() === 'set-cookie') {
                  mergedHeaders.append(key, value);
                } else {
                  mergedHeaders.set(key, value);
                }
              });
              return new Response(originResponse.body, {
                status: originResponse.status,
                statusText: originResponse.statusText,
                headers: mergedHeaders,
              });
            }

            return originResponse;
          }

          // 命中了边缘函数，继续执行边缘函数逻辑

          const params = {};
          if (routeParams.id) {
            if (routeParams.mode === 1) {
              const value = urlInfo.pathname.match(routeParams.left);
              for (let i = 1; i < value.length; i++) {
                params[routeParams.id[i - 1]] = value[i];
              }
            } else {
              const value = urlInfo.pathname.replace(routeParams.left, '');
              const splitedValue = value.split('/');
              if (splitedValue.length === 1) {
                params[routeParams.id] = splitedValue[0];
              } else {
                params[routeParams.id] = splitedValue;
              }
            }

          }
          const edgeFunctionResponse = await pagesFunctionResponse({request, params, env: {"ProjectId":"makers-tm2mtbtsu6vo","NG_CLI_ANALYTICS":"false","NUXT_TELEMETRY_DISABLED":"1","COREPACK_ENABLE_DOWNLOAD_PROMPT":"0","COREPACK_ENABLE_STRICT":"0","YARN_ENABLE_INTERACTIVE":"0","NPM_CONFIG_YES":"true","CI":"true","TMPDIR":"/var/folders/21/pqxx_6d55gj2q27983h1rmnc0000gn/T/","EDGEONE_PROJECT_ID":"makers-tm2mtbtsu6vo","PAGES_PROJECT_ID":"makers-tm2mtbtsu6vo"}, waitUntil, eo });

          // 如果中间件设置了响应头，合并到边缘函数响应中
          if (middlewareResponseHeaders && edgeFunctionResponse) {
            const mergedHeaders = new Headers(edgeFunctionResponse.headers);
            // 删除可能导致问题的编码相关头
            mergedHeaders.delete('content-encoding');
            mergedHeaders.delete('content-length');
            middlewareResponseHeaders.forEach((value, key) => {
              if (key.toLowerCase() === 'set-cookie') {
                mergedHeaders.append(key, value);
              } else {
                mergedHeaders.set(key, value);
              }
            });
            return new Response(edgeFunctionResponse.body, {
              status: edgeFunctionResponse.status,
              statusText: edgeFunctionResponse.statusText,
              headers: mergedHeaders,
            });
          }

          return edgeFunctionResponse;
        })({request: ev.request, params: {}, env: {"ProjectId":"makers-tm2mtbtsu6vo","NG_CLI_ANALYTICS":"false","NUXT_TELEMETRY_DISABLED":"1","COREPACK_ENABLE_DOWNLOAD_PROMPT":"0","COREPACK_ENABLE_STRICT":"0","YARN_ENABLE_INTERACTIVE":"0","NPM_CONFIG_YES":"true","CI":"true","TMPDIR":"/var/folders/21/pqxx_6d55gj2q27983h1rmnc0000gn/T/","EDGEONE_PROJECT_ID":"makers-tm2mtbtsu6vo","PAGES_PROJECT_ID":"makers-tm2mtbtsu6vo"}, waitUntil: ev.waitUntil.bind(ev) });
        // ↑ 用户原始代码结束
      }

      addEventListener('fetch', (event, hookCtx) => {
        const res = usercode(event, hookCtx);
        event.respondWith(res);
      });