const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');

const server = http.createServer();
server.listen(process.env.PORT || 3000);

const API_KEY = 'uFRRf_mVJuI3NrKeAoJ_zzCim3Bg7aWI';
const N8N_WEBHOOK = 'https://rjdxs.app.n8n.cloud/webhook/239324c6-c242-466b-a361-1cd16e47f89a';

const FEEDS = [
  {
      name: 'stocks',
          url: 'wss://socket.massive.com/stocks',
              subscribe: 'T.*,Q.*,A.*',
                },
                  {
                      name: 'forex',
                          url: 'wss://socket.massive.com/forex',
                              subscribe: 'C.*,CA.*',
                                },
                                  {
                                      name: 'crypto',
                                          url: 'wss://socket.massive.com/crypto',
                                              subscribe: 'XT.*,XA.*',
                                                },
                                                ];

                                                let tickBuffer = [];

                                                setInterval(async () => {
                                                  if (tickBuffer.length === 0) return;
                                                    const batch = tickBuffer.splice(0, tickBuffer.length);
                                                      try {
                                                          await axios.post(N8N_WEBHOOK, { ticks: batch }, { timeout: 5000 });
                                                              console.log(`[n8n] Sent ${batch.length} ticks`);
                                                                } catch (err) {
                                                                    console.error('[n8n] Forward failed:', err.message);
                                                                      }
                                                                      }, 500);

                                                                      function connectFeed(feed, reconnectDelay = 3000) {
                                                                        const ws = new WebSocket(feed.url);

                                                                          ws.on('open', () => {
                                                                              console.log(`[${feed.name}] Connected`);
                                                                                  ws.send(JSON.stringify({ action: 'auth', params: API_KEY }));
                                                                                    });

                                                                                      ws.on('message', (raw) => {
                                                                                          const messages = JSON.parse(raw);
                                                                                              for (const msg of messages) {
                                                                                                    if (msg.status === 'auth_success') {
                                                                                                            ws.send(JSON.stringify({ action: 'subscribe', params: feed.subscribe }));
                                                                                                                    console.log(`[${feed.name}] Subscribed`);
                                                                                                                          }
                                                                                                                                if (msg.ev && msg.ev !== 'status') {
                                                                                                                                        tickBuffer.push({
                                                                                                                                                  feed: feed.name,
                                                                                                                                                            event: msg.ev,
                                                                                                                                                                      symbol: msg.sym || msg.pair,
                                                                                                                                                                                price: msg.p || msg.bp || msg.vw,
                                                                                                                                                                                          open: msg.o,
                                                                                                                                                                                                    high: msg.h,
                                                                                                                                                                                                              low: msg.l,
                                                                                                                                                                                                                        close: msg.c,
                                                                                                                                                                                                                                  volume: msg.v || msg.av,
                                                                                                                                                                                                                                            timestamp: msg.t || msg.s,
                                                                                                                                                                                                                                                    });
                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                });

                                                                                                                                                                                                                                                                  ws.on('close', () => {
                                                                                                                                                                                                                                                                      console.log(`[${feed.name}] Disconnected. Reconnecting in ${reconnectDelay}ms`);
                                                                                                                                                                                                                                                                          setTimeout(() => connectFeed(feed, Math.min(reconnectDelay * 2, 30000)), reconnectDelay);
                                                                                                                                                                                                                                                                            });

                                                                                                                                                                                                                                                                              ws.on('error', (err) => {
                                                                                                                                                                                                                                                                                  console.error(`[${feed.name}] Error:`, err.message);
                                                                                                                                                                                                                                                                                      ws.close();
                                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                                                                        FEEDS.forEach(feed => connectFeed(feed));