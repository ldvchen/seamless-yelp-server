#!/usr/bin/env coffee

express = require 'express'
levenshtein = require './levenshtein.js'
app = express.createServer express.logger()
yelp = require('yelp').createClient({
  consumer_key: process.env.YELP_CONSUMER_KEY,
  consumer_secret: process.env.YELP_CONSUMER_SECRET,
  token: process.env.YELP_TOKEN,
  token_secret: process.env.YELP_TOKEN_SECRET
})

# levenshtein threshold for a "match". lower is more stringent.
match_threshold = 10

# Removes (..) blocks from string and lowercases it.
lowercaseAndRemoveParens = (string) ->
  string.replace(/(\(.+?\))*/gim, '').trim().toLowerCase()

# Returns whether this is a likely match based on levenshtein, after spaces
# and punctuation are removed.
isLikelyMatch = (a, b) ->
  clean = (str) -> lowercaseAndRemoveParens(str).replace(/[- '*]*/gim, "")
  levenshtein.getEditDistance(clean(a), clean(b)) < match_threshold


app.get '/', (request, response) ->
  response.contentType 'application/json'

  errorify = (thing) -> { error: thing }

  query_term = request.query['s']
  if query_term?
    query_term = lowercaseAndRemoveParens query_term
    console.log "query received for: #{query_term}"
  else
    response.send(errorify 'no search term: add ?s=dinosaur+bbq')
    return

  params =
    location: '335 madison ave, new york 10016'
    sort: 0 # best match
    term: query_term # name that we're searching for
    limit: 10


  yelp.search params, (error, data) ->

    if error
      response.send(errorify error)
      return

    clip = (business) -> {
      name: business.name,
      rating: business.rating,
      review_count: business.review_count,
      url: business.url
    }

    matches = (clip business for business in data.businesses when isLikelyMatch(business.name, query_term))

    if matches.length is 0
      result = errorify 'no match on yelp?'
    else
      result = matches[0]

    response.send(result);

  # end yelp callback
# end app get

port = process.env.PORT || 5000
app.listen port, ->
  console.log "Listening on #{port}"
