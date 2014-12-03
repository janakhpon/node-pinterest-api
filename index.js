'use strict';

var fs		= require('fs'),
	request = require('request'),
	async	= require('async');

/*
 * Constructor function
 *
 * @param String username
 */

module.exports = function (username) {
	fs.exists(__dirname + '/cache', function (exists) {
		if (!exists) {
			fs.mkdir(__dirname + '/cache');
		}
	});

	// private members
	var cachePrefix = 'cache/pinterest_',
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
		var cacheFile = __dirname + '/' + cachePrefix + key + '.cache';
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
							return callback(data.toString());
						});
					} else {
						// The cache is older than 60 minutes
						return callback(null);
					}
				});
			} else {
				// The cache doesn't exist
				return callback(null);
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
		var cacheFile = __dirname + '/' + cachePrefix + key + '.cache';

		fs.writeFile(cacheFile, contents, function (err) {
			if (err) {
				console.error('Error adding response to cache at ' + cacheFile);
				throw err;
			} else if (callback) {
				return callback();
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

	function get(url, callback) {
		request(url, function (err, response, body) {
			if (err) {
				console.error('Error making GET request to endpoint ' + url);
				throw err;
			}

			if (response.statusCode !== 200) {
				console.error(response);
				throw new Error('Did not receive a 200 response when making GET request to endpoint ' + url);
			}

			return callback(JSON.parse(body));
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
				get('http://pinterestapi.co.uk/' + username + '/boards', function (response) {
					putCache('boards_' + username, JSON.stringify(response));
					boardsResponse = buildResponse(response.body);
					if (paginate) {
						boardsResponse = buildResponse(response.body);
					} else {
						boardsResponse = response.body;
					}
					return callback(boardsResponse);
				});
			} else {
				if (paginate) {
					boardsResponse = buildResponse(JSON.parse(cacheData).body);
				} else {
					boardsResponse = JSON.parse(cacheData).body;
				}
				return callback(boardsResponse);
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

		getCache(board, function (cacheData) {
			if (cacheData === null) {
				// Get data and put it in the cache
				get('https://api.pinterest.com/v3/pidgets/boards/' + username + '/' + board.replace(/#/g, '') + '/pins/', function (response) {
					putCache(board, JSON.stringify(response));
					if (paginate) {
						pins = buildResponse(response.data.pins);
					} else {
						pins = response.data.pins;
					}
					return callback(pins);
				});
			} else {
				if (paginate) {
					pins = buildResponse(JSON.parse(cacheData).data.pins);
				} else {
					pins = JSON.parse(cacheData).data.pins;
				}
				return callback(pins);
			}
		});
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
				return callback(buildResponse(allPins));
			});
		});
	}

	/*
     * Get data on pinIds
     *
     * @param Array pinIds
     * @param Function callback
     * @invoke callback(Object pins)
     */

	function getDataForPins(pinIds, callback) {
		var allPinsData = [];
		var groupedPinIds = [];

		for (var i = 0; i < pinIds.length; i += 10) {
			console.log(i, i+10);
			var pinIdGroup = pinIds.slice(i, i + 10);
			groupedPinIds.push(pinIdGroup);
		}

		async.each(groupedPinIds, function(groupOfPinIds, asyncCallback) {
			var pinIdsString = groupOfPinIds.join(',');
			getCache(pinIdsString, function (cacheData) {
				if (cacheData === null) {
					get('http://api.pinterest.com/v3/pidgets/pins/info/?pin_ids=' + pinIdsString, function (response) {
						putCache(pinIdsString, JSON.stringify(response));
						allPinsData = allPinsData.concat(response.data);
						asyncCallback();
					});
				} else {
					allPinsData = allPinsData.concat(JSON.parse(cacheData).data);
					asyncCallback();
				}
			});
		}, function (err) {
			if (err) {
				console.error('Error iterating through groups of pin IDs');
				throw err;
			}
			return callback(buildResponse(allPinsData));
		});

	}

	return {
		getDataForPins: getDataForPins,
		getPins: getPins,
		getBoards: getBoards,
		getPinsFromBoard: getPinsFromBoard,
		getCurrentPage: getCurrentPage,
		setCurrentPage: setCurrentPage,
		getItemsPerPage: getItemsPerPage,
		setItemsPerPage: setItemsPerPage
	};
};