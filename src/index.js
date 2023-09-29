import express from "express";
import { config as configureEnv } from "dotenv";
import cors from "cors";
import { configureCloudinary, getBrowser, getFirstPost, validateInstagramUrl } from "./utils.js";
import bodyParser from 'body-parser';
import pkg from "@slack/bolt";
import fs from 'fs';

console.log("__dirname", import.meta.url)

const app = express();

const { App } = pkg;

configureEnv();
configureCloudinary();
app.use(cors());
app.use(bodyParser.json());
await getBrowser();

const slackApp = new App({
  token: process.env.SLACK_USER_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  port: 8080,
  socketMode: false,
})

const PORT = process.env.PORT || 3000;
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

app.get("/embed", (req, res) => {
  let url = req.originalUrl;
  if(url.match(/\/embed\?url=(.*)/)){
    url = url.match(/\/embed\?url=(.*)/)[1]
  }
  res.send(`
  <!DOCTYPE html>
  <html lang="en" dir="ltr" data-cast-api-enabled="true">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <style>
      * {
        margin: 0;
        padding: 0;
      }
      body {
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        background: black;
        text-align: center;
      }
      video {
        height: 100%;
        width: 100%;
        object-fit: contain;
      }
    </style>
    <body>
      <video
        crossorigin="anonymous"
        autoplay
        controls
        loop
        src="https://iv-apis.onrender.com/nocors/_/${url}"
      ></video>
    </body>
    <script>
      const video = document.querySelector("video");
      // video.crossOrigin = 'anonymous';
      // video.src = 'https://iv-apis.onrender.com/nocors/_/${url}';
      // video.load()
    </script>
  </html>
  
  `)
})

app.post('/slack', async (req, res) => {
  if (req.body.type === "url_verification") {
    return res.send(req.body.challenge);
  }
  res.status(200).send('OK')

  if (req.body.event.type === "app_mention") {
    slackApp.client.chat.postMessage({
      channel: req.body.event.channel,
      text: 'PRESENT <@' + req.body.event.user + '>!',
    })
  }

  if (req.body.event.type === "link_shared") {
    const links = req.body.event.links;
    const toReturn = {};
    console.log('[log]: unfurling...')
    for (let link of links) {
      if (!validateInstagramUrl(link.url)) continue;
      // if(link.url.includes('reel')) continue
      const postData = await getFirstPost(link.url);
      if (postData.firstMediaUrl.includes('placehold.co')) continue
      // console.log({postData})
      toReturn[link.url] = {
        blocks: [
          {
            "type": "context",
            "elements": [
              {
                "type": "image",
                "image_url": postData.posterProfile,
                "alt_text": `${postData.posterUsername} profile picture`
              },
              {
                "type": "mrkdwn",
                "text": `*<https://instagram.com/${postData.posterUsername}|${postData.posterUsername}>*\n${postData.caption}`
              },
            ],
          },
          (postData.isVideo ? {
            "type": "video",
            "title": {
              "type": "plain_text",
              "text": "click to see full post",
              "emoji": true
            },
            "title_url": link.url,
            // "video_url": postData.firstMediaUrl,
            "video_url": process.env.BASE_URL + `/embed?url=${postData.firstMediaUrl}`,
            "alt_text": postData.caption,
            "thumbnail_url": postData.videoThumbnail,
            // "author_name": postData.posterUsername,
            // "provider_name": "Instagram",
            // "provider_icon_url": "https://res.cloudinary.com/dyrneab5i/image/upload/v1695022143/ig-icon.png",
          } :
            {
              "type": "image",
              "image_url": postData.firstMediaUrl,
              "alt_text": postData.caption
            })
        ]
      }
    }

    slackApp.client.chat.unfurl({
      channel: req.body.event.channel,
      ts: req.body.event.message_ts,
      unfurls: {
        ...toReturn
      }
    })
  }
})


app.get('/logs', (req, res) => {
  fs.readFile('.log', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error reading logfile');
      return;
    }
    res.send("<html><body><pre>" + data + "</pre></body></html>");
  });
});
