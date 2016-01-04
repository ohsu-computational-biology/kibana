# Kibana 4.2.2-snapshot

[![Build Status](https://travis-ci.org/elastic/kibana.svg?branch=master)](https://travis-ci.org/elastic/kibana?branch=master)

Kibana is an open source ([Apache Licensed](https://github.com/elastic/kibana/blob/master/LICENSE.md)), browser based analytics and search dashboard for Elasticsearch. Kibana is a snap to setup and start using. Kibana strives to be easy to get started with, while also being flexible and powerful, just like Elasticsearch.

## CCC Modifications

curl -XPUT  $(docker-machine ip default):9200/.kibana/_settings  -d '{ "index" : { "max_result_window" : 2147483647 } }'
{"acknowledged":true}

curl -XPOST  $(docker-machine ip default):9200/.kibana/config/4.2.2-snapshot/_update -d '{
   "doc" : {
     "cccWdlURL":"http://localhost:3000/api/workflows/v1"  
    }
}'

curl -XPOST  $(docker-machine ip default):9200/.kibana/config/4.2.2-snapshot/_update -d '{
   "doc" : {
     "cccWdlURL":"http://kibana.ccc.org:8000/api/workflows/v1"  
    }
}'

curl -XPOST  $(docker-machine ip default):9200/.kibana/config/4.2.2-snapshot/_update -d '{
   "doc" : {
     "cccWdlURL":"/api/workflows/v1"  
    }
}'

##to build
```
 # in /kibana
 $ cd kibana
 $ npm run build
 $ cp target/kibana-4.2.2-snapshot-linux-x64.tar.gz dms-es/services/kibana/kibana-4.2.2-snapshot-linux-x64.tar.gz
 # copy contents of sha1  dms-es/services/kibana/kibana-4.2.2-snapshot-linux-x64.tar to dms-es/services/kibana/Dockerfile
```

## to run in developmemt

```
# assume dms-es docker compose is running

# kill our deployed version
$ docker kill kibana 

# start a docker image so nginx will pick it up

$ docker run -it -v $(pwd):/src -p 0.0.0.0:5601:5601  --link elasticsearch kibana-dev

# once inside, start kibana in dev mode

$ cd /src
$ npm start 

```


## Requirements

- Elasticsearch version 2.0.0 or later
- Kibana binary package

## Installation

* Download: [http://www.elastic.co/downloads/kibana](http://www.elastic.co/downloads/kibana)
* Run `bin/kibana` on unix, or `bin\kibana.bat` on Windows.
* Visit [http://localhost:5601](http://localhost:5601)

## Quick Start

You're up and running! Fantastic! Kibana is now running on port 5601, so point your browser at http://YOURDOMAIN.com:5601.

The first screen you arrive at will ask you to configure an **index pattern**. An index pattern describes to Kibana how to access your data. We make the guess that you're working with log data, and we hope (because it's awesome) that you're working with Logstash. By default, we fill in `logstash-*` as your index pattern, thus the only thing you need to do is select which field contains the timestamp you'd like to use. Kibana reads your Elasticsearch mapping to find your time fields - select one from the list and hit *Create*.

**Tip:** there's an optimization in the way of the *Use event times to create index names* option. Since Logstash creates an index every day, Kibana uses that fact to only search indices that could possibly contain data in your selected time range.

Congratulations, you have an index pattern! You should now be looking at a paginated list of the fields in your index or indices, as well as some informative data about them. Kibana has automatically set this new index pattern as your default index pattern. If you'd like to know more about index patterns, pop into to the [Settings](#settings) section of the documentation.

**Did you know:** Both *indices* and *indexes* are acceptable plural forms of the word *index*. Knowledge is power.

Now that you've configured an index pattern, you're ready to hop over to the [Discover](#discover) screen and try out a few searches. Click on **Discover** in the navigation bar at the top of the screen.

## Documentation

Visit [Elastic.co](http://www.elastic.co/guide/en/kibana/current/index.html) for the full Kibana documentation.

## Snapshot Builds

For the daring, snapshot builds are available. These builds are created after each commit to the master branch, and therefore are not something you should run in production.

| platform |  |  |
| --- | --- | --- |
| OSX | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-4.2.2-snapshot-darwin-x64.tar.gz) | [zip](http://download.elastic.co/kibana/kibana-snapshot/kibana-4.2.2-snapshot-darwin-x64.zip) |
| Linux x64 | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-4.2.2-snapshot-linux-x64.tar.gz) | [zip](http://download.elastic.co/kibana/kibana-snapshot/kibana-4.2.2-snapshot-linux-x64.zip) |
| Linux x86 | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-4.2.2-snapshot-linux-x86.tar.gz) | [zip](http://download.elastic.co/kibana/kibana-snapshot/kibana-4.2.2-snapshot-linux-x86.zip) |
| Windows | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-4.2.2-snapshot-windows.tar.gz) | [zip](http://download.elastic.co/kibana/kibana-snapshot/kibana-4.2.2-snapshot-windows.zip) |
