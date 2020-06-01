# Viewable Header-Bidder/A9/Ad Manager Event-driven Controler

This is a tool I wrote to controll the loading and refreshing of viewable ads, using client-side Prebid.js and A9 to collect advertizer bids on an impression, and Google Ad Manager to actually deliver those impressions.

# Prebid
Getting Started for Developers: http://prebid.org/dev-docs/getting-started.html
This example uses a test version of Prebid.js hosted on our CDN that is not recommended for production use. It includes all available adapters. Production implementations should build from source or customize the build using the Download page to make sure only the necessary bidder adapters are included. 

# Settings
Viewablity Threshold: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

# Building
`tsc --module amd --outFile src/ads.js Ads.ts`
`open src/test.html`
`python -m SimpleHTTPServer`

https://github.com/klesun/ts-browser