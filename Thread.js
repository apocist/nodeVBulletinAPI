const Post = require('./Post');

function Thread(rawdata) {
	this.rawdata = rawdata;
	this.parseData();
	this.cleanup();
}

Thread.prototype.parseData = function() {
	if(this.rawdata) {
		//TODO need to speficiy if its fully fetched
		let rawdata = this.rawdata;
		
		if(rawdata.hasOwnProperty('thread')) {
			let threadData = rawdata['thread'];
			if (threadData.hasOwnProperty('forumid')) {
				this.forumid = threadData.forumid;
			}
			if (threadData.hasOwnProperty('forumtitle')) {
				this.forumtitle = threadData.forumtitle;
			}
			if (threadData.hasOwnProperty('threadid')) {
				this.threadid = threadData.threadid;
			}
			if (threadData.hasOwnProperty('title')) {
				this.title = threadData.title;
			} else if (threadData.hasOwnProperty('threadtitle')) {
				this.title = threadData['threadtitle'];
			}
			if (threadData.hasOwnProperty('threadid')) {
				this.threadid = threadData.threadid;
			}
		}
		
		if (rawdata.hasOwnProperty('postbits')) {
			let postbits = rawdata['postbits'];
			this.posts = [];
			for (let post in postbits) {
				if (postbits.hasOwnProperty(post)) {
					this.posts.push(new Post(postbits[post]));
				}
			}
		}
		
	}
};

Thread.prototype.cleanup = function() {
	delete(this.rawdata);
};

module.exports = Thread;