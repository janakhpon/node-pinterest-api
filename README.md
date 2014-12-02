interest-api
==================

node client for the unofficial API to get pins and boards from a Pinterest user. Note that due to limitations in the unofficial API, this app will retrieve at most 50 pins per board.

Thanks to github user TakeTwoMerkidentiteit for making his/her PHP client for the unofficial Pinterest API, from which I more or less ported this (https://github.com/TakeTwoMerkidentiteit/Pinterest-API)

To install:
```
npm install pinterest-api
```

Methods
=================
```javascript
// import
var pinterestAPI = require('pinterest-api');

// Create a new object and set the accountname
var pinterest = pinterestAPI(accountName);

// Get pins from a board (second parameter determines whether you want the results paginated and to include some metadata)
pinterest.getPinsFromBoard(boardName, true, function (pins) {
	...
});

// Get all pins
pinterest.getPins(function (pins) {
	...
});

// Get all boards (first parameter determines whether you want the results pagined and to include some metadata)
pinterest.getBoards(true, function (boards) {
	...
});
```

The API returns all data with meta data. The results are 'paginated' but the default data per page is all the data. This is because given the 50 pin max per board limitation 
mentioned above, I don't think actual pagination will really be needed. However, the setting can be changed easily:

```javascript
pinterest.setItemsPerPage(50); // Set itemsPerPage to 50 (default is fitting all items on the first page, set this to null for if you change this and want to get back to default behavior)
```

If you need to change pages:
```javascript
pinterest.setCurrentPage(2); // Set current page to 2
```

If you want to get the itemsPerPage and currentPage settings:
```javascript
pinterest.getItemsPerPage();
pinterest.getCurrentPage();
```

Cache
=================
There is a very simple file caching system in place. The script will try to create the ./cache if it doesn't exist directory so be sure that your permissions have been set right.

Returned Data
=================
The API returns an object. Below is an example (remember that items_per_page is null by default, and just means all data will be on first page):

```
{
    total_items: 500,
    items_per_page: null,
    total_pages: 1,
    current_page: 1,
    data: [
        {
            attribution: null,
            description: "10 Misverstanden over Het Nieuwe Werken - News - Het Nieuwe Werken",
            pinner: {
                about: "Wij zijn een full-service bureau voor interieurprojecten. Wij ontwerpen, realiseren managen turn-key creatieve en duurzame interieurs.",
                location: "Utrecht",
                full_name: "Rever Interieurprojecten",
                follower_count: 48,
                image_small_url: "http://media-cache-ec0.pinimg.com/avatars/reverinspiratie_1393949212_30.jpg",
                pin_count: 525,
                id: "506444058005094518",
                profile_url: "http://www.pinterest.com/reverinterieur/"
            },
            repin_count: 0,
            dominant_color: "#eff7ee",
            like_count: 0,
            link: "https://cbreprojects.nl/hetnieuwewerken/news/detail/spread-propertynl/",
            images: {
                237x: {
                    url: "http://media-cache-ec0.pinimg.com/237x/1e/5d/e7/1e5de7f618686727bd373f8b032280bd.jpg",
                    width: 237,
                    height: 101
                }
            },
            embed: null,
            is_video: false,
            id: "506443920570421590"
        },
        [...]
    ]
}
```