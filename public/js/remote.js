$(document).ready(function(){
    var q = URI.parseQuery(location.search);
    var audioId = q.hasOwnProperty('aid') ? q['aid'] : null;
    if (typeof(audioId) === 'string') {
        console.log("Using audio stream " + audioId);
        //$(".ogaudio").data("protocol", audioId);
        $(".ogaudio").get().forEach(function(element, index, array) {
                console.log(array[index]);
                array[index].dataset['url'] = "ws://104.236.158.178/audioproxy/listen";
                array[index].dataset['protocol'] = audioId;
            }
        );
        JSMpeg.CreateVideoElements();
    }
});
