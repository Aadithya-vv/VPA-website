import { createApplication } from './cms/application.mjs';
const { app, db } = await createApplication();
const port = Number(process.env.PORT || 5173);
const server = app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`VPA: http://127.0.0.1:${port} - Control Room: /admin`));
server.requestTimeout = 60000;
function close() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGINT', close); process.on('SIGTERM', close);
