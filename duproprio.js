"use strict";

var fs = require("fs"),
    webDriver = require("selenium-webdriver"),
    By = require("selenium-webdriver").By,
    until = require("selenium-webdriver").until,
    chrome = new webDriver.Builder()
        .forBrowser("chrome")
        .build(),
    configName = process.argv[2] || "config",
    config = JSON.parse(fs.readFileSync("tmp/" + configName + ".json").toString()),
    db = require("./csvdb.js");

function verbose(text) {
    console.log(text);
}

function extractProperty () {
    var property = {};
    return chrome.getCurrentUrl()
        .then(function (url) {
            property.url = url;
            return chrome.findElements(By.tagName("body"));
        })
        .then(function (elements) {
            return elements[0].getAttribute("data-code");
        })
        .then(function (dataCode) {
            property.id = dataCode;
            return chrome.findElements(By.className("price-title"));
        })
        .then(function (elements) {
            return elements[0].getText();
        })
        .then(function (priceText) {
            property.price = parseInt(priceText.replace(/ /g, ""), 10);
            return chrome.findElements(By.id("search-map-street-view"));
        })
        .then(function (elements) {
            return elements[0].findElements(By.tagName("a"));
        })
        .then(function (elements) {
            return elements[0].getAttribute("href");
        })
        .then(function (text) {
            // https://www.google.ca/maps/?cbll=45.445036900000000000,-73.694598600000000000&cbp=12,20.09,,0,5&layer=c
            property.mapUrl = "https://maps.google.ca/?z=15&hl=fr&q=" + text.split("?cbll=")[1].split("&")[0];
            return db.add(property);
        })
    ;
}

verbose("Opening database");
db.init("duproprio")
    .then(function () {
        verbose("Opening website");
        return chrome.get(config.search.duproprio);
    })
    .then(function () {
        // Click the first image
        return chrome.findElements(By.className("showimage-house"));
    })
    .then(function (firstHouseImages) {
        return firstHouseImages[0].click();
    })
    // Loop on properties
    .then (function () {
        var done,
            promise = new Promise(function (resolve) {
                done = resolve;
            });
        function process () {
            // Due to synchronization issue, we may have to repeat once the extraction
            extractProperty()
                .then(next)
                .catch(function () {
                    extractProperty().then(next);
                });
        }
        function next () {
            chrome.findElements(By.className("next"))
                .then(function (elements) {
                    var button = elements[0];
                    button.getText()
                        .then(function (buttonText) {
                            if ("Photo suivante" === buttonText) {
                                done();
                            } else {
                                button.click()
                                    .then(function () {
                                        process();
                                    });
                            }
                        });
                });
        }
        process();
        return promise;
    })
    .then(function () {
        console.log("OK");
    })
;
