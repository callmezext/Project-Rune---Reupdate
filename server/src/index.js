require('dotenv').config();
const createServer = require('./api/server');

const PORT = process.env.PORT || 3000;

const start = () => {
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`\nServer berjalan di: http://localhost:${PORT}`);
  });
};

start();