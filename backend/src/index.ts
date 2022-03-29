import fastify from 'fastify';
import ws from 'fastify-websocket';
import fastifyCors from 'fastify-cors';
import fp from 'fastify-plugin';
import fs from 'fs';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { createContext } from './context';
import { appRouter } from './router';

require('dotenv').config();

console.log('starting');

const cert = process.env.STAIR_HOUSES_SSL_CERT ?? '';
const key = process.env.STAIR_HOUSES_SSL_KEY ?? '';

const server = fastify({
  https: cert && key ? {
    key: fs.readFileSync(key),
    cert: fs.readFileSync(cert)
  } : {}
});

server.register(ws);

server.register(fp(fastifyTRPCPlugin), {
  useWSS: true,
  prefix: '/',
  trpcOptions: { router: appRouter, createContext },
});

server.register(fastifyCors, () => (req, callback) => {
    let corsOptions;
    if (/^localhost$/.test(req.hostname) || /^stair.ch$/.test(req.hostname)) {
        corsOptions = { origin: true };
    } else {
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
});

(async () => {
  try {
    await server.listen(process.env.STAIR_HOUSES_SSL_PORT ?? 3033, process.env.STAIR_HOUSES_SSL_IP ?? '0.0.0.0');
    console.log('Listening on port 3033');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();