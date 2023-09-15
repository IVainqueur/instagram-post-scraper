# Instagram-Post-Scraper
Get the first image/video of an instagram post or reel and the caption with no need for a API key or tokens, just utilising the power of puppeteer 😎.

## Installation
1. Clone the repo
2. Run `pnpm i`  to install the packages
3. create a `.env` file and add the path to your browser's executable file (chrome or firefox) as `PUPPETEER_EXECUTABLE_PATH`
4. Run `pnpm start` to start the server

## Usage
Send a `GET` request to `http://localhost:4000?url=<url>` where `<url>` is the url of the post or reel you want to scrape.

> Note: `4000` is the default port but you can change it by setting the `PORT` environment variable.

## Contribute
Feel free to open an issue or a pull request if you find a bug or want to add a feature.

## License
[MIT](./LICENSE)