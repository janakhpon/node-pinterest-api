'use strict';

var fs		= require('fs'),
	request = require('request'),
	async	= require('async');

/*
 * Constructor function
 *
 * @param String username
 */

function pinterestAPI(username) {
	fs.exists('./cache', function (exists) {
		if (!exists) {
			fs.mkdir('./cache');
		}
	});

	// private members
	var cachePrefix = 'cache/pinterest_',
		itemsPerPage = 25,
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
		var cacheFile = './' + cachePrefix + key + '.cache';
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
							callback(data.toString());
						});
					} else {
						// The cache is older than 60 minutes
						callback(null);
					}
				});
			} else {
				// The cache doesn't exist
				callback(null);
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
		var cacheFile = './' + cachePrefix + key + '.cache';

		fs.writeFile(cacheFile, contents, function (err) {
			if (err) {
				console.error('Error adding response to cache at ' + cacheFile);
				throw err;
			} else if (callback) {
				callback();
			}
		});
	}

	/* 
	 * Method to make GET request
	 *
	 * @param string url
	 * @param Function callback
	 * @invoke callback(JSON response)
	 */

	function getJSON(url, callback) {
		request(url, function (err, response, body) {
			if (err) {
				console.error('Error making GET request to endpoint ' + url);
				throw err;
			}

			if (response.statusCode !== 200) {
				throw new Error('Did not receive a 200 response when making GET request to endpoint ' + url);
			}

			callback(JSON.parse(body));
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
		response.totalPages = Math.ceil(data.length / itemsPerPage);
		response.currentPage = currentPage;
		response.data = data.slice(itemsPerPage * (currentPage - 1), itemsPerPage);

		return response;
	}

	// public members

	/*
	 * Set itemsPerPage variable
	 *
	 * @param Number newItemsPerPage
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
	 * @invoke callback(Array boards)
	 */

	function getBoards(paginate, callback) {
		var boardsResponse;

		// Check for cache existence
		getCache('boards_' + username, function (cacheData) {
			if (cacheData === null) {
				// Create get request and put it in the cache
				getJSON('http://pinterestapi.co.uk/' + username + '/boards', function (response) {
					putCache('boards_' + username, JSON.stringify(response));
					boardsResponse = buildResponse(response.body);
					callback(buildResponse(response.body));
					if (paginate) {
						boardsResponse = buildResponse(response.body);
					} else {
						boardsResponse = response.body;
					}
					callback(boardsResponse);
				});
			} else {
				if (paginate) {
					boardsResponse = buildResponse(JSON.parse(cacheData).body);
				} else {
					boardsResponse = JSON.parse(cacheData).body;
				}
				callback(boardsResponse);
			}
		});
	}

	/*
     * Get pins from a single board
     *
     * @param string board
     * @param boolean paginate
     * @param Function callback
     * @invoke callback(JSON pins)
     */

	function getPinsFromBoard(board, paginate, callback) {
		var pins;

		getCache(board, function (cacheData) {
			if (cacheData === null) {
				// Get data and put it in the cache
				getJSON('https://api.pinterest.com/v3/pidgets/boards/' + username + '/' + board + '/pins/', function (response) {
					putCache(board, JSON.stringify(response));
					if (paginate) {
						pins = buildResponse(response.data.pins);
					} else {
						pins = response.data.pins;
					}
					callback(pins);
				});
			} else {
				if (paginate) {
					pins = buildResponse(JSON.parse(cacheData).data.pins);
				} else {
					pins = JSON.parse(cacheData).data.pins;
				}
				callback(pins);
			}
		});
	}

	/*
     * Get all the user's pins (from all boards we can get)
     * Pins are sorted descending
     *
     * @param Function callback
     * @invoke callback(Array pins)
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