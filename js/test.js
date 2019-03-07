function fakeInit() {
    setTimeout(function() {
        player = document.querySelector("video");
        videoFrame = document.getElementById("movie_player");
        const segments = [{
                desc: 'intro',
                start: 0,
                end: 10
            },
            {
                desc: 'death',
                start: 5,
                end: 15
            },
            {
                desc: 'lol',
                start: 2,
                end: 100
            }
        ]
        coreSegmentCheckingLoop(segments, timestep)
    }, 500)
}
function old_init() {
    //TODO: consider refactoring so that globals are safer
    //timeout to give the video time to load. todo: do it a better way
    setTimeout(function() {
        player = document.querySelector("video");
        videoFrame = document.getElementById("movie_player");
        console.log(player)
        function requestTimes() {
            contentId = getContentId(player)
            const xhr = new XMLHttpRequest()
            console.log(contentId)
            xhr.open('GET', 'https://bhuddy.com/times?content_id=' + contentId)
            xhr.onload = function() {
                if (xhr.status === 200) {
                    const segments = responseTextToSegments(xhr.responseText)
                    //later, we can put in a thing that allows users to browse through segments in the sidebar or something, using the segments variable again
                    coreSegmentCheckingLoop(segments, timestep)
                } else if (xhr.status === 202) {
                    setTimeout(function() {
                        requestTimes()
                    }, 5000)
                }
            }
            xhr.send()
        }
        requestTimes()
    }, 500)
}
function stress_test() {
	var responses = 0
	window.setInterval(function() {
		const xhr = new XMLHttpRequest()
		xhr.open('GET', 'https://bhuddy.com/times?content_id=' + "DtDwJZYkqhI")
		xhr.onload = function() {
			if (xhr.status === 200) {
				responses ++
			}
		}
		xhr.send()
	}, 10)
	window.setTimeout(function() {
		responses = 0
		window.setTimeout(function() {
			console.log(responses)
		}, 10000)
	}, 10000)
}
