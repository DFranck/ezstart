import http from 'http';
import fetch from 'node-fetch';

const urls = ['https://ezstart-api.onrender.com/api/health'];

const pingAll = async () => {
  console.log(`[${new Date().toISOString()}] 🔁 Starting health check...`);

  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      const text = await res.text();
      console.log(`✅ ${url} → ${res.status} (${text.slice(0, 50)})`);
    } catch (error: any) {
      const isTimeout = error.name === 'AbortError';
      console.error(`❌ ${url} → ${isTimeout ? 'Timeout' : error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
};

pingAll();
setInterval(pingAll, 5 * 60 * 1000);

http
  .createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Monitor is running\n');
  })
  .listen(process.env.PORT || 3000, () => {
    console.log('✅ Monitor service bound to port');
  });
