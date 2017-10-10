/**
 *
 * ogAPIBL2.js
 *
 * ogAPI rewritten for Bellini/Blueline Architecture
 *
 * Rewrite for venue data and general cleanliness
 * July 2017
 *
 *
 * USAGE:
 *  import source
 *  inject 'ourglassAPI' into he root app module
 *
 */


/**
 * Global variable set from the Android side when an  OGWebViewFragment starts.
 * As of early March 2017, this code is not working, but that's OK, the shared
 * Java Object method is working, and it's actually better.
 * @type {{}}
 */

    // TODO Deprecate
var OG_SYSTEM_GLOBALS = {};

function SET_SYSTEM_GLOBALS_JSON( jsonString ) {
    OG_SYSTEM_GLOBALS = JSON.parse( jsonString );
    OG_SYSTEM_GLOBALS.updatedAt = new Date();
}

(function ( window, angular, undefined ) {


    /**
     * Returns object.data | Helper with chaining Angular $http
     *
     * @param {Object} response
     * @returns response.data
     */
    function stripData( response ) {
        return response.data;
    }


    /**
     * Helper to pull url params
     *
     * @param {any} name The name to search for
     * @param {any} url The url to get parameter of
     * @returns
     */
    function getParameterByName( name, url ) {
        if ( !url ) {
            url = window.location.href;
        }
        name = name.replace( /[\[\]]/g, "\\$&" );
        var regex = new RegExp( "[?&]" + name + "(=([^&#]*)|&|#|$)" ),
            results = regex.exec( url );
        if ( !results ) return null;
        if ( !results[ 2 ] ) return '';
        return decodeURIComponent( results[ 2 ].replace( /\+/g, " " ) );
    }

    /**
     * This relies on the addJsonInterface on the Android side!
     *
     * @param none
     * @returns {any}
     */
    function getOGSystem() {

        if ( window.OGSystem ) {
            console.log( "%c Detected code running on emulator or OG H/W ",
                'background: #921992; font-size: 20px; color: #fff' );
            var rval = JSON.parse( window.OGSystem.getSystemInfo() );
            rval.onHardware = true;  // so code can easily tell it is on Emu or H/W
            return rval;
        }

        console.log( '%c CODE RUNNING IN BROWSER or WEBVIEW ', 'background: #3c931a; font-size: 20px; color: #fff' );

        var dudid = 'testy-mctesterson';

        var qParamUDID = getParameterByName( "deviceUDID" );

        var jwt = getParameterByName( "jwt" );

        if ( qParamUDID )
            dudid = qParamUDID;

        var simSys = {
            abVersionCode:  99,
            abVersionName:  '9.9.99',
            osVersion:      "9.9.9.",
            randomFactoid:  "This is mock data",
            name:           'Simulato',
            wifiMacAddress: '00:11:22:33',
            outputRes:      { height: 1080, width: 1920 },
            udid:           dudid,
            jwt:            jwt,
            venue:          'sim-001',
            osApiLevel:     99,
            mock:           true
        };

        return simSys;
    }

    /**
     * Returns if you're running in the system by querying the window.OGSystem variable (if it exists or not)
     *
     * @returns {boolean} OGSystem
     */
    function isRunningInAndroid() {
        return window.OGSystem;
    }

    /**
     * Sends an http request to /ogdevice/findByUDID and returns the data
     *
     * @param {string} udid
     * @returns {Object} data
     */
    function getOGDeviceFromCloud( udid ) {

        return $http.get( '/ogdevice/findByUDID?deviceUDID=' + udid )
            .then( stripData );

    }

    /**
     * Definition of the ourglassAPI module
     */
    angular.module( 'ourglassAPI', [] )
    /**
     * Definition for the ogAds factory (advertising service)
     */
        .factory( 'ogAds', function ( $http, $q, $log ) {

            var _forceAllAds = false;

            var _currentAd;
            var _adRotation = [];
            var _adIndex = 0;

            var urlForAllAds = '/proxysponsor/all';
            var urlForVenueAds = '/proxysponsor/venue/';
            var urlForProxiedImages = '/media/downloadFromCore/';

            var service = {};

            /**
             * Process new ads length
             *
             * @param {any} newAds
             * @returns {Object} _adRotation
             */
            function processNewAds( newAds ) {
                $log.debug( "ogAds loaded " + newAds.length + " ads. Enjoy!" );
                _adRotation = newAds;
                _adIndex = 0;
                return _adRotation;
            }

            /**
             * Makes an http query to either VenueAds or AllAds and returns _adRotation
             *
             * @returns {Object} _adRotation
             */
            service.refreshAds = function () {
                var url = ( getOGSystem().venue && !_forceAllAds ) ? (urlForVenueAds + getOGSystem().venue) : urlForAllAds;
                return $http.get( url )
                    .then( stripData )
                    .then( processNewAds );
            };

            /**
             * Returns next advertisiment in the rotation
             *
             * @returns {Object} advertisiment
             */
            service.getNextAd = function () {

                if ( !_adRotation.length )
                    return null;

                _adIndex = (_adIndex + 1) % _adRotation.length;
                if (!_adIndex) service.refreshAds(); // grab new ones on loop
                return _adRotation[ _adIndex ];

            };

            // TODO: This needs to be implemented for ogCrawler
            /**
             * Resolves a promise for currentAds running
             *
             * @returns {Promise} a promisified currentAds request
             */
            service.getCurrentAd = function () {
                return $q( function ( resolve, reject ) {
                    resolve( { "currentAds": [] } );
                } );
            };

            /**
             * Returns ad's image if there are ads, and a default if not
             *
             * @param {string} adType
             * @returns {string} location of ad's image
             */
            service.getImgUrl = function ( adType ) {

                if ( _adRotation.length && _adRotation[ _adIndex ].advert.media ) { //This makes sure there is actually an advert to pull
                    // TODO this needs more checking or a try catch because it can blow up if an ad does not have
                    // a particular kind (crawler, widget, etc.)
                    var ad = _adRotation[ _adIndex ];

                    return urlForProxiedImages + ad.advert.media[ adType ].id;

                } else {

                    switch ( adType ) {

                        case "crawler":
                            return "/blueline/common/img/oglogo_crawler_ad.png";

                        case "widget":
                            return "/blueline/common/img/oglogo_widget_ad.png";

                        default:
                            throw Error( "No such ad type: " + adType );

                    }
                }
            };

            /**
             * Sets up a force on all ads
             *
             * @param {any} alwaysGetAll
             */
            service.setForceAllAds = function ( alwaysGetAll ) {
                _forceAllAds = alwaysGetAll;
            };

            service.refreshAds(); // load 'em to start!

            return service;

        } )


        /***************************
         *
         * Common (mobile and TV) app service
         *
         ***************************/
        .factory( 'ogAPI', function ( $http, $log, $interval, $q, $rootScope, $timeout ) {

            //local variables
            var _usingSockets;

            // unique name, like io.ourglass.cralwer
            var _appName;
            // The above is called appId everywhere else, so we support both in here until we can clean up!
            var _appId;
            var _appType;

            var _deviceUDID = getOGSystem().udid;
            var _jwt = getOGSystem().jwt;
            var _venueUUID = getOGSystem().venue;

            var _userPermissions;
            var _user;

            if ( _jwt ) {
                $http.defaults.headers.common.Authorization = 'Bearer ' + _jwt;
            }

            var _lockKey;

            // Data callback when device data on BL has changed
            var _deviceDataCb;
            // Data callback when venue data on BL has changed
            var _venueDataCb;

            // Message callback when a DM is sent from BL
            var _appMsgCb, _sysMsgCb;

            var _deviceModelDBId, _venueModelDBId;
            var service = { model: {}, venueModel: {} };

            // Socket message catchers

            io.socket.on( "connect", function () {
                $log.debug( "(Re)Connecting to websockets rooms" );
                // joinDeviceAppRoom();
                // subscribeToAppData();
            } );


            // Received appdata change from cloud (either APP+DEVICE or APP+VENUE)
            io.socket.on( 'appdata', function ( data ) {

                // The custom broadcast calls in AppDataController pull off one of the "datas"
                // The 'previous' field is only on the blueprint generated callbacks
                var modelData = data.previous ? data.data.data : data.data;

                if ( data.id == _deviceModelDBId ) {

                    $log.debug( "Received an A+D model update" );
                    service.model = modelData;
                    if ( _deviceDataCb ) {
                        $rootScope.$apply( function () {
                            _deviceDataCb( service.model );
                            $log.debug( 'Device AppData change for ' + service.model );
                        } );
                    } else {
                        $log.warn( 'Dropping sio device data change rx (no cb):' + JSON.stringify( data ) );
                    }
                } else if ( data.id == _venueModelDBId ) {

                    $log.debug( "Received an A+V model update" );
                    service.venueModel = modelData;
                    if ( _venueDataCb ) {
                        $rootScope.$apply( function () {
                            _venueDataCb( service.venueModel );
                            $log.debug( 'Venue AppData change for ' + service.venueModel );
                        } );
                    } else {
                        $log.warn( 'Dropping sio venue data change rx (no cb):' + JSON.stringify( data ) );
                    }

                } else {
                    $log.error( "Got a data SIO update and it is for an unknown DB Id!!" );
                }


            } );

            function getUserForJwt() {

                if ( !_jwt ) {
                    return $q.when( {
                        firstName:   'Petro',
                        lastName:    'McPatron',
                        mobilePhone: '408-555-1212'
                    } )
                }

                return $http.post( '/user/coreuserfortoken', { jwt: _jwt } )
                    .then( stripData );
            }

            function getUsersPermissionsForThisDevice() {

                // TODO: Replicated below
                if ( !_jwt ) {
                    $log.debug( "No jwt, no permissions" );
                    return $q.when( { manager: false, owner: false, anymanager: false } );
                }

                if ( _jwt === 'oooo' ) {
                    $log.debug( 'Faux owner jwt for testing' );
                    return $q.when( { manager: true, owner: true, anymanager: true } );
                }

                if ( _jwt === 'mmmm' ) {
                    $log.debug( 'Faux manager jwt for testing' );
                    return $q.when( { manager: true, owner: false, anymanager: true } );
                }
                // Actual call
                return $http.post( '/user/isusermanager', { jwt: _jwt, deviceUDID: _deviceUDID } )
                    .then( stripData )
            }

            /**
             * Checks user level
             * Queries /user/coreuserfortoken and /user/isusermanager
             *
             * @returns {Promise<any>}
             */
            function checkUserLevel() {

                if ( !_jwt ) {
                    $log.debug( "No jwt, no permissions" );
                    return $q.when( { manager: false, owner: false, anymanager: false } );
                }

                if ( _jwt === 'oooo' ) {
                    $log.debug( 'Faux owner jwt for testing' );
                    return $q.when( { manager: true, owner: true, anymanager: true } );
                }

                if ( _jwt === 'mmmm' ) {
                    $log.debug( 'Faux manager jwt for testing' );
                    return $q.when( { manager: true, owner: false, anymanager: true } );
                }

                // TODO
                return getUserForJwt()
                    .then( function ( user ) {
                        _user = user;
                    } )
                    .then( getUsersPermissionsForThisDevice )
                    .then( function ( permissions ) {
                        _userPermissions = permissions;
                        return permissions;
                    } )
                    .catch( function ( err ) {
                        $log.error( "Problem checking permissions. " + err.message );
                        return $q.when( { manager: false, owner: false, anymanager: false } ); // swallow for now
                    } );
            }

            /**
             * update that model like one of my jQuery girls
             *
             * @param {any} newData
             * @returns {Object} Model
             */
            function updateModel( newData ) {
                service.model = newData;
                if ( _deviceDataCb ) _deviceDataCb( service.model );
                return service.model;
            }


            /**
             * I AM THE CAPTAIN OF THIS SHIP AND I WILL
             * https://www.youtube.com/watch?v=dQw4w9WgXcQ
             * @returns {Object} data from the server appModel
             */
            function getDataForApp( getVenue ) {
                if ( getVenue ) {
                    return $http.get( '/appmodel/' + _appId + '/venue' )
                        .then( stripData )
                        .then( stripData ); // conveniently the object goes resp.data.data
                } else {
                    return $http.get( '/appmodel/' + _appId + '/' + _deviceUDID )
                        .then( stripData )
                        .then( stripData ); // conveniently the object goes resp.data.data
                }
            }

            /**
             * Someone should implement this locking one day on the server one day
             *
             * @returns
             */
            function getDataForAppAndLock() {
                return $http.get( API_PATH + 'appdata/' + _appId + "?lock" )
                    .then( stripData );
            }

            /**
             * Join device into app room
             *
             * @returns {Promise} promise if a socket posting room: appID+deviceID
             */
            function joinDeviceAppRoom() {

                var roomId = _appId + ':' + _deviceUDID;

                io.socket.on( roomId, function ( data ) {

                    if ( _appMsgCb ) {
                        $rootScope.$apply( function () {
                            _appMsgCb( data );
                        } );
                    } else {
                        console.log( 'Dropping app message rx (no cb)' );
                    }

                } );

                return $q( function ( resolve, reject ) {

                    io.socket.post( '/socket/join', {
                        room: roomId
                    }, function ( resData, jwres ) {
                        console.log( resData );
                        if ( jwres.statusCode != 200 ) {
                            reject( jwres );
                        } else {
                            $log.debug( "Successfully joined room for this device" );
                            resolve();
                        }
                    } );
                } );

            };


            function joinSystemMsgRoom() {

                // Received direct message from cloud
                io.socket.on( 'sysmsg:' + _deviceUDID, function ( data ) {
                    if ( _sysMsgCb ) {
                        $rootScope.$apply( function () {
                            _sysMsgCb( data );
                        } );
                    } else {
                        console.log( 'Dropping sio DEVICE_DM message rx (no cb)' );
                    }
                } );

                return $q( function ( resolve, reject ) {

                    io.socket.post( '/ogdevice/subSystemMessages', {
                        deviceUDID: _deviceUDID
                    }, function ( resData, jwres ) {
                        console.log( resData );
                        if ( jwres.statusCode != 200 ) {
                            reject( jwres );
                        } else {
                            $log.debug( "Successfully joined sysmsg room for this device" );
                            resolve();
                        }
                    } );
                } );

            }


            /**
             *
             *
             * @returns { venue: venueData, device: deviceData }
             */
            function subscribeToAppData() {

                return $q( function ( resolve, reject ) {

                    io.socket.post( '/appdata/subscribe', {
                        deviceUDID: _deviceUDID,
                        appid:      _appId
                    }, function ( resData, jwres ) {
                        console.log( resData );
                        if ( jwres.statusCode != 200 ) {
                            reject( jwres );
                        } else {
                            $log.debug( "Successfully subscribed to appData" );
                            var rval = {};
                            resData.forEach( function ( d ) {
                                if ( d.forDeviceUDID === 'venue' ) {
                                    _venueModelDBId = d.id;
                                    rval.venue = d && d.data;
                                }
                                else {
                                    _deviceModelDBId = d.id;
                                    rval.device = d && d.data;
                                }
                            } );
                            resolve( rval );
                        }
                    } );
                } );
            }


            /**
             * Initialization function.
             *
             * @param {any} params required
             * @returns
             */
            service.init = function ( params ) {

                if ( !params )
                    throw new Error( "try using some params, sparky" );

                // Check the app type
                if ( !params.appType ) {
                    throw new Error( "appType parameter missing and is required." );
                }

                _appType = params.appType;
                $log.debug( "Init called for app type: " + _appType );
                _deviceUDID = getOGSystem().udid;


                // Check the app name
                if ( !params.appName && !params.appId ) {
                    throw new Error( "appId parameter missing and is required." );
                }

                if ( params.appName )
                    console.log( "%c appName parameter is deprecated and is now appId. Fix it in your code!", "background-color: #cb42f4; color: #fff;" );

                _appName = params.appId || params.appName;
                _appId = _appName;

                $log.debug( "Init for app: " + _appId );

                if ( params.hasOwnProperty( "modelCallback" ) ) {
                    $log.warn( "modelCallback is deprecated. Use deviceModelCallback." );
                }

                _deviceDataCb = params.deviceModelCallback || params.modelCallback;

                if ( !_deviceDataCb )
                    $log.warn( "You didn't specify a deviceModelCallback, so you won't get one!" );


                _venueDataCb = params.venueModelCallback;

                if ( !_venueDataCb )
                    $log.warn( "You didn't specify a venueModelCallback, so you won't get one!" );


                if ( params.hasOwnProperty( "messageCallback" ) ) {
                    $log.warn( "messageCallback is deprecated. Use appMsgCallback." );
                }

                _appMsgCb = params.appMsgCallback || params.messageCallback;
                if ( !_appMsgCb )
                    $log.warn( "You didn't specify an appMsgCallback, so you won't get one!" );

                _sysMsgCb = params.sysMsgCallback;
                if ( !_sysMsgCb )
                    $log.warn( "You didn't specify a sysMsgCallback, so you won't get one!" );

                return $http.post( '/appmodel/initialize', { appid: _appId, deviceUDID: _deviceUDID } )
                    .then( stripData )
                    .then( function ( model ) {
                        $log.debug( "ogAPI: Model data init complete" );
                        $log.debug( "ogAPI: Subscribing to model changes" );
                        return subscribeToAppData();
                    } )
                    .then( function ( initialData ) {
                        service.model = initialData.device;
                        service.venueModel = initialData.venue;
                        $log.debug( "ogAPI: Subscribing to messages" );

                        var p = [];

                        if ( _appMsgCb ) p.push( joinDeviceAppRoom() );
                        if ( _sysMsgCb ) p.push( joinSystemMsgRoom() );

                        return $q.all( p );
                    } )
                    .then( function () {
                        $log.debug( "Checking user level for this device" );
                        if ( _appType === 'mobile' ) {
                            return checkUserLevel();
                        } else {
                            return "TV APP";
                        }
                    } )
                    .then( function ( userLevel ) {
                        $log.debug( "User level: " + userLevel );
                        return { device: service.model, venue: service.venueModel };
                    } );

            };

            /**
             * Sends a message to the socket with the url and wrapped message
             *
             * @param {any} url
             * @param {any} message
             * @returns
             */
            function sendSIOMessage( url, message ) {
                var wrappedMessage = { deviceUDID: _deviceUDID, message: message };
                return $q( function ( resolve, reject ) {
                    io.socket.post( url, wrappedMessage, function ( resData, jwRes ) {
                        if ( jwRes.statusCode != 200 ) {
                            reject( jwRes );
                        } else {
                            resolve( { resData: resData, jwRes: jwRes } );
                        }
                    } );

                } );
            }


            /**
             * sends a put request to a socket io. Pass in url and params for it to send
             *
             * @param {any} url
             * @param {any} params
             * @returns {Promise}
             */
            function sioPut( url, params ) {
                return $q( function ( resolve, reject ) {
                    io.socket.put( url, params, function ( resData, jwRes ) {
                        if ( jwRes.statusCode != 200 ) {
                            reject( jwRes );
                        } else {
                            resolve( { resData: resData, jwRes: jwRes } );
                        }
                    } );

                } );
            }


            /**
             * Send SIO message to /ogdevice/dm
             *
             * @param {any} message
             * @returns
             */
            service.sendMessageToDeviceRoom = function ( message ) {
                // NOTE must have leading slash!
                return sendSIOMessage( '/ogdevice/message', message );
            };

            /**
             * Sends a message to a venue room (/venue/dm)
             *
             * UNFUCKING TESTED, HOMIE!!!
             *
             * @param {any} message
             * @returns
             */
            service.sendMessageToVenueRoom = function ( message ) {
                // NOTE must have leading slash!
                return sendSIOMessage( '/venue/message', message );
            };


            service.sendMessageToAppRoom = function ( message, includeMe ) {
                var room = _appId + ':' + _deviceUDID;
                return sioPut( '/socket/send', { room: room, message: message, echo: includeMe } );

            };

            /**
             * Returns _userPermissions variable
             *
             * @return {any} Promise
             */
            service.getPermissionsPromise = function () {
                return getUsersPermissionsForThisDevice();
            };

            /**
             * DEPRECATED
             * @returns {*}
             */
            service.getPermissions = function () {
                return _userPermissions;
            }

            /**
             * Gets user
             *
             * @returns {Object} Promise
             */
            service.getUserPromise = function () {
                return getUserForJwt();
            };

            /**
             * DEPRECATED
             * @returns {*}
             */
            service.getUser = function () {
                return _user;
            }

            /**
             * Queries the socialscrape result controller for information about social scraping
             *
             * @returns {Promise<Object>} Data from socialscrape result
             */
            service.getTweets = function () {
                return $http.get( '/socialscrape/result?deviceUDID=' + _deviceUDID + '&appId=' + _appId )
                    .then( stripData );
            };


            /**
             * Queries the socialscrape channeltweets controller for information about a channel's tweets
             *
             * @returns {Promise<Object>}
             */
            service.getChannelTweets = function () {
                return $http.get( '/socialscrape/channeltweets?deviceUDID=' + _deviceUDID )
                    .then( stripData );
            };

            /**
             * Posts to /socialscrape/add with queryString, deviceUDID, and appID
             *
             * @param {any} paramsArr
             * @returns {Promise} promiseResolveReject
             */
            service.updateTwitterQuery = function ( paramsArr ) {
                var query = paramsArr.join( '+OR+' );
                return $http.post( '/socialscrape/add', {
                    queryString: query,
                    deviceUDID:  _deviceUDID,
                    appId:       _appId
                } );
            };


            // updated for BlueLine
            // TODO replace with socketIO?
            /**
             * HTTP Put to save appmodel for appid and deviceUDID
             * This is where we'd want to look at saving based on venueUDID instead
             *
             * @returns {Promise}
             */
            service.saveHTTP = function () {
                return $http.put( '/appmodel/' + _appId + '/' + _deviceUDID, { data: service.model } )
                    .then( stripData )
                    .then( function ( data ) {
                        $log.debug( "ogAPI: Model data saved via PUT" );
                        //updateModel( data[0] )
                    } );
            };

            // /**
            //  * Calls sioPut to save appmodel, appId, and deviceUDID
            //  *
            //  * @returns {Promise}
            //  */
            // service.save = function () {
            //     return sioPut( '/appmodel/' + _appId + '/' + _deviceUDID, { data: service.model } )
            //         .then( function ( data ) {
            //             $log.debug( "ogAPI: Model data saved via si PUT" );
            //             return data.resData;
            //         } );
            // };

            // Helper
            service.saveDeviceModel = function () {
                return service.save( 'device' );
            };

            // Helper
            service.saveVenueModel = function () {
                return service.save( 'venue' );
            };

            service.saveAll = function () {
                return $q.all( [ service.saveDeviceModel(), service.saveVenueModel() ] );
            };

            /**
             * Calls sioPut to save appmodel, appId, and deviceUDID
             *
             * @returns {Promise}
             */
            service.save = function ( scope ) {

                if ( scope && [ 'device', 'venue' ].indexOf( scope ) < 0 ) {
                    throw new Error( '"device" and "venue" are the only valid scopes, chief.' );
                }

                scope = scope || "device"; // default for backwards compat

                var payload = {
                    data:  ( scope === "device" ) ? service.model : service.venueModel,
                    scope: scope
                };

                return sioPut( '/appmodel/' + _appId + '/' + _deviceUDID, payload )
                    .then( function ( data ) {
                        $log.debug( "ogAPI: " + scope + " model data saved via si PUT" );
                        return data.resData;
                    } );
            };


            /**
             * Loads model by calling getDataForApp and then updateModel
             *
             * @returns {Promise}
             */
            service.loadModel = function ( getVenue ) {
                if ( getVenue ) {
                    return getDataForApp( 'venue' )
                        .then( updateModel );
                } else {
                    return getDataForApp()
                        .then( updateModel );
                }
            };

            /**
             * Updates the model and tries to aquire lockkey. Currently doesn't do anything
             * TODO implement model locking on Bellini side...
             *
             * @returns {Promise} HttpPromise
             */
            service.loadModelAndLock = function () {
                return getDataForAppAndLock()
                    .then( function ( model ) {
                        if ( !model.hasOwnProperty( 'lockKey' ) )
                            throw new Error( "Could not acquire lock" );

                        _lockKey = model.lockKey;
                        model.lockKey = undefined;
                        return model;
                    } )
                    .then( updateModel );
            };

            /**
             * performs a post to the move endpoint for either the current app or the appid that is passed in
             *
             * @param {any} appid the app to move, if not included, then move the _appId
             * @returns {Promise} HttpPromise
             */
            service.move = function ( appid ) {
                appid = appid || _appId;
                return $http.post( '/ogdevice/move', { deviceUDID: _deviceUDID, appId: appid } )
                    .then( stripData )
                    .then( function ( d ) {
                        $rootScope.$broadcast( '$app_state_change', { action: 'move', appId: appid } );
                        return d;
                    } )
                    .catch( function ( err ) {
                        $log.info( "App move FAILED for: " + appid );
                        $rootScope.$broadcast( '$app_state_change_failure', { action: 'move', appId: appid } );
                        throw err; // Rethrow
                    } );
            };

            /**
             * performs a post to the launch endpoint for either the current app or the appid that is passed in
             *
             * @param {any} appid the app to move, if not included, then move the _appId
             * @returns {Promise} HttpPromise
             */
            service.launch = function ( appid ) {
                appid = appid || _appId;
                return $http.post( '/ogdevice/launch', { deviceUDID: _deviceUDID, appId: appid } )
                    .then( stripData )
                    .then( function ( d ) {
                        $log.info( "App launch successful for: " + appid );
                        $rootScope.$broadcast( '$app_state_change', { action: 'launch', appId: appid } );

                        return d;
                    } )
                    .catch( function ( err ) {
                        $log.info( "App launch FAILED for: " + appid );
                        $rootScope.$broadcast( '$app_state_change_failure', { action: 'launch', appId: appid } );
                        throw err; // Rethrow
                    } );
            };

            /**
             * performs a post to the kill endpoint for either the current app or the appid that is passed in
             * @param [appid] the app to move, if not included, then move the _appId
             * @returns {HttpPromise}
             */
            service.kill = function ( appid ) {
                appid = appid || _appId;
                //should be able to return the promise object and act on it
                return $http.post( '/ogdevice/kill', { deviceUDID: _deviceUDID, appId: appid } )
                    .then( stripData )
                    .then( function ( d ) {
                        $rootScope.$broadcast( '$app_state_change', { action: 'kill', appId: appid } );
                        return d;
                    } )
                    .catch( function ( err ) {
                        $log.info( "App kill FAILED for: " + appid );
                        $rootScope.$broadcast( '$app_state_change_failure', { action: 'kill', appId: appid } );
                        throw err; // Rethrow
                    } );
            };

            /**
             * Relocate window.location.href to control app
             *
             * @param {any} app
             */
            service.relocToControlApp = function ( app ) {
                // window.location.href = "/blueline/opp/" + app.appId +
                //     '/app/control/index.html?deviceUDID=' + _deviceUDID + '&displayName=' + app.displayName;

                service.logUserInteraction( { interaction: "CONTROL_APP", meta: { appid: app.appId } } );

                window.location.href = '/appcontrol/' + app.appId + '/' +
                    _deviceUDID + '?jwt=' + _jwt || '*' + '?displayName=' + app.displayName;
            };


            // service.relocToControlApp = function( app ){
            //     window.location.href = "/blueline/opp/" + app.appId +
            //         '/app/control/index.html?deviceUDID=' + _deviceUDID + '&displayName=' + app.displayName;
            // }

            /**
             * posts up an SMS message request
             *
             * @param {any} phoneNumber
             * @param {any} message
             * @returns {Promise<Object>}
             */
            service.sendSMS = function ( phoneNumber, message ) {
                return $http.post( '/ogdevice/sms', {
                    phoneNumber: phoneNumber,
                    message:     message,
                    deviceUDID:  _deviceUDID
                } );
            };

            /**
             *
             * @param email should be { to: emailAddr, emailbody: text }
             * @returns {HttpPromise}
             */
            service.sendSpam = function ( email ) {
                return $http.post( API_PATH + 'spam', email );
            };


            // New methods for BlueLine Architecture
            function getOGDeviceModel() {
                return $http.get( '/ogdevice/findByUDID?deviceUDID=' + _deviceUDID )
                    .then( stripData );
            }

            service.getOGSystem = getOGSystem;

            /**
             * Gets the current program per Bellini
             * Returns something like:
             * "currentProgram": {
             *  "channelNumber": "269",
             *  "episodeTitle": "Titanic Pawn",
             *  "networkName": "HISTHD",
             *  "programId": "25980234",
             *  "title": "Pawn Stars"
             *  }
             */
            service.getCurrentProgram = function () {
                return getOGDeviceModel()
                    .then( function ( device ) {
                        return device.currentProgram;
                    } )
            };

            /**
             * Gets the current program per Bellini
             */
            service.getOGDevice = function () {
                return getOGDeviceModel();
            };

            /**
             * Returns _deviceUDID
             *
             * @returns {_deviceUDID}
             */
            service.getDeviceUDID = function () { return _deviceUDID; };


            /**
             * Returns striped data from /pgs/grid
             *
             * @returns {Promise<Object>}
             */
            service.getGrid = function () {
                return $http.get( '/pgs/grid?deviceUDID=' + _deviceUDID )
                    .then( stripData );
            };

            /**
             * Changes the channel by making a post to /ogdevice/changechannel
             *
             * @param {any} channelNum
             * @returns
             */
            service.changeChannel = function ( channelNum ) {
                return $http.post( '/ogdevice/changechannel?deviceUDID=' + _deviceUDID
                    + '&channel=' + channelNum )
                    .then( stripData );
            };

            /**
             * Figures out what channel is currently running and calls getGridForChannel
             *
             * @returns promise for {Object} channel listings
             */
            service.getGridForCurrentChannel = function () {

                return this.getCurrentProgram()
                    .then( function(program){
                        var channel = program.channelNumber; // could be undefined
                        if (!channel) return $q.when(); // dump out a bag of undef
                        return service.getGridForChannel( channel );
                    });



            };

            /**
             * Gets the grid for a channel
             * Does an http call to listingsforchannel and strips the data
             *
             * @param {number} channelNum
             * @returns {Object} channel listings
             */
            service.getGridForChannel = function ( channelNum ) {

                return $http.get( '/pgs/listingsforchannel?deviceUDID=' + _deviceUDID
                    + '&channel=' + channelNum )
                    .then( stripData );

            };

            /**
             * Checks if a device is paired by querying getOGSystem
             *
             * @returns {Function} getOGSystem();
             */
            service.pairedSTB = function () {
                return getOGSystem();
            };

            /**
             * user is manager check | CURRENTLY EMPTY
             *
             * @param {none}
             */
            service.userIsManager = function () {
                throw new Error( "userIsManager: NotImplementedError" );
            };

            /**
             * Interaction must be of the form { interaction: "STRING", meta: { obj }}
             * Fire and forget.
             * @param interaction
             */
            service.logUserInteraction = function ( interaction ) {
                var postData = _.assignIn( { deviceUDID: _deviceUDID, venueUUID: getOGSystem().venue },
                    interaction );
                $http.post( '/userinteraction/log', { userId: _user.id, logdata: postData } )
                    .then( function () {
                        $log.debug( "User interaction recorded" );
                    } )
                    .catch( function ( err ) {
                        $log.error( "Failed to record user interaction, oh well oh well" );
                    } );
            };

            /**
             * This method bounces a GET off of Bellini-DM as a proxy. Use this
             * instead of trying to GET right from a service to avoid CORS fails.
             * This will only work if no authorization header stuff is needed for
             * the call performed by the server.
             *
             * @param url
             */
            service.proxyGet = function ( url ) {
                return $http.get( '/proxy/get?url=' + url )
                    .then( stripData );
            };

            return service;
        } )

        .directive( 'failedImage', function ( $log ) {
            return {
                restrict: 'A',
                link:     function ( scope, elem, attrs ) {

                    elem.bind( 'error', function ( event ) {
                        $log.debug( "Failed to load image!" );
                        // This is some serious hackage!
                        var isWidget = event.path[ 1 ].outerHTML.indexOf( 'widget' ) > 0;
                        var errImgUrl = isWidget ? '/blueline/common/img/oglogo_widget_oops.jpg' :
                            '/blueline/common/img/oglogo_crawler_oops.jpg';
                        attrs.$set( 'src', errImgUrl );
                    } );

                }

            }

        } )

        // Main directive for inserting an advert in BL apps
        .directive( 'ogAdvert', function ( $log, ogAds, $interval, $timeout ) {
            return {
                restrict: 'E',
                template: '<img width="100%" height="100%" style="-webkit-transition: opacity 0.5s; transition: opacity 0.35s;" ' +
                          'ng-style="adstyle" ng-src=\"{{adurl}}\" failed-image/>',
                link:     function ( scope, elem, attrs ) {

                    var interval = parseInt( attrs.interval ) || 15000;
                    var adType = attrs.type || 'widget';
                    var intervalPromise;

                    scope.adstyle = { opacity: 0.0 };

                    if ( adType !== 'widget' && adType !== 'crawler' ) {
                        throw Error( "Unsupported ad type. Must be widget or crawler" );
                    }

                    function update() {

                        scope.adstyle.opacity = 0;
                        $timeout( function () {
                            scope.adurl = ogAds.getImgUrl( adType );
                            scope.adstyle.opacity = 1;
                            // HACK ALERT...let's trigger a new ad load
                            $timeout( ogAds.getNextAd, 200 );

                        }, 1200 );

                    }

                    update();

                    intervalPromise = $interval( update, interval );

                    scope.$on( '$destroy', function () {
                        $interval.cancel( intervalPromise );
                    } );

                }
            };

        } )


        //directive for placing an advertisiment in a project
        .directive( 'ogAdvertisement', function () {
            return {
                restrict:   'E',
                scope:      {
                    type: '@'
                },
                template:   '<img width="100%" ng-src=\"{{adurl}}\">',
                controller: function ( $scope, $http ) {

                    var ipAddress = "http://localhost";

                    try {
                        console.log( $scope.type );
                    } catch ( e ) {
                    }
                    try {
                        console.log( scope.type );
                    } catch ( e ) {
                    }

                    if ( !currentAd ) {
                        $http.get( ipAddress + ":9090" + "/api/ad" ).then( function ( retAd ) {
                            currentAd = retAd.data;
                            console.log( currentAd );
                            setCurrentAdUrl();
                        } );
                    } else {
                        setCurrentAdUrl();
                    }
                    /**
                     * Sets current ad url depending on type
                     *
                     * @param {none}
                     */
                    function setCurrentAdUrl() {
                        console.log( $scope );
                        console.log( $scope.type );
                        if ( $scope.type == 'widget' ) {
                            console.log( '1' );
                            console.log( ipAddress + " " + ":9090" + " " + currentAd.widgetUrl );
                            $scope.adurl = ipAddress + ":9090" + currentAd.widgetUrl;
                        }
                        else if ( $scope.type == 'crawler' ) {
                            $scope.adurl = ipAddress + ":9090" + currentAd.crawlerUrl;
                        }

                        console.log( $scope.adurl );
                    }
                }
            };
        } )

        .directive( 'ogAppHeader', function () {
            return {
                link:        function ( scope, elem, attr ) {
                    scope.name = attr.name || "Missing Name Attribute";
                },
                templateUrl: 'ogdirectives/appheader.html'
            };
        } )


        .directive( 'ogFallbackImg', function ( $log ) {
            return {
                restrict: 'A',
                link:     function ( scope, element, attrs ) {

                    element.bind( 'error', function () {
                        $log.debug( "Source not found for image, using fallback" );
                        attrs.$set( "src", attrs.ogFallbackImg );
                    } );

                }
            };
        } )

        .directive( 'ogHud', [ "$log", "$timeout", function ( $log, $timeout ) {
            return {
                scope:       {
                    message:      '=',
                    dismissAfter: '@',
                    issue:        '='
                },
                link:        function ( scope, elem, attr ) {

                    scope.ui = { show: false };

                    scope.$watch( 'issue', function ( nval ) {
                        if ( nval ) {
                            $log.debug( 'firing HUD' );
                            scope.ui.show = true;
                            $timeout( function () {
                                scope.ui.show = false;
                                scope.issue = false;
                            }, scope.dismissAfter || 2000 );
                        }
                    } );

                },
                templateUrl: 'ogdirectives/hud.html'
            };
        } ] )

        .controller( 'Controller', [ '$scope', function ( $scope ) {
        } ] );
    var currentAd;
})( window, window.angular );

angular.module( "ourglassAPI" ).run( [ "$templateCache",
    function ( $templateCache ) {

        // HUD
        $templateCache.put( 'ogdirectives/hud.html',
            '<div ng-if="ui.show" style="width: 100vw; height: 100vh; background-color: rgba(30,30,30,0.25);">' +
            // '<div style="margin-top: 30vh; width: 100vw;"> <img src="/www/common/img/box.gif"/></div>' +
            '<div style="margin-top: 40vh; width: 100vw; text-align: center;"> {{ message }}</div>' +
            '</div>' );

        $templateCache.put( 'ogdirectives/appheader.html', '<style>.ogappheader{display:table;' +
            'font-size:2em;font-weight:bold;height:60px;margin:0 0 10px 0}' +
            '.ogappheadertext{display:table-cell;vertical-align:middle}' +
            '.ogappheaderside{height:60px;width:20px;background-color:#52B85E;float:left;margin-right:10px}</style>' +
            '<div class="ogappheader"><div class="ogappheaderside"></div>' +
            '<div class="ogappheadertext">{{name | uppercase}}</div></div>' );

    } ] );