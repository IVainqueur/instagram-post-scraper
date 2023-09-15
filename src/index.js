import express from "express";
import { config as configureEnv } from "dotenv";
import cors from "cors";
import { getBrowser, getFirstPost, validateInstagramUrl } from "./utils";

const app = express();

configureEnv();
app.use(cors());
await getBrowser();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("Server started at port", PORT);
});

app.get("/", async (req, res) => {
  console.log("URL", req.query.url);
  
  res.send({
    url: req.query.url,
    success: validateInstagramUrl(req.query.url),
    ...await getFirstPost(req.query.url),
    // message: '',
  });
});
