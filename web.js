var express = require('express');
var levenshtein = require('./levenshtein.js');
var app = express.createServer(express.logger());
var yelp = require("yelp").createClient({
  consumer_key: process.env.YELP_CONSUMER_KEY,
  consumer_secret: process.env.YELP_CONSUMER_SECRET,
  token: process.env.YELP_TOKEN,
  token_secret: process.env.YELP_TOKEN_SECRET
});

// Removes (..) blocks from string and lowercases it.
var lowercaseAndRemoveParens = function(string) {
  return string.replace(/(\(.+?\))*/gim, "").trim().toLowerCase();
};

// Returns whether this is a likely match based on Levenshtein, after spaces
// and punctuation are removed.
var likelyMatch = function(name, query) {
  var clean = function(a) {
    a = lowercaseAndRemoveParens(a);
    a = a.replace(/[- '*]*/gim, "");
    return a;
  };
  var dist = levenshtein.getEditDistance(clean(name), clean(query));
  return dist < 10;
};


app.get('/', function(request, response) {
  response.contentType('application/json');

  var returnError = function(thing) {
    return { "error": thing };
  };

  var query_term = request.query["s"];
  if (!query_term) {
    response.send(returnError("no search term: add ?s=olive+garden"));
    return;
  } else {
    query_term = lowercaseAndRemoveParens(query_term);
    console.log("search for: " + query_term);
  }

  var params = {};
  params.location = "335 madison ave, new york 10016";
  params.sort = 0; // Best match
  params.term = query_term; // The name we're searching for.
  params.limit = 10;

  yelp.search(params, function(error, data) {
    if (error) {
      response.send(returnError(error));
      return;
    }

    var business, result;
    for (var i = 0; i < data.businesses.length; i++) {
      business = data.businesses[i];
      if (likelyMatch(business.name, query_term)) {
      	result = {
      	  name: business.name,
      	  rating: business.rating,
          review_count: business.review_count,
          url: business.url
      	};
      	break;
      }
    }
    if (!result) {
      result = returnError("no match on yelp");
    }
    response.send(result);
  });

});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
