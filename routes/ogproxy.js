/**
 * Created by mkahn on 10/10/17.
 */

const express = require( 'express' );
const router = express.Router();
const BDMService = require('../services/BDMService');

/* GET home page. */
router.get( '/', function ( req, res, next ) {

    const udid = req.param('deviceUDID');
    if (!udid){
        return res.sendStatus(404);
    }

    BDMService.getDeviceByUDID(udid)
        .then(function(device){
            res.json(device);
        })
        .catch( function(err){
            res.status(500).send(err);
        });
    }
     );

module.exports = router;