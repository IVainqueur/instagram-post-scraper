import puppeteer from "puppeteer";

let browser = null;

export async function getBrowser() {
  if (browser) {
    console.log("returning existing browser");
    return browser;
  }
  console.log("launching browser...");
  browser = await puppeteer.launch({
    ...(process.env.NODE_ENV === 'production' ? {}: {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    }),
    headless: true,
  });
  console.log("browser launched");
  return browser;
}

export const getFirstPost = async (url) => {
  if (!validateInstagramUrl(url)) {
    return {
      firstMediaUrl: "https://placehold.co/500x500?text=INVALID-INSTA-LINK",
    };
  }
  url = formatInstagramUrl(url);
  try {
    if (!browser) await getBrowser();
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(20 * 1000);
    await page.goto(url);
    await page.waitForSelector("article [role=presentation]");
    const data = await page.evaluate(() => {
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
      const firstCommentUsername = document.querySelector('ul div[role=button] h2').innerText;

      if(posterUsername) toReturn.posterUsername = posterUsername;
      if(posterProfile) toReturn.posterProfile = posterProfile;
      if(firstCommentUsername === posterUsername) {
        toReturn.caption = document.querySelector('ul div[role=button] h2').nextElementSibling.innerText;
      }

      if (video && img) {
        const position = img.compareDocumentPosition(video);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) toReturn.firstMediaUrl = img.src;
        toReturn.firstMediaUrl = video.src;
      } else {
        toReturn.firstMediaUrl = !!img ? img.src : video.src;
      }

      return toReturn;
    });

    await page.close();
    return data;
  } catch (e) {
    console.log(e.message);
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
