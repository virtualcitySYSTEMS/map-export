export default {
  // server.proxy see https://vitejs.dev/config/server-options.html#server-proxy
  proxy: {
    // string shorthand: http://localhost:8008/foo -> https://vc.systems/foo
    '/berlin3d-downloadportal': 'https://www.businesslocationcenter.de',
  },
};
