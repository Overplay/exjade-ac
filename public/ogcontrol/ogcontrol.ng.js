/**
 * Created by mkahn on 10/10/17.
 */

var app = angular.module( "ogAudioApp", [
    'ui.bootstrap', 'ourglassAPI', 'ui.ogMobile'
] );

app.run( function ( $rootScope ) {

    var q = URI.parseQuery( location.search );
    var audioId = q.hasOwnProperty( 'aid' ) ? q[ 'aid' ] : null;
    $rootScope.audioId = audioId;
    if ( typeof(audioId) === 'string' ) {
        console.log( "Using audio stream " + audioId );
        //$(".ogaudio").data("protocol", audioId);
        $( ".ogaudio" ).get().forEach( function ( element, index, array ) {
                console.log( array[ index ] );
                //array[index].dataset['url'] = "ws://192.168.1.172:4000/as/";
                array[ index ].dataset[ 'protocol' ] = audioId;
            }
        );
        JSMpeg.CreateOGAudioElement();

    }

} );

app.controller( 'ogAudioCtrlr', function ( $scope, $log, $http, $rootScope ) {
    $log.debug( "Loading ogAudioCtrlr" );

    $scope.ui = {
        showProgrammInfo: false,
        channelNumber:    0,
        channelName:      '',
        title:            ''
    }

    $http.get( '/bellinidm?deviceUDID=' + $rootScope.audioId )
        .then( function ( data ) {
            $scope.ui = {
                showProgrammInfo: true,
                channelNumber:    data.data.currentProgram.channelNumber,
                channelName:      data.data.currentProgram.networkName,
                title:            data.data.currentProgram.title
            }
        } )
} );