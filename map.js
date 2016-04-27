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
    origin: "45.476335, -73.607611", // "45.495324, -73.653786", //
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
        function transitName (transit_details) {
            if ("SUBWAY" === transit_details.line.vehicle.type) {
                return transit_details.line.name + "->" + transit_details.headsign + "@" + transit_details.departure_stop.name;
            } else {
                return transit_details.headsign + "@" + transit_details.departure_stop.name;
            }
        }
        var maxDuration = 0,
            subwayWalkDistance = 60*60,
            subwayStation;
        results.routes.forEach(function (route) {
            if (route.legs[0].duration.value > maxDuration) {
                maxDuration = route.legs[0].duration.value;
            }
            console.log("distance: " + route.legs[0].distance.text + " duration: " + route.legs[0].duration.text);
            route.legs[0].steps.forEach(function (step, index, steps) {
                var msg = [">> ", step.travel_mode];
                if (step.travel_mode === "TRANSIT") {
                    if (2 > index && "SUBWAY" === step.transit_details.line.vehicle.type) {
                        var walkDistance = 0;
                        if (1 === index) {
                            walkDistance = steps[0].duration.value;
                        }
                        if (walkDistance < subwayWalkDistance) {
                            subwayWalkDistance = walkDistance;
                            subwayStation = transitName(step.transit_details);
                        }
                    }
                    msg.push(" ", transitName(step.transit_details));
                }
                msg.push(" distance: ", step.distance.text, " duration: ", step.duration.text);
                console.log(msg.join(""));
            });
        });
        console.log("Max duration: " + Math.ceil(maxDuration / 60) + " min");
        if (subwayWalkDistance !== 3600) {
            console.log("Closest subway: " + subwayStation + " " + Math.ceil(subwayWalkDistance / 60) + " min");
        }
    }
});
