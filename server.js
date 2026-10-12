const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const ENV_PATH = path.join(__dirname, '.env');

// Simple .env parser & loader
function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

function saveEnv(updates) {
  const current = loadEnv();
  const merged = { ...current, ...updates };
  let content = '# Aurelius Configuration\n';
  for (const [k, v] of Object.entries(merged)) {
    content += `${k}=${v || ''}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, 'utf-8');
  return merged;
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.sql': 'text/plain'
};

// Helper for reading JSON body
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Make HTTPS request to Gemini API
function callGeminiApi(apiKey, model, systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
    
    const payload = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(url, options, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(resBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
            resolve({ success: true, reply, raw: data });
          } else {
            resolve({ 
              success: false, 
              error: data.error?.message || `HTTP ${res.statusCode}: ${resBody}` 
            });
          }
        } catch (e) {
          resolve({ success: false, error: `Invalid JSON from Gemini: ${resBody}` });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Route: GET /api/config
  if (req.method === 'GET' && pathname === '/api/config') {
    const env = loadEnv();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      hasGemini: !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim()),
      geminiKeyMasked: env.GEMINI_API_KEY ? `${env.GEMINI_API_KEY.slice(0, 4)}...${env.GEMINI_API_KEY.slice(-4)}` : '',
      geminiModel: env.GEMINI_MODEL || 'gemini-1.5-flash',
      hasSupabase: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
      supabaseUrl: env.SUPABASE_URL || '',
      supabaseKeyMasked: env.SUPABASE_ANON_KEY ? `${env.SUPABASE_ANON_KEY.slice(0, 8)}...` : ''
    }));
    return;
  }

  // API Route: POST /api/save-config
  if (req.method === 'POST' && pathname === '/api/save-config') {
    try {
      const data = await readJsonBody(req);
      const updates = {};
      if (typeof data.geminiApiKey === 'string') updates.GEMINI_API_KEY = data.geminiApiKey.trim();
      if (typeof data.geminiModel === 'string') updates.GEMINI_MODEL = data.geminiModel.trim();
      if (typeof data.supabaseUrl === 'string') updates.SUPABASE_URL = data.supabaseUrl.trim();
      if (typeof data.supabaseAnonKey === 'string') updates.SUPABASE_ANON_KEY = data.supabaseAnonKey.trim();
      
      saveEnv(updates);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Configuration saved to .env' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // API Route: POST /api/chat-gemini
  if (req.method === 'POST' && pathname === '/api/chat-gemini') {
    try {
      const data = await readJsonBody(req);
      const env = loadEnv();
      const apiKey = data.apiKey || env.GEMINI_API_KEY;
      const model = data.model || env.GEMINI_MODEL || 'gemini-1.5-flash';

      if (!apiKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Gemini API key is required. Please set it in Settings.' }));
        return;
      }

      const result = await callGeminiApi(
        apiKey,
        model,
        data.systemPrompt || 'You are Aurelius, the AI Master Auctioneer.',
        data.message || ''
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Aurelius Server running at http://localhost:${PORT}/ with Gemini & Supabase API support`);
});
