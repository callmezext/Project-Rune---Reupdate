const express = require("express");
const cors = require("cors");
const tiktokRoutes = require("./routes/tiktokRoutes");
const errorHandler = require("./middlewares/errorMiddleware");

const createServer = () => {
  const app = express();
    app.set("json spaces", 2);
  app.use(cors());
  app.use(express.json());
  app.use("/api/tiktok", tiktokRoutes);
  app.get("/", (req, res) => res.send("PONG"));
  app.use(errorHandler);

  return app;
};

module.exports = createServer;
