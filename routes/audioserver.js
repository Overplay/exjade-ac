var express = require('express');
var router = express.Router();
var WebSocket  = require('ws');
var log_debug = require('debug')('expaudiod:wsdebug');
var log_info = require('debug')('expaudiod:wsinfo');

router.broadcast = function(wss, id, data) {
    log_debug("Broadcast for " + id);
    if (wss !== undefined) {
        var ct = 0;
        wss.clients.forEach(function each(client) {
            if ((client.readyState === WebSocket.OPEN) && (client.protocol === id)) {
                ct++;
                client.send(data);
                log_debug("Send to " + client.ip);
            }
        });
        log_info("Have " + wss.clients.size + " total clients with " + ct + " clients for " + id);
    }
};

router.ws('/', function(ws, req) {
  ws.on('message', function(msg) {
      log_debug('Websocket message for: ' + ws.protocol + ': ' + msg);
  });
  ws.on('close', function() {
      log_info('Websocket close for: ' + ws.protocol);
  });
  log_info('Websocket connection for: ', ws.protocol);
});

router.post('/:secret/:id', function(req, res, next) {
    var secret = req.app.get('secret');
    if (req.params.secret !== secret) {
        log_debug('Failed Stream Connection: '+
            req.socket.remoteAddress + ':' + req.socket.remotePort + ' - wrong secret.'
        );
        res.end();
    } else {
        log_info('Stream Connected: '  +
            req.socket.remoteAddress + ':' + req.socket.remotePort + ' id - ' +
            req.params.id
        );
    }

    res.connection.setTimeout(0);

    req.on('error', function(error){
        log_debug('Stream Error...')
        log_debug(error);
    });
    req.on('data', function(data){
        //log_debug('Received for ' + req.params.id + ": " + data.length + ' bytes');
        router.broadcast(req.wss, req.params.id, data);
    });
    req.on('end',function(){
        log_info('Stream ended for ' + req.params.id);
    });
    //res.send("Hi there");
});

module.exports = router;