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
    gmAPI = new GoogleMapsAPI(publicConfig),

    _transitNameByType = {
        "SUBWAY": function () {
            return this.line.name + " -> " + this.headsign + " @ " + this.departure_stop.name;
        },
        "BUS": function () {
            return this.headsign + " @ " + this.departure_stop.name;
        },
        "HEAVY_RAIL": function () {
            return this.line.name + " -> " + this.headsign + " @ " + this.departure_stop.name;
        }
    },

    _firstTransitProcessingByType = {
        "SUBWAY": function (transit, walkDuration) {
            if (undefined === this.subway.walkDuration || walkDuration < this.subway.walkDuration) {
                this.subway.walkDuration = walkDuration;
                this.subway.name = transit.line.name;
                this.subway.station = transit.departure_stop.name
            }
        },
        "BUS": function (transit, walkDuration) {
            var isFastBus = -1 < (config["fast-bus"] || []).indexOf(transit.line.short_name),
                isShorterWalk = undefined === this.bus.walkDuration || walkDuration < this.bus.walkDuration;
            if (isFastBus && !this.bus.fast || isShorterWalk) {
                this.bus.walkDuration = walkDuration;
                this.bus.name = transit.headsign;
                this.bus.fast = isFastBus;
            }
        },
        "HEAVY_RAIL": function () {
            console.warn("Do not compute HEAVY_RAIL");
        }
    };

function _processRoute (options, route, index) {
    // this is the result
    var leg = route.legs[0],
        duration = leg.duration.value,
        firstTransit = true,
        walkDuration = 0;
    // duration
    this.minDuration = Math.min(duration, this.minDuration);
    this.maxDuration = Math.max(duration, this.maxDuration);
    this.meanDuration += duration;
    if (options.verbose) {
        console.log("[" + index + "] distance: " + leg.distance.text + " duration: " + leg.duration.text);
    }
    leg.steps.forEach(function (step) {
        var mode = step.travel_mode,
            msg = ["\t", mode],
            transit,
            transitType;
        if ("TRANSIT" === mode) {
            transit = step.transit_details;
            transitType = transit.line.vehicle.type;
            if (firstTransit) {
                firstTransit = false;
                try {
                    _firstTransitProcessingByType[transitType].call(this, transit, walkDuration);
                } catch (e) {
                    console.error("Error while processing transit " + transitType + "\n", JSON.stringify(transit));
                }

            }
            msg.push(" ", _transitNameByType[transitType].call(transit));
        } else {
            walkDuration = step.duration.value;
        }
        msg.push(" distance: ", step.distance.text, " duration: ", step.duration.text);
        if (options.verbose) {
            console.log(msg.join(""));
        }
    }, this);
}

function _toMin (seconds) {
    if (undefined !== seconds) {
        return Math.ceil(seconds / 60);
    }
}

function _analyzeRoutes (routes, options) {
    var result = {
        minDuration: 24*60*60,
        meanDuration: 0,
        maxDuration: 0,
        // Closest subway
        subway: {
            walkDuration: undefined,
            name: "",
            station: ""
        },
        // Closest bus
        bus: {
            walkDuration: undefined,
            name: "",
            fast: false
        }
    };
    routes.forEach(_processRoute.bind(result, options));
    // Approximate everything in minutes
    result.minDuration = _toMin(result.minDuration);
    result.meanDuration = _toMin(result.meanDuration / routes.length);
    result.maxDuration = _toMin(result.maxDuration);
    result.subway.walkDuration = _toMin(result.subway.walkDuration);
    result.bus.walkDuration = _toMin(result.bus.walkDuration);
    return result;
}

module.exports = function (options) {
    return new Promise(function (resolve, reject) {
        gmAPI.directions({
            origin: options.from,
            destination: options.to,
            mode: "transit",
            alternatives: true,
            units: "metric",
            departure_time: options.when || new Date()

        }, function (err, results) {
            if (err) {
                reject(err);
            } else {
                resolve(_analyzeRoutes(results.routes, options));
            }
        });
    });
};
