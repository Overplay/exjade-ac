const ProxyService = require( './ProxyService' );

module.exports = {

        getDeviceByUDID: function ( udid ) {

            return ProxyService.get( 'https://cloud-dm.ourglass.tv/ogdevice/findByUDID?deviceUDID=' + udid )
                .then( function ( resp ) {
                    return resp.body;
                } );

        }

}