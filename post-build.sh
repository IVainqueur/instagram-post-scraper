#!/bin/sh
echo "Copying cache"
pwd
if [ "$IS_CYCLIC" = "true" ]; then
  cp -r /tmp/ivainqueur-instagram-post-scraper/.cache/puppeteer /.cache/puppeteer
fi