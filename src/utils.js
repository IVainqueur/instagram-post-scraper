import puppeteer from "puppeteer";
import { v2 as cloudinary } from "cloudinary";

export const configureCloudinary = () => {
  cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

let browser = null;
const toBlock = [
  'stylesheet',
  'font',
]

export async function getBrowser() {
  try {
    if (browser) {
      console.log("returning existing browser");
      return browser;
    }
    console.log("launching browser...");
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ],
      ...(process.env.NODE_ENV === 'production' ? {}: {}),
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
    });
    console.log("browser launched");
  } catch (e) {
    console.log("[error] failed to launch browser", e.message)
  } finally {
    return browser;
  }
}

export const getFirstPost = async (url) => {
  console.time("getFirstPost")
  if (!validateInstagramUrl(url)) {
    return {
      firstMediaUrl: "https://placehold.co/500x500?text=INVALID-INSTA-LINK",
    };
  }
  url = formatInstagramUrl(url);
  try {
    if (!browser) await getBrowser();
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if(toBlock.includes(req.resourceType())){
            req.abort();
        }
        else {
            req.continue();
        }
    });

    await page.setDefaultNavigationTimeout(20 * 1000);
    await page.goto(url);
    await page.waitForSelector("article [role=presentation]");
    const data = await page.evaluate(async () => {
      function generateThumbnail(video) {
        const canvas = document.createElement('canvas');
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        return canvas.toDataURL();
      }
      const waitFor = (ms) => new Promise(r => setTimeout(r, ms));
      const toReturn = {
        firstMediaUrl: "",
        caption: "",
        posterUsername: "",
        posterProfile: "",
      }
      const video = document.querySelector("article [playsinline]");
      const img = document.querySelector("article img[crossorigin=anonymous][sizes]");
      const posterUsername = document.querySelector('header span[dir=auto]').innerText ;
      const posterProfile = document.querySelector('header div img').src;
      const firstCommentUsername = document.querySelector('ul div[role=button] h2')?.innerText;

      if(posterUsername) toReturn.posterUsername = posterUsername;
      if(posterProfile) toReturn.posterProfile = posterProfile;
      if(firstCommentUsername === posterUsername) {
        toReturn.caption = document.querySelector('ul div[role=button] h2').nextElementSibling.innerText;
        if(toReturn.caption.length > 100) toReturn.caption = toReturn.caption.substring(0, 100) + '...';
      } else {
        toReturn.caption = "[No Caption]"
      }

      if (video && img) {
        const position = img.compareDocumentPosition(video);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) toReturn.firstMediaUrl = img.src;
        toReturn.firstMediaUrl = video.src;
      } else {
        toReturn.firstMediaUrl = !!img ? img.src : video.src;
      }

      // GENERATE THUMBNAIL
      if(video) {
        const vid = document.createElement('video');
        video.load()
        vid.crossOrigin = "anonymous";
        vid.src = video.src;
        vid.currentTime = 1;
        await waitFor(2000)
        // console.log(generateThumbnail(vid))
        toReturn.videoThumbnail = generateThumbnail(vid)
      }

      return {
        ...toReturn,
        isVideo: !!video,
      };
    });
    if(data.videoThumbnail) {
      if(data.videoThumbnail.length > 10) data.videoThumbnail = await uploadToCloudinary(data.videoThumbnail);
    }
    // await page.close();
    console.timeEnd("getFirstPost")
    return data;
  } catch (e) {
    console.log(e.message);
    console.timeEnd("getFirstPost")
    return {
      firstMediaUrl: "https://placehold.co/500x500?text=FAILED-TO-LOAD"
    };
  }
};
export const validateInstagramUrl = (url) => {
  const regex = /https\:\/\/(?:www\.)instagram\.com\/(?:p|reel|reels|tv)\/\w+/g;
  return regex.test(url);
};

export const formatInstagramUrl = (url) => {
  url = url.replace(/reels/g, "reel");
  return url;
};

export const uploadToCloudinary = async (img) => {
  try {
    const { secure_url } = await cloudinary.uploader.upload(img, {
      folder: 'instagram'
    });
    console.log("Thumbnail: ", secure_url)
    return secure_url;
  } catch (e) {
    console.log("[error:cloudinary]",e)
    return null;
  }
}

