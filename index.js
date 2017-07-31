const http = require('http');
const mysql = require('mysql');
const config = require('./config');

var postCounts = {};

function main(request, response) {
    if (request.url != '/page-views' && request.method != 'POST') {
        send(response, 400, {"error": "Bad request"});
        return;
    }

    var body = '';

    request.on('data', function (data) {
        body += data;

        // 1e6 == 1M
        if (body.length > 1e6) {
            request.connection.destroy();
        }
    });

    request.on('end', function () {
        try {
            var post = JSON.parse(body);
        } catch (e) {
            send(response, 400, {"error": "Bad request"});
            return;
        }

        switch (true) {
            case (post == null):
            case (post.length < 2):
            case !('post_id' in post):
            case (isNaN(post.post_id)):
                send(response, 400, {"error": "Bad request"});
                return;
        }

        if (!postCounts[post.post_id]) {
            postCounts[post.post_id] = 0;
        }

        postCounts[post.post_id]++;

        send(response, 200, post);
    });
}

function writeCounts() {
    if (Object.keys(postCounts).length < 1) {
        return;
    }

    var posts = [];

    for (i in postCounts) {
        posts.push([
            i,
            postCounts[i]
        ]);
    }

    sqlConn.query('INSERT INTO page_views (post_id, views) VALUES ?', [posts], function (err, result) {
        log(err, result);

        if (!err) {
            postCounts = {};
        }
    });

}

function send(connection, code, message) {
    connection.writeHead(code, {"Content-Type": "application/json"});
    connection.write(JSON.stringify(message));
    connection.write('\n');
    connection.end();
}

function log() {
    if (config.debug) {
        console.log(new Date());
        console.log.apply(console, arguments);
    }
}

var server = http.createServer(main);
var sqlConn = mysql.createConnection(config.db);

setInterval(writeCounts, config.interval);

server.listen(config.server.port, function () {
    log("Page View server listening on: http://localhost:%s", config.server.port);
});

var exit = function () {
    server.on('close', function () {
        process.exit();
    });

    server.close();
};

['HUP', 'INT', 'QUIT', 'TERM'].forEach(function (signal) {
    log('Exit process with %s signal', signal);
    process.on('SIG' + signal, exit);
});

process.on('uncaughtException', function (error) {
    log('Caught exception: ' + error);
    log(error.stack);
    exit();
});
