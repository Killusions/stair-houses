import fastify from 'fastify';
import ws from 'fastify-websocket';
import fastifyCors from 'fastify-cors';
import fp from 'fastify-plugin';
import fs from 'fs';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify/dist/trpc-server-adapters-fastify.cjs.js';
import { createContext } from './context.js';
import { appRouter } from './router.js';
import 'dotenv/config';

console.log('starting');

const cert = process.env.STAIR_HOUSES_SSL_CERT ?? '';
const key = process.env.STAIR_HOUSES_SSL_KEY ?? '';

const makeHTTPSFastify = () => {
  return fastify({
    http2: true,
    https: {
      allowHTTP1: true,
      key: fs.readFileSync(key),
      cert: fs.readFileSync(cert),
    },
    maxParamLength: 5000,
    bodyLimit: 10000000,
  });
};

const makeFastify = (): ReturnType<typeof makeHTTPSFastify> => {
  if (cert && key) {
    return makeHTTPSFastify();
  }
  // Hack because their signatures are incompatible, but we still want to allow localhost
  return fastify({
    maxParamLength: 5000,
    bodyLimit: 10000000,
  }) as unknown as ReturnType<typeof makeHTTPSFastify>;
};

const server = makeFastify();

server.register(ws);

server.register(fp(fastifyTRPCPlugin), {
  useWSS: true,
  prefix: '/',
  trpcOptions: { router: appRouter, createContext },
});

export const frontendHost =
  process.env.STAIR_HOUSES_FRONTEND_HOST ?? 'localhost';
export const frontendPort = process.env.STAIR_HOUSES_FRONTEND_PORT ?? '3000';
export const frontendPath = process.env.STAIR_HOUSES_FRONTEND_PATH ?? '/#';
export const frontendProtocol =
  process.env.STAIR_HOUSES_FRONTEND_PROTOCOL ?? 'http://';

export const generateFrontendLink = (path: string) => {
  return `${frontendProtocol}${frontendHost}${
    frontendPort ? ':' + frontendPort : ''
  }${frontendPath}${path}`;
};

server.register(fastifyCors, {
  origin: (origin, cb) => {
    const hostname = new URL(origin).hostname;
    if (hostname === frontendHost) {
      cb(null, true);
      return;
    }
    cb(new Error('Not allowed'), false);
  },
});
(async () => {
  try {
    await server.listen(
      process.env.STAIR_HOUSES_PORT ?? 3033,
      process.env.STAIR_HOUSES_IP ?? undefined
    );
    console.log('Listening on port 3033');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
