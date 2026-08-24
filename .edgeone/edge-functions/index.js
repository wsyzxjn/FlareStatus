
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

      
    const __middlewareModule = (() => {
      const module = { exports: {} };
      const exports = module.exports;
      const loader = new Function('module', 'exports', "\"use strict\";var d=Object.defineProperty;var i=Object.getOwnPropertyDescriptor;var u=Object.getOwnPropertyNames;var l=Object.prototype.hasOwnProperty;var p=(s,e)=>{for(var a in e)d(s,a,{get:e[a],enumerable:!0})},w=(s,e,a,r)=>{if(e&&typeof e==\"object\"||typeof e==\"function\")for(let t of u(e))!l.call(s,t)&&t!==a&&d(s,t,{get:()=>e[t],enumerable:!(r=i(e,t))||r.enumerable});return s};var T=s=>w(d({},\"__esModule\",{value:!0}),s);var f={};p(f,{config:()=>m,middleware:()=>y});module.exports=T(f);var m={matcher:[\"/api/:path*\",\"/metrics\"]};async function y(s){let{request:e}=s,a=new URL(e.url),r=`https://status.amatsuka.net${a.pathname}${a.search}`,t=new Headers(e.headers);t.set(\"Host\",\"status.amatsuka.net\");try{let h=[\"POST\",\"PUT\",\"PATCH\",\"DELETE\"].includes(e.method)?await e.arrayBuffer():void 0,o=await fetch(r,{method:e.method,headers:t,body:h}),n=new Headers(o.headers);return n.set(\"Access-Control-Allow-Origin\",\"*\"),n.set(\"Access-Control-Allow-Methods\",\"GET, POST, PUT, DELETE, OPTIONS\"),n.set(\"Access-Control-Allow-Headers\",\"*\"),new Response(o.body,{status:o.status,statusText:o.statusText,headers:n})}catch(c){return new Response(JSON.stringify({error:\"Backend proxy failed\",message:c.message}),{status:502,headers:{\"Content-Type\":\"application/json\"}})}}0&&(module.exports={config,middleware});\n");
      loader(module, exports);
      return module.exports || exports;
    })();

    const middlewareFunction = (() => {
      // 优先查找 middleware 导出
      if (__middlewareModule && typeof __middlewareModule.middleware === 'function') {
        return __middlewareModule.middleware;
      }
      // 支持 proxy 导出
      if (__middlewareModule && typeof __middlewareModule.proxy === 'function') {
        return __middlewareModule.proxy;
      }
      // 尝试从 default 导出获取
      if (
        __middlewareModule &&
        __middlewareModule.default &&
        typeof __middlewareModule.default.middleware === 'function'
      ) {
        return __middlewareModule.default.middleware;
      }
      if (
        __middlewareModule &&
        __middlewareModule.default &&
        typeof __middlewareModule.default.proxy === 'function'
      ) {
        return __middlewareModule.default.proxy;
      }
      throw new Error('Middleware bundle did not export a function named "middleware".');
    })();

    function toHeaders(initHeaders) {
      // if (initHeaders instanceof Headers) {
      //   return new Headers(initHeaders);
      // }
      return new Headers(initHeaders ?? {});
    }

    /**
     * ResponseCookies - 用于操作响应 cookies
     */
    class ResponseCookies {
      constructor(headers) {
        this._headers = headers;
      }

      /**
       * 设置 cookie
       * @param {string} name - cookie 名称
       * @param {string|object} value - cookie 值或包含 value 和选项的对象
       * @param {object} options - cookie 选项 (path, domain, maxAge, expires, httpOnly, secure, sameSite)
       */
      set(name, value, options = {}) {
        let cookieValue;
        let cookieOptions = options;

        if (typeof value === 'object' && value !== null && 'value' in value) {
          cookieValue = value.value;
          cookieOptions = { ...value, ...options };
          delete cookieOptions.value;
        } else {
          cookieValue = String(value);
        }

        const parts = [name + '=' + encodeURIComponent(cookieValue)];

        if (cookieOptions.path) {
          parts.push('Path=' + cookieOptions.path);
        }
        if (cookieOptions.domain) {
          parts.push('Domain=' + cookieOptions.domain);
        }
        if (cookieOptions.maxAge !== undefined) {
          parts.push('Max-Age=' + cookieOptions.maxAge);
        }
        if (cookieOptions.expires) {
          const expiresDate = cookieOptions.expires instanceof Date 
            ? cookieOptions.expires 
            : new Date(cookieOptions.expires);
          parts.push('Expires=' + expiresDate.toUTCString());
        }
        if (cookieOptions.httpOnly) {
          parts.push('HttpOnly');
        }
        if (cookieOptions.secure) {
          parts.push('Secure');
        }
        if (cookieOptions.sameSite) {
          parts.push('SameSite=' + cookieOptions.sameSite);
        }

        this._headers.append('Set-Cookie', parts.join('; '));
        return this;
      }

      /**
       * 删除 cookie
       * @param {string} name - cookie 名称
       * @param {object} options - cookie 选项 (path, domain)
       */
      delete(name, options = {}) {
        return this.set(name, '', {
          ...options,
          maxAge: 0,
          expires: new Date(0),
        });
      }

      /**
       * 获取 cookie (从 Set-Cookie 头中解析)
       * @param {string} name - cookie 名称
       */
      get(name) {
        const cookies = this._headers.getSetCookie ? this._headers.getSetCookie() : [];
        for (const cookie of cookies) {
          const [pair] = cookie.split(';');
          const [cookieName, cookieValue] = pair.split('=');
          if (cookieName.trim() === name) {
            return {
              name: cookieName.trim(),
              value: decodeURIComponent(cookieValue || ''),
            };
          }
        }
        return undefined;
      }

      /**
       * 获取所有 cookies
       */
      getAll() {
        const cookies = this._headers.getSetCookie ? this._headers.getSetCookie() : [];
        return cookies.map(cookie => {
          const [pair] = cookie.split(';');
          const [name, value] = pair.split('=');
          return {
            name: name.trim(),
            value: decodeURIComponent(value || ''),
          };
        });
      }

      /**
       * 检查是否存在某个 cookie
       * @param {string} name - cookie 名称
       */
      has(name) {
        return this.get(name) !== undefined;
      }

      /**
       * 清除所有 cookies (通过设置过期)
       */
      clear() {
        const allCookies = this.getAll();
        for (const cookie of allCookies) {
          this.delete(cookie.name);
        }
        return this;
      }
    }

    /**
     * createMiddlewareResponse - 创建增强的 Response 对象，支持 cookies API
     * 使用组合而非继承，避免 Edge 运行时中继承 Response 的兼容性问题
     */
    function createMiddlewareResponse(body, init) {
      const response = new Response(body, init);
      const cookies = new ResponseCookies(response.headers);
      
      // 添加 cookies 属性
      Object.defineProperty(response, 'cookies', {
        value: cookies,
        writable: false,
        enumerable: true,
        configurable: false,
      });
      
      return response;
    }

    // MiddlewareResponse 作为静态工具对象
    // const MiddlewareResponse = {
    //   /**
    //    * 创建新的中间件响应
    //    */
    //   new: (body, init) => createMiddlewareResponse(body, init),
      
    //   /**
    //    * 静态方法：创建 next 响应
    //    */
    //   next: (init) => next(init),
      
    //   /**
    //    * 静态方法：创建 redirect 响应
    //    */
    //   redirect: (url, status = 307) => redirect(url, status),
      
    //   /**
    //    * 静态方法：创建 rewrite 响应
    //    */
    //   rewrite: (url) => rewrite(url),
    // };

    function headersInitToRecord(input) {
      if (!input) {
        return {};
      }
      const record = {};
      const headers = new Headers(input);
      headers.forEach((value, key) => {
        record[key] = value;
      });
      return record;
    }

    function extractRequestHeaderPatch(requestOverrides, fallbackHeaders) {
      const directHeaders = requestOverrides?.headers ? headersInitToRecord(requestOverrides.headers) : null;
      if (directHeaders && Object.keys(directHeaders).length) {
        return directHeaders;
      }
      if (fallbackHeaders) {
        const fallback = headersInitToRecord(fallbackHeaders);
        if (Object.keys(fallback).length) {
          return fallback;
        }
      }
      return null;
    }

    /**
     * next() 函数 - 用于中间件继续执行后续逻辑
     * 返回带有 x-middleware-next 标记的增强响应（支持 cookies API）
     */
    function next(init) {
      const responseInit = init ?? {};
      const { request: requestOverrides, headers: headersOverrides, ...rest } = responseInit;
      const headers = toHeaders(headersOverrides);
      headers.set("x-middleware-next", "1");

      const requestHeadersPatch = extractRequestHeaderPatch(requestOverrides, headersOverrides);
      if (requestHeadersPatch) {
        try {
          headers.set(
            "x-middleware-request-headers",
            encodeURIComponent(JSON.stringify(requestHeadersPatch))
          );
        } catch (serializationError) {
          console.warn('Failed to serialize middleware request headers patch:', serializationError);
        }
      }
      return createMiddlewareResponse(null, {
        ...rest,
        headers,
      });
    }

    function redirect(url, status = 307) {
      return createMiddlewareResponse(null, {
        status,
        headers: {
          Location: url
        }
      });
    }

    function rewrite(url) {
      const headers = new Headers();
      headers.set("x-middleware-rewrite", url);
      return createMiddlewareResponse(null, { headers });
    }

    // 中间件配置
    const middlewareConfig = {"runtime":"edge","matcher":["/api/:path*","/metrics"],"normalizedMatcher":[{"source":"/api/:path*","regex":"^\\/api(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?[\\/#\\?]?$"},{"source":"/metrics","regex":"^\\/metrics[\\/#\\?]?$"}]};

    /**
     * 执行中间件并返回响应（如果中间件返回了响应）
     * @param {Object} context - 包含 request, urlInfo, env, waitUntil, hookCtx 的上下文
     * @returns {Response|null} 如果中间件返回响应则返回，否则返回 null
     */
    async function executeMiddleware(context) {
      const { request, urlInfo, env, waitUntil, hookCtx } = context;
      const pathname = urlInfo.pathname;

      // 检查路径是否匹配 matcher
      const matchers = [{"source":"/api/:path*","regex":"^\\/api(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?[\\/#\\?]?$"},{"source":"/metrics","regex":"^\\/metrics[\\/#\\?]?$"}];
      let shouldExecute = matchers.length === 0; // 如果没有配置 matcher，默认执行

      for (const matcher of matchers) {
        if (matchPattern(pathname, matcher)) {
          shouldExecute = true;
          break;
        }
      }

      if (!shouldExecute) {
        return null; // 不匹配，继续执行后续函数
      }

      // 将 hookCtx.fetch 临时赋给 globalThis.fetch
      // 因为中间件通过 new Function 加载，只能访问 globalThis.fetch
      const __savedGlobalFetch = globalThis.fetch;
      try {
        globalThis.fetch = hookCtx.fetch;

        const middlewareContext = {
          request,
          urlInfo,
          env,
          waitUntil,
          next,
          redirect,
          rewrite,
          // MiddlewareResponse,
          geo: request.eo?.geo || {},
          clientIp: request.eo?.clientIp || '',
        };

        // 执行中间件
        const result = await middlewareFunction(middlewareContext);

        // 恢复 globalThis.fetch
        globalThis.fetch = __savedGlobalFetch;

        // 如果返回了 Response 对象，直接返回
        if (result && result instanceof Response) {
          return result;
        }

        return null; // 继续执行后续函数
      } catch (error) {
        // 恢复 globalThis.fetch
        globalThis.fetch = __savedGlobalFetch;
        console.error('Middleware error:', error);
        return null; // 出错时继续执行后续函数
      }
    }
    
    /**
     * 匹配路径模式
     * 支持通配符 * 和精确匹配
     */
    function matchPattern(pathname, matcher) {
      if (!matcher) {
        return false;
      }

      if (matcher.regex === '.*') {
        return true;
      }

      try {
        const regex = new RegExp(matcher.regex);
        return regex.test(pathname);
      } catch (_) {
        return pathname === matcher.source;
      }
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