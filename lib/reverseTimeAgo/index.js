// These functions are based off of the way it is believed that Pinterest does their time ago approximations, which would be:
// The given time is always rounded down to the floor, so:
// 2 minutes old persists until the pin has been up for 3 minutes
// 5 hours old persists until the pin has been up for 6 hours
// etc.
// This is opposed to rounding (i.e. 1 minute would persist when the pin is between 30 and 90 seconds old)

function getEarliestTimeAgoInMs(value, unit) {
    var MINUTE_IN_SECONDS = 60;
    var HOUR_IN_SECONDS = 60 * MINUTE_IN_SECONDS;
    var DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS;
    var WEEK_IN_SECONDS = 7 * DAY_IN_SECONDS;
    var YEAR_IN_SECONDS = 365 * DAY_IN_SECONDS;
    var seconds;

    switch (unit) {
        case 'minute':
            seconds = value * MINUTE_IN_SECONDS;
            return (seconds + MINUTE_IN_SECONDS - 1) * 1000;
        case 'hour':
            seconds = value * HOUR_IN_SECONDS;
            return (seconds + HOUR_IN_SECONDS - 1) * 1000;
        case 'day':
            seconds = value * DAY_IN_SECONDS;
            return (seconds + DAY_IN_SECONDS - 1) * 1000;
        case 'week':
            seconds = value * WEEK_IN_SECONDS;
            return (seconds + WEEK_IN_SECONDS - 1) * 1000;
        // pinterest does not ever seem to do months
        case 'year':
            seconds = value * YEAR_IN_SECONDS;
            return (seconds + YEAR_IN_SECONDS - 1) * 1000;
    }
}

function getEarliestTimeAgoDateFromTimeAgoText(timeAgoText, dateToStartFrom) {
    var splitText = timeAgoText.split(' ');
    if (splitText[0].toLowerCase() === 'just') { // Just Now
      return 59 * 1000;
    }
    var value = Number(splitText[0]);
    var unit = splitText[1].toLowerCase();

    if (unit[unit.length - 1] === 's') { // make sure units are always singular
      unit = unit.slice(0, unit.length - 1);
    }

    var earliestTimeAgoInMs = getEarliestTimeAgoInMs(value, unit);
    dateToStartFrom = dateToStartFrom ? dateToStartFrom : new Date();
    var earliestTimeAgoDate = new Date(dateToStartFrom - earliestTimeAgoInMs);

    return earliestTimeAgoDate;
}

exports.getEarliestTimeAgoInMs = getEarliestTimeAgoInMs;
exports.getEarliestTimeAgoDateFromTimeAgoText = getEarliestTimeAgoDateFromTimeAgoText;