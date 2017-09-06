$(document).ready(function(){
    var q = URI.parseQuery(location.search);
    var audioId = q.hasOwnProperty('aid') ? q['aid'] : null;
    if (typeof(audioId) === 'string') {
        console.log("Using audio stream " + audioId);
        //$(".ogaudio").data("protocol", audioId);
        $(".ogaudio").get().forEach(function(element, index, array) {
                console.log(array[index]);
                array[index].dataset['url'] = "ws://192.241.217.88:4000/as/";
                array[index].dataset['protocol'] = audioId;
            }
        );
        JSMpeg.CreateVideoElements();
    }
});
