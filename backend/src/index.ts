import fastify from 'fastify';
import fastifyCors from 'fastify-cors';
import fp from 'fastify-plugin';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { createContext } from './context';
import { appRouter } from './router';

const server = fastify();

server.register(fp(fastifyTRPCPlugin), {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
});

server.register(fastifyCors, (instance) => (req, callback) => {
    let corsOptions;
    if (/localhost/.test(req.hostname)) {
        corsOptions = { origin: true };
    } else {
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
});

(async () => {
  try {
    await server.listen(3030);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
})();