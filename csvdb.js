"use strict";

var fs = require("fs"),
    configName = process.argv[2] || "config",
    config = JSON.parse(fs.readFileSync("tmp/" + configName + ".json").toString()),
    checkTransit = require("./checkTransit.js"),
    _csvType,
    _csvFileName,
    _csvNow = new Date().toISOString().split("T")[0],
    _csvIndex = [];

function _init (type) {
    var content,
        count;
    _csvType = type;
    _csvFileName = "tmp/" + _csvType + "-" + configName + ".csv";
    try {
        content = fs.readFileSync(_csvFileName, "utf8").toString();
        count = 0;
        content.split("\n").slice(1).forEach(function (record) {
            var id = record.split(",")[1];
            if (id) {
                id = id.replace(/"/g, "");
                ++count;
                _csvIndex.push(id);
            }
        });
        console.log("Loaded " + count + " records");
    } catch (e) {
        console.error(e);
        // Most probably the file does not exist
        fs.writeFileSync(_csvFileName, [
            "TYPE,ID,DATE",
            "URL,PRICE,GOOGLE",
            "MIN_CIMF,MEAN_CIMF,MAX_CIMF",
            "SUBWAY,SUBWAY_STATION,SUBWAY_DISTANCE",
            "BUS,BUS_DISTANCE,BUS_EXPRESS",
            "\r\n"
        ].join(","), "utf8");
    }
    return Promise.resolve();
}

function _add (record) {
    if (!record.id) {
        return Promise.reject("Missing record id");
    }
    if (-1 < _csvIndex.indexOf(record.id)) {
        console.log("Record already existing: " + record.id);
        return Promise.resolve();
    }
    // Extract GPS pos after &q= and check public transportation
    var fromGPS = record.mapUrl.split("&q=")[1];
    return checkTransit({
        from: fromGPS,
        to: "Collège international Marie de France, 4635 Chemin Queen Mary, Montréal, QC H3W 1W3",
        when: new Date(2016, 3, 25, 7, 0, 0), // 7:00 AM
    }).then(function (transit) {
        fs.appendFileSync(_csvFileName, "\"" + [
                _csvType,
                record.id,
                _csvNow,
                record.url,
                record.price,
                record.mapUrl,
                transit.minDuration,
                transit.meanDuration,
                transit.maxDuration,
                transit.subway.name,
                transit.subway.station,
                transit.subway.walkDuration || 0,
                transit.bus.name,
                transit.bus.walkDuration || 0,
                transit.bus.fast.toString()

            ].join("\",\"") + "\"\r\n", "utf8");
        console.log("New record: " + record.id);
        _csvIndex.push(record.id);
    });
}

module.exports = {
    init: _init,
    add: _add
};
