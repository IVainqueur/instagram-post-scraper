import express from "express";
import { config as configureEnv } from "dotenv";
import cors from "cors";
import { getBrowser, getFirstPost, validateInstagramUrl } from "./utils.js";
import bodyParser from 'body-parser';
import pkg from "@slack/bolt";

const app = express();

const {App} = pkg;

configureEnv();
app.use(cors());
app.use(bodyParser.json());
await getBrowser();

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  port: 8080,
  socketMode: false,
})

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

app.post('/slack', async (req, res) => {
  if(req.body.type === "url_verification") {
    return res.send(req.body.challenge);
  }
  res.status(200).send('OK')
  // slackApp.client.
  console.log(req.body)
  if(req.body.event.type === "app_mention") {
    slackApp.client.chat.postMessage({
      channel: req.body.event.channel,
      text: 'PRESENT <@' + req.body.event.user + '>!',
    })
  }

  if(req.body.event.type === "link_shared") {
    const links = req.body.event.links;
    const toReturn = {};
    for(let link of links) {
      if(!validateInstagramUrl(link.url)) continue;
      const postData = await getFirstPost(link.url);
      if(postData.firstMediaUrl.includes('placeholder')) continue
      toReturn[link.url] = {
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `*<https://instagram.com/${postData.posterUsername}|${postData.posterUsername}>*\n${postData.caption}`
            },
            "accessory": {
              "type": "image",
              "image_url": postData.posterProfile,
              "alt_text": `${postData.posterUsername} profile picture`
            }
          },
          // {
          //   "type": "video",
          //   "title": {
          //     "type": "plain_text",
          //     "text": "How to use Slack.",
          //     "emoji": true
          //   },
          //   "title_url": "https://www.youtube.com/watch?v=RRxQQxiM7AA",
          //   "description": {
          //     "type": "mrkdwn",
          //     "text": "Till infinity 🚀 -\n📸 : @demk1ng"
          //   },
          //   "video_url": "https://www.youtube.com/embed/RRxQQxiM7AA?feature=oembed&autoplay=1",
          //   "alt_text": "instapost",
          //   "thumbnail_url": "https://i.ytimg.com/vi/RRxQQxiM7AA/hqdefault.jpg",
          //   "author_name": "iva1nqueur",
          //   "provider_name": "Instagram",
          //   "provider_icon_url": "https://res.cloudinary.com/dyrneab5i/image/upload/v1695022143/ig-icon.png"
          // },
          {
            "type": "image",
            "image_url": postData.firstMediaUrl,
            "alt_text": postData.caption
          }
        ]
      }
    }
    // const postData = await getFirstPost(req.query.url);
    slackApp.client.chat.unfurl({
      channel: req.body.event.channel,
      ts: req.body.event.message_ts,
      unfurls: {
        ...toReturn
      }
    })
    console.log(toReturn)
  }
})
