// NEW: Helper function to extract parameters from any request type
async function getParams(request) {
  const { searchParams } = new URL(request.url);
  const urlParams = Object.fromEntries(searchParams.entries());

  let bodyParams = {};
  // Only try to parse a body if it's a POST/PUT/PATCH request
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    try {
      if (contentType.includes('application/json')) {
        const jsonBody = await request.json();
        // jsonBody can be a string, an object, or other types
        if (typeof jsonBody === 'string') {
          // treat raw string as content
          bodyParams = { content: jsonBody };
        } else if (jsonBody && typeof jsonBody === 'object') {
          // support nested containers like { params: {...} } or { data: {...} }
          if (jsonBody.params && typeof jsonBody.params === 'object') {
            bodyParams = jsonBody.params;
          } else if (jsonBody.data && typeof jsonBody.data === 'object') {
            bodyParams = jsonBody.data;
          } else {
            bodyParams = jsonBody;
          }
        }
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        bodyParams = Object.fromEntries(formData.entries());
      } else {
        // Fallback: try to read raw text and parse as JSON, otherwise treat as raw content
        const text = await request.text();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object') {
              if (parsed.params && typeof parsed.params === 'object') {
                bodyParams = parsed.params;
              } else if (parsed.data && typeof parsed.data === 'object') {
                bodyParams = parsed.data;
              } else {
                bodyParams = parsed;
              }
            } else {
              bodyParams = { content: text };
            }
          } catch (e) {
            bodyParams = { content: text };
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse request body:', error);
      // Ignore body parsing errors and proceed with URL params
    }
  }

  // Merge params, giving body parameters precedence over URL parameters
  return { ...urlParams, ...bodyParams };
}


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // If path is a single segment like '/<token>', serve an interactive test page
    // but ignore reserved paths like '/wxsend' and '/index.html'
    const singleSeg = url.pathname.match(/^\/([^\/]+)\/?$/);
    if (singleSeg && singleSeg[1] && singleSeg[1] !== 'wxsend' && singleSeg[1] !== 'index.html') {
      const rawTokenFromPath = singleSeg[1];

      // 1. Authenticate the token first
      if (rawTokenFromPath !== env.API_TOKEN) {
        return new Response('Invalid token', { status: 403 });
      }

      // 2. Sanitize the token for safe embedding into HTML value attributes
      const sanitizedToken = rawTokenFromPath
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>WXPush 测试页面</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        padding: 24px;
        background: linear-gradient(170deg, #f3e8ff 0%, #ffffff 100%);
        color: #1f2937;
        box-sizing: border-box;
      }
      .container {
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(10px);
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.18);
        padding: 40px;
        max-width: 720px;
        width: 100%;
        text-align: left;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .container:hover {
        transform: translateY(-8px);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 32px;
        font-weight: 700;
        text-align: center;
        background: linear-gradient(90deg, #8b5cf6, #3b82f6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .hint {
        color: #4b5563;
        margin: 0 0 24px;
        font-size: 16px;
        line-height: 1.6;
        text-align: center;
      }
      label {
        display: block;
        margin: 16px 0 8px;
        font-weight: 700;
        color: #374151;
      }
      input[type=text], textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #d4d4d8;
        border-radius: 12px;
        background: #f4f4f5;
        transition: all 0.2s ease;
        box-sizing: border-box;
        font-family: inherit;
        font-size: 14px;
      }
      input[type=text]:focus, textarea:focus {
        outline: none;
        border-color: #8b5cf6;
        background: #ffffff;
        box-shadow: 0 0 0 2px #c4b5fd;
      }
      button {
        margin-top: 24px;
        padding: 12px 20px;
        border-radius: 12px;
        border: 0;
        background: #8b5cf6;
        color: #fff;
        cursor: pointer;
        font-weight: 700;
        transition: all 0.2s ease;
      }
      button:hover {
        background: #7c3aed;
        transform: translateY(-2px);
      }
      button#clearBtn {
         background: #f4f4f5;
         color: #374151;
         border: 1px solid #e4e4e7;
      }
       button#clearBtn:hover {
         background: #ffffff;
         border-color: #d4d4d8;
         color: #1f2937;
      }
      pre {
        background: #1f2937;
        color: #e5e7eb;
        padding: 16px;
        border-radius: 12px;
        white-space: pre-wrap;
        word-break: break-all;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>WXPush 测试页面</h1>
      <p class="hint">当前 token (来自路径)：<strong>${sanitizedToken}</strong></p>

      <form id="testForm" method="POST" action="/wxsend">

        <label for="title">标题 (title)</label>
        <input id="title" name="title" type="text" value="测试标题" />

        <label for="content">内容 (content)</label>
        <textarea id="content" name="content" rows="4">这是测试内容</textarea>

        <label for="userid">用户 ID (userid，可选，多用户用 | 分隔)</label>
        <input id="userid" name="userid" type="text" placeholder="例如: OPENID1|OPENID2" />

        <label for="appid">WX_APPID (可选，留空使用环境变量)</label>
        <input id="appid" name="appid" type="text" />

        <label for="secret">WX_SECRET (可选，留空使用环境变量)</label>
        <input id="secret" name="secret" type="text" />

        <label for="template_id">模板 ID (template_id，可选)</label>
        <input id="template_id" name="template_id" type="text" />

        <label for="base_url">跳转链接 base_url (可选)</label>
        <input id="base_url" name="base_url" type="text" />

        <input type="hidden" name="token" id="hiddenToken" value="${sanitizedToken}" />

        <div style="display:flex;gap:12px;align-items:center">
          <button id="sendBtn" type="submit">发送测试请求</button>
          <button type="button" id="clearBtn">清空</button>
        </div>
      </form>
      <div id="responseCard" style="display:none; margin-top: 20px;">
        <label for="responseArea">响应</label>
        <pre id="responseArea"></pre>
      </div>
    </div>

    <script>
      const form = document.getElementById('testForm');
      const sendBtn = document.getElementById('sendBtn');
      const clearBtn = document.getElementById('clearBtn');
      const responseArea = document.getElementById('responseArea');
      const responseCard = document.getElementById('responseCard');

      if (form && sendBtn && clearBtn && responseArea && responseCard) {
        clearBtn.addEventListener('click', () => {
          document.getElementById('title').value = '';
          document.getElementById('content').value = '';
          document.getElementById('userid').value = '';
          document.getElementById('appid').value = '';
          document.getElementById('secret').value = '';
          document.getElementById('template_id').value = '';
          document.getElementById('base_url').value = '';
          responseArea.textContent = '';
          responseCard.style.display = 'none';
        });

        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          sendBtn.disabled = true;
          const originalText = sendBtn.textContent;
          sendBtn.textContent = '发送中...';
          responseCard.style.display = 'none';

          const formData = new FormData(form);
          const payload = {};
          for (const [k, v] of formData.entries()) {
             if (k !== 'token' && v) {
                payload[k] = v;
             }
          }

          try {
            const headers = { 'Content-Type': 'application/json' };
            const token = document.getElementById('hiddenToken').value;
            if (token) headers['Authorization'] = token;

            const response = await fetch('/wxsend', { method: 'POST', headers, body: JSON.stringify(payload) });
            const responseText = await response.text();
            responseArea.textContent = 'Status: ' + response.status + '\\n\\n' + responseText;
            responseCard.style.display = 'block';
          } catch (err) {
            responseArea.textContent = 'Fetch error: ' + err.message;
            responseCard.style.display = 'block';
          } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
          }
        });
      }
    </script>
  </body>
</html>`;

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // Route: only handle message sending on '/wxsend'
    if (url.pathname === '/wxsend') {
      // MODIFIED: Use the new helper function to get all parameters
      const params = await getParams(request);

      // MODIFIED: Read parameters from the unified 'params' object
      const content = params.content;
      const title1 = params.title1;
      const title2 = params.title2;
      const title3 = params.title3;
      // token can come from body/url params or from Authorization header
      let requestToken = params.token;
      if (!requestToken) {
        const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
        if (authHeader) {
          // support formats: 'Bearer <token>' or raw token
          const parts = authHeader.split(' ');
          requestToken = parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : authHeader;
        }
      }

      if (!content || !title1 || !requestToken) {
        return new Response('Missing required parameters: content, title, token', { status: 400 });
      }

      if (requestToken !== env.API_TOKEN) {
        return new Response('Invalid token', { status: 403 });
      }

      const appid = params.appid || env.WX_APPID;
      const secret = params.secret || env.WX_SECRET;
      const useridStr = params.userid || env.WX_USERID;
      const template_id = params.template_id || env.WX_TEMPLATE_ID;
      const base_url = params.base_url || env.WX_BASE_URL;

      if (!appid || !secret || !useridStr || !template_id) {
          return new Response('Missing required environment variables: WX_APPID, WX_SECRET, WX_USERID, WX_TEMPLATE_ID', { status: 500 });
      }

      const user_list = useridStr.split('|').map(uid => uid.trim()).filter(Boolean);

      try {
        const accessToken = await getStableToken(appid, secret);
        if (!accessToken) {
          return new Response('Failed to get access token', { status: 500 });
        }

        const results = await Promise.all(user_list.map(userid =>
          sendMessage(accessToken, userid, template_id, base_url, title1,title2,title3, content)
        ));

        const successfulMessages = results.filter(r => r.errmsg === 'ok');

        if (successfulMessages.length > 0) {
          return new Response(`Successfully sent messages to ${successfulMessages.length} user(s). First response: ok`, { status: 200 });
        } else {
          const firstError = results.length > 0 ? results[0].errmsg : "Unknown error";
          return new Response(`Failed to send messages. First error: ${firstError}`, { status: 500 });
        }

      } catch (error) {
        console.error('Error:', error);
        return new Response(`An error occurred: ${error.message}`, { status: 500 });
      }
    }
    // For any other path/method, return 404
    return new Response('Not Found', { status: 404 });
  },
};

async function getStableToken(appid, secret) {
  const tokenUrl = 'https://api.weixin.qq.com/cgi-bin/stable_token';
  const payload = {
    grant_type: 'client_credential',
    appid: appid,
    secret: secret,
    force_refresh: false
  };
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return data.access_token;
}

async function sendMessage(accessToken, userid, template_id, base_url, title1,title2,title3, content) {
  const sendUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;

  // Create a Date object for Beijing time (UTC+8) by adding 8 hours to the current UTC time
  const beijingTime = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
  // Format the date to 'YYYY-MM-DD HH:MM:SS' string
  const date = beijingTime.toISOString().slice(0, 19).replace('T', ' ');

  const encoded_message = encodeURIComponent(content);
  const encoded_date = encodeURIComponent(date);

  const payload = {
    touser: userid,
    template_id: template_id,
    url: `${base_url}?message=${encoded_message}&date=${encoded_date}&title1=${encodeURIComponent(title1)}`,
    data: {
      title1: { value: title1 },
      title2: { value: title2 },
      title3: { value: title3 },
      content: { value: content }
    }
  };

  const response = await fetch(sendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  return await response.json();
}
