'use strict';

var fs			= require('fs'),
	request 	= require('request'),
	async		= require('async'),
	parseString	= require('xml2js').parseString;

fs.exists(__dirname + '/cache', function (exists) {
	if (!exists) {
		fs.mkdir(__dirname + '/cache');
	}
});

// private members
var CACHE_PREFIX = 'cache/pinterest_',
	itemsPerPage = null, // all results on 1 page by default
	currentPage = 1;

/* 
 * Get the item from the cache if exists
 *
 * @param string key
 * @param Function callback
 * @invoke callback(mixed response)
 */

function getCache(key, callback) {
	key = key.replace(/\//g, '-');
	var cacheFile = __dirname + '/' + CACHE_PREFIX + key + '.cache';
	fs.exists(cacheFile, function (exists) {
		if (exists) {
			fs.stat(cacheFile, function (err, stats) {
				if (err) {
					throw err;
				}
				if (stats.mtime.valueOf() > (new Date().valueOf() - 60 * 60 * 1000)) {
					// The cache is less than 60 minutes old so return the contents
					fs.readFile(cacheFile, function (err, data) {
						if (err) {
							console.error('Error reading the cache file at ' + cacheFile);
							throw err;
						}
						var dataString = data.toString();
						var dataObj;
						try {
							dataObj = JSON.parse(dataString);
						} catch(e) {
							dataObj = null;
						}
						callback(dataObj);
						return;
					});
				} else {
					// The cache is older than 60 minutes
					callback(null);
					return;
				}
			});
		} else {
			// The cache doesn't exist
			callback(null);
			return;
		}
	});
}

/* 
 * Put an item in the cache
 *
 * @param string key
 * @param JSON contents
 * @param Function callback (optional)
 * @invoke callback()
 */

function putCache(key, contents, callback) {
	key = key.replace(/\//g, '-');
	var cacheFile = __dirname + '/' + CACHE_PREFIX + key + '.cache';

	fs.writeFile(cacheFile, contents, function (err) {
		if (err) {
			console.error('Error adding response to cache at ' + cacheFile);
			throw err;
		} else if (callback) {
			callback();
			return;
		}
	});
}

/* 
 * Method to make GET request
 *
 * @param string url
 * @param Function callback
 * @invoke callback(Object response)
 */

function get(url, shouldParse, callback) {
	request(url, function (err, response, body) {
		if (err) {
			console.error('Error making GET request to endpoint ' + url);
			throw err;
		}

		if (response.statusCode !== 200) {
			console.error(response);
			throw new Error('Did not receive a 200 response when making GET request to endpoint ' + url);
		}

		var toReturn = shouldParse ? JSON.parse(body) : body;
		callback(toReturn);
		return;
	});
}

/* 
 * Build the response, wraps the data in some extra information like currentpage etc.
 *
 * @param Array data
 * @return Object response
 */

function buildResponse(data) {
	var response = {};
	response.totalItems = data.length;
	response.itemsPerPage = itemsPerPage;
	response.totalPages = itemsPerPage === null ? 1 : Math.ceil(data.length / itemsPerPage);
	response.currentPage = itemsPerPage === null ? 1 : currentPage;
	response.data = itemsPerPage === null ? data : data.slice(itemsPerPage * (currentPage - 1), itemsPerPage);

	return response;
}

/*
 * Get the pin ID out of a pin URL
 *
 * @param String pinUrl
 * @return String pinId
 */

function getPinIdFromUrl(pinUrl) {
	var startIndex = pinUrl.indexOf('pin/') + 4;
	var endIndex = pinUrl.indexOf('/', startIndex);
	endIndex = endIndex === -1 ? pinUrl.length + 1 : endIndex;
	return pinUrl.slice(startIndex, endIndex);
}

/*
 * Create a map of pin IDs to publish dates based on the object created using the XML parseString library
 *
 * @param Object xmlObject
 * @return Object pinDateMap
 */

function createPinDateMapFromRssXmlObject(xmlObject) {
	var pinDateMap = {};
	var pins = xmlObject.rss.channel[0].item;
	for (var i = 0; i < pins.length; i++) {
		var publishDate = new Date(pins[i].pubDate[0]);
		var pinId = getPinIdFromUrl(pins[i].guid[0]);
		pinDateMap[pinId] = publishDate;
	}
	return pinDateMap;
}

/*
 * Returns a map of pin IDs to publish dates based on the GET request response to the pinterest board XML URLs
 *
 * @param String response
 * @param Function callback
 * @invokes callback(Object pinDateMap)
 */

function getPinDateMapFromBoardRssGetResponse(response, board, callback) {
	parseString(response, function (err, result) {
		if (err) {
			// Don't throw because pinterest either does not have RSS feeds for boards with special characters
			// or we just haven't been able to figure out how they are handling special characters.
			// Either way, the response will be HTML in predictable cases like this, so we don't want to throw.
			console.error('Error getting RSS feed for board ' + board + '. Unable to retrieve publish dates. This is expected to happen if the board name contains an escaped character');
			callback({});
			return;
		}
		callback(createPinDateMapFromRssXmlObject(result));
		return;
	});
}

/*
 * Get publish dates for each pin on a board (max 50)
 *
 * @param String board
 * @param Function callback
 * @invokes callback(Object pinDateMap)
 */

function getDatesForBoardPinsFromRss(username, board, callback) {
	getCache(board + '_RSS', function (cacheData) {
		if (cacheData === null) {
			get('http://www.pinterest.com/' + username + '/' + board.replace(/#/g, '') + '.rss', false, function (response) {
				putCache(board + '_RSS', JSON.stringify(response));
				getPinDateMapFromBoardRssGetResponse(response, board, callback);
			});
		} else {
			getPinDateMapFromBoardRssGetResponse(cacheData, board, callback);
		}
	});
}

/*
 * Constructor function
 *
 * @param String username
 */

function constructor(username) {
	// public members

	/*
	 * Set itemsPerPage variable
	 *
	 * @param Mixed newItemsPerPage
	 */

	function setItemsPerPage(newItemsPerPage) {
		itemsPerPage = newItemsPerPage;
	}

	/*
	 * Get itemsPerPage variable
	 *
	 */

	function getItemsPerPage() {
		return itemsPerPage;
	}

	/*
	 * Set currentPage variable
	 *
	 * @param Number newItemsPerPage
	 */

	function setCurrentPage(newCurrentPage) {
		currentPage = newCurrentPage;
	}

	/*
	 * Get currentPage variable
	 *
	 */

	function getCurrentPage() {
		return currentPage;
	}

	/*
	 * Get all the boards for the user
	 *
	 * @param boolean paginate
	 * @param Function callback
	 * @invoke callback(Mixed boards)
	 */

	function getBoards(paginate, callback) {
		var boardsResponse;

		// Check for cache existence
		getCache('boards_' + username, function (cacheData) {
			if (cacheData === null) {
				// Create get request and put it in the cache
				get('http://pinterestapi.co.uk/' + username + '/boards', true, function (response) {
					putCache('boards_' + username, JSON.stringify(response));
					boardsResponse = buildResponse(response.body);
					if (paginate) {
						boardsResponse = buildResponse(response.body);
					} else {
						boardsResponse = response.body;
					}
					callback(boardsResponse);
					return;
				});
			} else {
				if (paginate) {
					boardsResponse = buildResponse(cacheData.body);
				} else {
					boardsResponse = cacheData.body;
				}
				callback(boardsResponse);
				return;
			}
		});
	}

	/*
     * Get pins from a single board
     *
     * @param string board
     * @param boolean paginate
     * @param Function callback
     * @invoke callback(Mixed pins)
     */

	function getPinsFromBoard(board, paginate, callback) {
		var pins;
		var pinDateMap;

		async.parallel([
			function (asyncCallback) {
				getCache(board, function (cacheData) {
					if (cacheData === null) {
						// Get data and put it in the cache
						get('https://api.pinterest.com/v3/pidgets/boards/' + username + '/' + board.replace(/#/g, '') + '/pins/', true, function (response) {
							putCache(board, JSON.stringify(response));
							pins = response.data.pins;
							asyncCallback();
						});
					} else {
						pins = cacheData.data.pins;
						asyncCallback();
					}
				});
			},
			function (asyncCallback) {
				getDatesForBoardPinsFromRss(username, board, function (dates) {
					pinDateMap = dates;
					asyncCallback();
				});
			}],
			function (err) {
				if (err) { throw err; }
				for (var i = 0; i < pins.length; i++) {
					pins[i].created_at = '';
					if (pinDateMap[pins[i].id]) {
						pins[i].created_at = pinDateMap[pins[i].id];
					}
				}

				if (paginate) {
					pins = buildResponse(pins);
				}

				callback(pins);
				return;
			}
		);
	}

	/*
     * Get all the user's pins (from all boards we can get)
     *
     * @param Function callback
     * @invoke callback(Object pins)
     */

	function getPins(callback) {
		var allPins = [];
		getBoards(false, function (boards) {
			async.each(boards, function(board, asyncCallback) {
				var splitHref = board.href.split('/');
				if (splitHref[1] === username) { // it's possible to have boards listed from other users
					var boardHref = board.href.split('/')[2];
					getPinsFromBoard(boardHref, false, function (pins) {
						allPins = allPins.concat(pins);
						asyncCallback();
					});
				} else {
					asyncCallback();
				}
			},
			function (err) {
				if (err) {
					console.error('Error iterating through each board to get pins');
					throw err;
				}
				callback(buildResponse(allPins));
				return;
			});
		});
	}

	return {
		getPins: getPins,
		getBoards: getBoards,
		getPinsFromBoard: getPinsFromBoard,
		getCurrentPage: getCurrentPage,
		setCurrentPage: setCurrentPage,
		getItemsPerPage: getItemsPerPage,
		setItemsPerPage: setItemsPerPage
	};
}

// Static methods

/*
 * Get data on pinIds
 *
 * @param Array pinIds
 * @param Function callback
 * @invoke callback(Object pins)
 */

constructor.getDataForPins = function(pinIds, callback) {
	var allPinsData = [];
	var groupedPinIds = [];
	var APIMaxPinsAllowedPerRequest = 10;

	for (var i = 0; i < pinIds.length; i += APIMaxPinsAllowedPerRequest) {
		var pinIdGroup = pinIds.slice(i, i + APIMaxPinsAllowedPerRequest);
		groupedPinIds.push(pinIdGroup);
	}

	async.eachLimit(groupedPinIds, 50, function(groupOfPinIds, asyncCallback) {
		var pinIdsString = groupOfPinIds.join(',');
		getCache(pinIdsString, function (cacheData) {
			if (cacheData === null) {
				get('http://api.pinterest.com/v3/pidgets/pins/info/?pin_ids=' + pinIdsString, true, function (response) {
					putCache(pinIdsString, JSON.stringify(response));
					allPinsData = allPinsData.concat(response.data);
					asyncCallback();
				});
			} else {
				allPinsData = allPinsData.concat(cacheData.data);
				asyncCallback();
			}
		});
	}, function (err) {
		if (err) {
			console.error('Error iterating through groups of pin IDs');
			throw err;
		}
		callback(buildResponse(allPinsData));
		return;
	});

};

module.exports = constructor;