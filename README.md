# Viewable Header-Bidder/A9/Ad Manager Event-driven Controler

This is a tool I wrote to controll the loading and refreshing of viewable ads, using client-side Prebid.js and A9 to collect advertizer bids on an impression, and Google Ad Manager to actually deliver those impressions.

# Prebid
Getting Started for Developers: http://prebid.org/dev-docs/getting-started.html
This example uses a test version of Prebid.js hosted on our CDN that is not recommended for production use. It includes all available adapters. Production implementations should build from source or customize the build using the Download page to make sure only the necessary bidder adapters are included. 

# Configuration and Markup

## Download RequireJS and point your file at it
First, make sure you download RequireJS rather than use the one on their server, like in the example HTML file in /src/.

## Enter Prebid bidder and unit configuration
Then plug in your Prebid values as desribed at https://prebid.org and make sure the "code" matches the ID of the unit in Ad Manager, and is also used in 

    const adUnits = [
        {
            "code":"top_leaderboard",
            "mediaTypes":{
                "banner":{
                    "sizes":[[728,90],[320,50]]
                }
            },
            "bids":layout === 'small' ? [ // this is how you can use different bidder parameters for different layouts
                {bidder: 'appnexus', params: { placementId: 13144370}}
            ] : [
                {bidder: 'appnexus', params: { placementId: 13144370}}
            ]
        },
    ...more units

## Configure the Viewable/Interacted controller code

Then, configure the RequireJS path, and also the settings in when you initialize the Ads class to have your desired Google & A9 values:

    ads.initialize(adUnits, {
        timeout: 1500, // header bidder timeout, in milliseconds
        interactionThreshold: 60 * 1000, // user last-page-interaction, in milliseconds
        dfpUnitIdBase: '/123456/ad-unit-parent/', // /{networkcode}/{string}/
        a9Id: 'apstag-guid', // guid from Amazon
        viewability: {
            threshold: [0, 0.5]
        },
        retries: {
            wait: 31000, // interval between refreshes
            viewability: { // retry loading the unit on empty
                wait: 5000, // interval in milliseconds between trying to reload empty unit
                limit: 5 // number of times to retry reloading empty unit
            }
        }
    });

Viewablity Threshold settings described: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

## Enter the ad units into the body
Enter the ad units into the page, with a container div with the ID of your unit, and inside of that a script node to prime that unit within the controller.

    <div id="top_leaderboard">
        <script>adCommands.push(function(ads){ads.prime("top_leaderboard")});</script>
    </div>

# Building and Testing
Run `npm run tsc` to generate the ES5 JS, then `python -m SimpleHTTPServer` to start a simple web server, and finally `open http://locahost:8000/src/` to open the test page.
