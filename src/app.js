var http = require('http');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var config = require('config');
//var mongoose = require('mongoose');
//mongoose.Promise = require('bluebird');
var elasticsearch = require('elasticsearch');

var es_host = config.get('elastic.host');
var es_port = config.get('elastic.port');
var esclient = new elasticsearch.Client({
        host: `http://${es_host}:${es_port}`,
        log: 'info'
});

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));

//mongoose.connect(config.get('mongoDatabase'));

app.get('/_channels', function(req, res) {
    esclient.search({
        body: {
            "size": 0,
            "aggs": {
                "channels": {
                    "terms": {
                        "field": "channel.keyword",
                        "size": 500,
                        "order": {
                            "_term": "desc"
                        }
                    }
                }
            }
        }
    }).then((r) => {
        r = r.aggregations.channels.buckets;
        r = r.map((v, idx) => v.key);
        r = r.sort();
        res.send(r);
    }).catch((e) => res.status(500).send(e));
});

app.get('/_chart', function(req, res) {
    esclient.search({
        body: {
            "aggs": {
                "date": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "interval": "1M",
                        "time_zone": "UTC",
                        "format": "yyyy-MM-dd",
                        "min_doc_count": 1
                    },
                    "aggs": {
                        "channel": {
                            "terms": {
                                "field": "channel.keyword",
                                "size": 5,
                                "order": {
                                    "_count":"desc"
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    .then((r) => {
        var data = [];
        for (var bucket of r.aggregations.date.buckets) {
            for (var channel of bucket.channel.buckets) {
                data.push({
                    "x": bucket.key_as_string,
                    "y": channel.doc_count,
                    "group": channel.key
                });
            }
        }
        res.send(data);
    })
    .catch((e) => { console.log(e); res.status(500).send(e) });
});

app.get('*', function(req, res) {
    res.sendFile('index.html', { root: 'src/public' });
});


app.set('port', config.get('port'));

var server = http.createServer(app);

server.listen(config.get('port'));

server.on('error', function(error) {
    console.error(error);
});

server.on('listening', function() {
    console.log('listening');
});