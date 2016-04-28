require("./checkTransit.js")({
    from: process.argv[3],
    to: "Collège international Marie de France, 4635 Chemin Queen Mary, Montréal, QC H3W 1W3",
    when: new Date(2016, 3, 25, 7, 0, 0),
    verbose: true

}).then(function (res) {
    console.log("Duration (mins): min=", res.minDuration, " mean=", res.meanDuration, " max=", res.maxDuration);
    if (undefined !== res.subway.walkDuration) {
        console.log("Closest subway:", res.subway.name, "@", res.subway.station, res.subway.walkDuration, "mins");
    }
    if (undefined !== res.bus.walkDuration) {
        console.log("Closest bus:", res.bus.name, res.bus.walkDuration, "mins", (res.bus.fast ? "EXPRESS" : ""));
    }

}, function (err) {
    console.error(err);
});
