var fs = require("fs"),
    configName = process.argv[2] || "config",
    config = JSON.parse(fs.readFileSync("tmp/" + configName + ".json").toString()),
    GoogleMapsAPI = require("googlemaps"),
    publicConfig = {
        key: config["google-api-key"],
        stagger_time:       1000, // for elevationPath
        encode_polylines:   false,
        secure:             true // use https
    },
    gmAPI = new GoogleMapsAPI(publicConfig);
gmAPI.directions({
    origin: "45.462942, -73.649336",
    destination: "Collège international Marie de France, 4635 Chemin Queen Mary, Montréal, QC H3W 1W3",
    mode: "transit",
    alternatives: true,
    units: "metric",
    departure_time: new Date(2016, 3, 25, 7, 0, 0)

}, function (err, results) {
    if (err) {
        console.error(err);
    } else {
        // fs.writeFileSync("tmp/map_result.json", JSON.stringify(results));
        // Dump a shorten'ed result
        results.routes.forEach(function (route) {
            console.log("distance: " + route.legs[0].distance.text + " duration: " + route.legs[0].duration.text);
            route.legs[0].steps.forEach(function (step) {
                var msg = [">> ", step.travel_mode];
                if (step.travel_mode === "TRANSIT") {
                    msg.push(" ", step.transit_details.headsign);
                }
                msg.push(" distance: ", step.distance.text, " duration: ", step.duration.text);
                console.log(msg.join(""));
            });
        })

    }
});
