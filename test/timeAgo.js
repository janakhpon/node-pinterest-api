var assert			= require("assert"),
	reverseTimeAgo	= require('../lib/reverseTimeAgo');

describe('reverseTimeAgo', function (){

	describe('#getEarliestTimeAgoInMs()', function () {

		it('should return the second before the following minute when given a minute value', function () {
			// 2 minutes and 59 seconds in MS
			var testTimeInMs = ((3 * 60) - 1) * 1000
			assert.equal(testTimeInMs, reverseTimeAgo.getEarliestTimeAgoInMs(2, 'minute'));
		});

		it('should return the second before the following hour when given an hour value', function () {
			// 8 hours and 59 minutes and 59 seconds in MS
			var testTimeInMs = (((9 * 60 * 60) - 1) * 1000);
			assert.equal(testTimeInMs, reverseTimeAgo.getEarliestTimeAgoInMs(8, 'hour'));
		});

		it('should return the second before the following day when given a day value', function () {
			// 4 days 23 hours 59 minuts 59 seconds in MS
			var testTimeInMs = (((5 * 24 * 60 * 60) - 1) * 1000);
			assert.equal(testTimeInMs, reverseTimeAgo.getEarliestTimeAgoInMs(4, 'day'));
		});

		it('should return the second before the following week when given a week value', function () {
			// 51 weeks 6 days 23 hours 59 minutes 59 seconds in MS
			var testTimeInMs = (((52 * 7 * 24 * 60 * 60) - 1) * 1000);
			assert.equal(testTimeInMs, reverseTimeAgo.getEarliestTimeAgoInMs(51, 'week'));
		});

		it('should return the second before the following year when given a year value', function () {
			// 1 years 51 weeks 6 days 23 hours 59 minutes 59 seconds in MS
			var testTimeInMs = (((2 * 365 * 24 * 60 * 60) - 1) * 1000);
			assert.equal(testTimeInMs, reverseTimeAgo.getEarliestTimeAgoInMs(1, 'year'));
		});
	});

	describe('#getEarliestTimeAgoDateFromTimeAgoText()', function () {
		var testYear = 2014,
			testMonth = 11,
			testDay = 8,
			testHour = 8,
			testMinute = 20,
			testSecond = 2,
			testMs = 200;

		it('should give a date 1 second less than 44 weeks before the test date when given 43 weeks and the test date', function () {
			var testDate = new Date(testYear, testMonth, testDay, testHour, testMinute, testSecond, testMs);
			var testTimeInMs = (((4 * 7 * 24 * 60 * 60) - 1) * 1000);
			var answerDate = new Date(testDate - testTimeInMs);
			assert.equal(answerDate.valueOf(), reverseTimeAgo.getEarliestTimeAgoDateFromTimeAgoText('3 weeks ago', testDate).valueOf());
		});
	});
});