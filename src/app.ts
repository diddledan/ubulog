import * as http from 'http';
import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as config from 'config';
//var mongoose = require('mongoose');
//mongoose.Promise = require('bluebird');
import { Client as esClient } from 'elasticsearch';
import { SearchResponse } from 'elasticsearch';

const es_host: string = config.get('elasticsearch.host');
const es_port: number = config.get('elasticsearch.port');
const es: esClient = new esClient({
    host: `http://${es_host}:${es_port}`,
    log: 'info'
});

const app: express.Express = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

if (process.env.NODE_ENV === 'production') {
    const bundles: string = path.join(__dirname, 'public', 'build', 'es6-bundled');
    app.use(express.static(bundles));
} else {
    app.use(express.static(path.join(__dirname, 'public')));
}

//mongoose.connect(config.get('mongoDatabase'));

app.get('/api/channels', (req: express.Request, res: express.Response) => {
    es.search({
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
    }).then((r: SearchResponse<{}>) => {
        res.json(
            r.aggregations.channels.buckets
            .map((v, idx) => v.key)
            .sort()
        );
    }).catch(e => res.status(500).send(e));
});

app.get('/api/chart', (req: express.Request, res: express.Response) => {
    es.search({
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
    .then((r: SearchResponse<{}>) => {
        const data = [];
        r.aggregations.date.buckets.forEach(bucket => {
            bucket.channel.buckets.forEach(channel => {
                data.push({
                    "x": bucket.key_as_string,
                    "y": channel.doc_count,
                    "group": channel.key
                });
            });
        });
        res.json(data);
    })
    .catch((e) => { console.log(e); res.status(500).send(e) });
});

app.get('/', (req: express.Request, res: express.Response) => {
    let rootDir = 'src/public';
    if (process.env.NODE_ENV === 'production') {
        rootDir = 'src/public/build/es6-bundled';
    }

    res.sendFile('index.html', {root: rootDir});
});


app.set('port', config.get('port'));

const server: http.Server = http.createServer(app);

server.listen(config.get('port'));

server.on('error', (error: Error) => console.error(error));

server.on('listening', () => console.log('listening'));
