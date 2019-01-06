const Post = require('./Post');

/**
 *
 * @param {object} rawData
 * @constructor
 * @property {number} forumid
 * @property {string} forumtitle
 * @property {number} threadid
 * @property {string} title
 * @property {[Post]} posts
 */
const Thread = function Thread(rawData) {
	this.rawData = rawData;
	this.parseData();
	this.cleanup();
};


Thread.prototype.parseData = function() {
	if(this.rawData) {
		//TODO need to speficiy if its fully fetched
		let rawData = this.rawData;
		
		if(rawData.hasOwnProperty('thread')) {
			let threadData = rawData['thread'];
			if (threadData.hasOwnProperty('forumid')) {
				this.forumid = parseInt(threadData.forumid);
			}
			if (threadData.hasOwnProperty('forumtitle')) {
				this.forumtitle = threadData.forumtitle;
			}
			if (threadData.hasOwnProperty('threadid')) {
				this.threadid = parseInt(threadData.threadid);
			}
			if (threadData.hasOwnProperty('title')) {
				this.title = threadData.title;
			} else if (threadData.hasOwnProperty('threadtitle')) {
				this.title = threadData.threadtitle;
			}
		}
		
		if (rawData.hasOwnProperty('postbits')) {
			let postBits = rawData.postbits;
			this.posts = [];
			for (let post in postBits) {
				if (postBits.hasOwnProperty(post)) {
					this.posts.push(new Post(postBits[post]));
				}
			}
		}
		
	}
};

Thread.prototype.cleanup = function() {
	delete(this.rawData);
};

module.exports = Thread;