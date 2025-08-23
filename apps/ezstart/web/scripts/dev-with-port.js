import { spawn } from 'child_process';
import net from 'net';

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

async function findFreePort(startPort = 3100) {
  let port = startPort;
  while (!(await isPortFree(port))) {
    port++;
  }
  return port;
}

async function startDev() {
  const port = await findFreePort(3100);
  console.log(`🚀 Starting dev server on port ${port}`);
  
  const child = spawn('next', ['dev', '--turbopack', '-p', port.toString()], {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (error) => {
    console.error('Error starting dev server:', error);
  });
}

startDev();