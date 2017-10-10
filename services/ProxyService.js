/**
 * Created by ryanhartzell on 3/17/17.
 */

var request = require('superagent-bluebird-promise');

module.exports =  {
    get: function (endpoint, data) {
        return request
            .get(endpoint)
            .query(data)
    },

    post: function (endpoint, data) {
        return request
            .post(endpoint)
            .send(data)
    },

    put: function (endpoint, data) {
        return request
            .put(endpoint)
            .send(data)
    },

    delete: function (endpoint, data) {
        return request
            .del(endpoint)
            .query(data)
    }
};