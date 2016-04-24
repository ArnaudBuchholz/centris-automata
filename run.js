var fs = require("fs"),
    webDriver = require("selenium-webdriver"),
    By = require("selenium-webdriver").By,
    until = require("selenium-webdriver").until,
    chrome = new webDriver.Builder()
        .forBrowser("chrome")
        .build();

var SEARCH_TOWN = "Montréal",
    SEARCH_TOWN_SUB = "Tous les arrondissements"
;

function verbose(text) {
    console.log(text);
}

function wait (time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}

verbose("Opening website");
chrome.get("http://www.centris.ca/")
    // Process search field
    .then(function () {
        verbose("Locating search control");
        return chrome.findElements(By.id("search"))
            .then(function (elements) {
                verbose("Typing '" + SEARCH_TOWN + "'");
                return elements[0].sendKeys(SEARCH_TOWN);
            })
            .then(function () {
                verbose("Wait 1 second for autocomplete to appear");
                return wait(1000); // TODO find a better way
            })
            .then(function () {
                verbose("Getting autocomplete");
                return chrome.findElements(By.className("ui-autocomplete"));
            })
            .then(function (elements) {
                verbose("Listing second autocomplete children"); // TODO find a better way
                return elements[1].findElements(By.tagName("li"));
            })
            .then(function (elements) {
                var promises = [],
                    selectedIndex;
                elements.forEach(function (element) {
                    promises.push(element.getText());
                });
                return Promise.all(promises)
                    .then(function (texts) {
                        texts.every(function (text, index) {
                            verbose(">> " + text);
                            if (-1 < text.indexOf(SEARCH_TOWN_SUB)) {
                                selectedIndex = index;
                                return false;
                            }
                            return true;
                        });
                        verbose("Selecting index " + selectedIndex);
                        if (undefined === selectedIndex) {
                            return Promise.reject("Unable to locate '" + SEARCH_TOWN_SUB + "'");
                        }
                        return elements[selectedIndex].click();
                    });
            });
    })
    // Process slider
    .then(function () {
        verbose("Finding slider");
        var sliderRightHandle,
            currentPrixMax;
        return chrome.findElements(By.id("slider"))
            .then(function (elements) {
                // Get right handle of the slider
                return elements[0].findElements(By.tagName("a"));
            })
            .then(function (elements) {
                sliderRightHandle = elements.pop(); // Last
                return chrome.findElements(By.id("currentPrixMax"));
            })
            .then(function (elements) {
                currentPrixMax = elements[0];
                // Focus right handle
                return sliderRightHandle.click();
            })
            .then(function () {
                return currentPrixMax.getAttribute("data-value");
            })
            .then(function (currentPrice) {
                console.log(currentPrice);
            })
            .then(function () {
                var done,
                    promise = new Promise(function (resolve) {
                        done = resolve;
                    });

                return promise;
            })
        ;
    })
    .then(function () {
        console.log("OK");
    })
;
