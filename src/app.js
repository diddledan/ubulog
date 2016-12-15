'use strict';

const http = require('http');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('config');
//var mongoose = require('mongoose');
//mongoose.Promise = require('bluebird');
const elasticsearch = require('elasticsearch');

const es_host = config.get('elasticsearch.host');
const es_port = config.get('elasticsearch.port');
const esclient = new elasticsearch.Client({
    host: `http://${es_host}:${es_port}`,
    log: 'info'
});

const app = express();

express.static.mime.define({'application/javascript', 'js'});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'build', 'bundled')));
} else {
    app.use(express.static(path.join(__dirname, 'public')));
}

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
    }).catch((e) => res.status(500).setHeader("Content-Type", "application/json").send(e));
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
        let data = [];
        for (let bucket of r.aggregations.date.buckets) {
            for (let channel of bucket.channel.buckets) {
                data.push({
                    "x": bucket.key_as_string,
                    "y": channel.doc_count,
                    "group": channel.key
                });
            }
        }
        res.setHeader("Content-Type", "application/json").send(data);
    })
    .catch((e) => { console.log(e); res.status(500).send(e) });
});

app.get('*', function(req, res) {
    let rootDir = 'src/public';
    if (process.env.NODE_ENV === 'production') {
        rootDir = 'src/public/build/bundled';
    }

    res.sendFile('index.html', {root: rootDir});
});


app.set('port', config.get('port'));

const server = http.createServer(app);

server.listen(config.get('port'));

server.on('error', function(error) {
    console.error(error);
});

server.on('listening', function() {
    console.log('listening');
});