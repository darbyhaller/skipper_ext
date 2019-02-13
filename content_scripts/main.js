"use strict";
//turns json into a data structure usable by the core loop
//list of segments
//each segment contains: {start, end, desc}
var pmanager = null
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	const url = new URL(request.data.url)
	const v = url.searchParams.get('v')
	if (v != 'null' && v != null) {
		if (pmanager != null)
			pmanager.stop()
		pmanager = new YoutubePlayerManager()
	}
})
function YoutubePlayerManager() {
	this.timestep = 100
	this.player = null
	this.videoFrame = null
	//list of activeSegments
	//each segment contains {skipButton, data}
	//skipButton is a ref to the html skipButton
	//data is a ref to an element of the segments list
	this.oldCurrentActiveSegments = []
	this.sentXHRs = []
	this.intervals = []
	this.stop = function() {
		this.sentXHRs.forEach(r => r.abort())
		this.intervals.forEach(i => window.clearInterval(i))
		this.oldCurrentActiveSegments.forEach(s => this.leaveSegmentAction(s))
	}
	//initializes the object with data loaded from the page html
	//with this info, retrieves data from the server
	//initiates the core loop with processed data retrieved from the server
	this.start = function() {
		const self = this
		const playerLoadedChecker = window.setInterval(function() {
			if (self.loadPlayer()) {
				window.clearInterval(playerLoadedChecker)
				const contentId = self.getContentId(player)
				let xhr = null
				//not perfectly async safe, but ok
				const timesLoadedChecker = window.setInterval(function() {
					//only one xhr out at a time
					if (xhr != null)
						xhr.abort()
					xhr = new XMLHttpRequest()
					xhr.open('GET', 'https://bhuddy.com/times?content_id=' + contentId + '&category=' + self.category)
					xhr.onload = function() {
						if (xhr.status === 200) {
							window.clearInterval(timesLoadedChecker)
							const responseText = xhr.responseText
							const segments = responseTextToSegments(responseText)
							self.startCoreSegmentCheckingLoop(segments, this.timestep)
						}
					}
					self.sentXHRs.push(xhr)
					xhr.send()
				}, 5000)
				self.intervals.push(timesLoadedChecker)
			}
		}, 200)
		self.intervals.push(playerLoadedChecker)
	}
	this.loadPlayer = function() {
		this.player = document.querySelector("video");
		this.videoFrame = document.getElementById("movie_player");
		this.category = getGameTitle()
		return (this.player && this.videoFrame && this.category)
	}
	//manages showing and hiding of skip buttons based on what segment we are in
	this.startCoreSegmentCheckingLoop = function(segments) {
		//in this context, what is usually called a 'segment' is now reffered to as 'segment data'
		//this it to distinguish it from a 'active segment', which consists of segment data along with various data associated with its activity
		const self = this
		const coreSegmentCheckingLoop = window.setInterval(function() {
			const currentTime = self.getCurrentTime()
			//strict inequality on second part is important so that when you skip to a place, the skip button dissapears (even if you are paused)
			const currentSegmentData = segments.filter((sd) => (sd.start <= currentTime) && (currentTime < sd.end))
			const outdatedActiveSegments = self.oldCurrentActiveSegments.filter(as => !currentSegmentData.includes(as.data))
			outdatedActiveSegments.forEach(s => self.leaveSegmentAction(s))
			const newSegmentData = _.difference(currentSegmentData, self.oldCurrentActiveSegments.map((as) => as.data))
			const newActiveSegments = newSegmentData.map((sd) => self.enterSegmentAction(sd))
			self.oldCurrentActiveSegments = _.union(_.difference(self.oldCurrentActiveSegments, outdatedActiveSegments), newActiveSegments)
		}, this.timestep)
		this.intervals.push(coreSegmentCheckingLoop)
	}
	this.enterSegmentAction = function(segmentData) {
		if (segmentData.desc == 'dead')
			return this.showSkipper(segmentData)
		if (segmentData.desc == 'alive')
			return {
				data: segmentData
			}
		else
			return null
	}
	this.leaveSegmentAction = function(activeSegment) {
		if (activeSegment.data.desc == 'dead')
			this.hideSkipper(activeSegment)
	}
	//called whenever entering into a segment after previously not being in it
	//shows the skipper for the current segment
	//TODO: stackable (can have multiple at once) -- this would be good, at least
	this.showSkipper = function(segmentData) {
		const skipButton = document.createElement("div")
		skipButton.innerHTML = skipText(segmentData.desc)
		skipButton.onclick = () => this.skipToEndOfSegment(segmentData)
		skipButton.onmouseover = () => skipButton.style.border = "1px solid rgba(255,255,255,1)"
		skipButton.onmouseout = () => skipButton.style.border = "1px solid rgba(255,255,255,.5)"
		skipButton.classList.add('skipButton')
		this.videoFrame.appendChild(skipButton)
		return {
			skipButton,
			data: segmentData
		}
	}
	this.hideSkipper = function(activeSegment) {
		this.videoFrame.removeChild(activeSegment.skipButton)
	}
	this.skipToEndOfSegment = function(segmentData) {
		this.setCurrentTime(segmentData.end)
	}
	this.getCurrentTime = function() {
		return this.player.currentTime
	}
	this.setCurrentTime = function(t) {
		this.player.currentTime = t
	}
	this.getContentId = function(player) {
		const url = new URL(this.player.baseURI)
		return url.searchParams.get('v')
	}
	this.start()
}
function responseTextToSegments(jsonResponse) {
	return JSON.parse(jsonResponse)
}
function skipText(desc) {
	switch (desc) {
		case "dead":
			return "Skip to Respawn"
	}
	return ""
}

function getGameTitle() {
	const meta_contents = document.getElementById('meta-contents')
	if(meta_contents) {
		const game_title_div = meta_contents.querySelector('#title')
		if (game_title_div) {
			return game_title_div.innerHTML.replace(/\s/g,'')
		}
	}
	return null
}
