export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/wxsend') {
      const params = await request.json()
      const titles = []
      const contents = []
      titles.push(params.title1, params.title2, params.title3, params.title4, params.title5)
      contents.push(params.content1, params.content2, params.content3, params.content4, params.content5, 
        params.content6, params.content7, params.content8, params.content9, params.content10)
      let requestToken = params.token;

      if (requestToken !== env.API_TOKEN) {
        return new Response('Invalid token', { status: 403 });
      }

      const appid = params.appid || env.WX_APPID;
      const secret = params.secret || env.WX_SECRET;
      const useridStr = params.userid || env.WX_USERID;
      const template_id = params.template_id || env.WX_TEMPLATE_ID;
      const base_url = params.base_url || env.WX_BASE_URL;

      if (!appid || !secret || !useridStr) {
        return new Response('Missing required environment variables: WX_APPID, WX_SECRET, WX_USERID', { status: 500 });
      }

      const user_list = useridStr.split('|').map(uid => uid.trim()).filter(Boolean);

      try {
        const accessToken = await getStableToken(appid, secret);
        if (!accessToken) {
          return new Response('Failed to get access token', { status: 500 });
        }

        const results = await Promise.all(user_list.map(userid =>
          sendMessage(accessToken, userid, template_id, base_url, titles, contents)
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

async function sendMessage(accessToken, userid, template_id, base_url, titles, contents) {
  const sendUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;
  const data = {}
  for (let i = 0; i < titles.length; i++) {
    data[`title${i + 1}`] = {
      value: titles[i]
    }
  }
  for (let i = 0; i < contents.length; i++) {
    data[`content${i + 1}`] = {
      value: contents[i]
    }
  }
  const payload = {
    touser: userid,
    template_id: template_id,
    url: `${base_url}`,
    data
  };

  const response = await fetch(sendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  return await response.json();
}
