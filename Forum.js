const Thread = require('./Thread');

/**
 *
 * @param {object} rawData
 * @constructor
 * @property {number} forumid
 * @property {string} title
 * @property {string} description
 * @property {number} parentid
 * @property {[Thread]} threads
 * @property {[Forum]} subforums
 */
const Forum = function Forum(rawData) {
	this.rawData = rawData;
	this.parseData();
	this.cleanup();
};

Forum.prototype.parseData = function() {
	if(this.rawData) {
		//TODO need to specify if its fully fetched
		let rawData = this.rawData;
		if (rawData.hasOwnProperty('forumid')) {
			this.forumid = parseInt(rawData.forumid);
		}
		if (rawData.hasOwnProperty('title')) {
			this.title = rawData.title;
		}
		if (rawData.hasOwnProperty('description')) {
			this.description = rawData.description;
		}
		if (rawData.hasOwnProperty('parentid')) {
			this.parentid = rawData.parentid;
		}
		if (rawData.hasOwnProperty('foruminfo')) {
			let forumInfo = rawData.foruminfo;
			if (forumInfo.hasOwnProperty('forumid')) {
				this.forumid = parseInt(forumInfo.forumid);
			}
			if (forumInfo.hasOwnProperty('title')) {
				this.title = forumInfo.title;
			}
			if (forumInfo.hasOwnProperty('description')) {
				this.description = forumInfo.description;
			}
			
			
		}
		//Get Threads
		if (rawData.hasOwnProperty('threadbits')) {
			let threadBits = rawData.threadbits;
			this.threads = [];
			for (let thread in threadBits) {
				if (threadBits.hasOwnProperty(thread)) {
					this.threads.push(new Thread(threadBits[thread]));
				}
			}
		}
		//Get Sub Forums
		let forumBits;
		if (rawData.hasOwnProperty('forumbits')) {
			forumBits = rawData.forumbits;
		} else if (rawData.hasOwnProperty('subforums')) {
			forumBits = rawData['subforums'];
		}
		if(forumBits){
			this.subforums = [];
			for (let subForum in forumBits) {
				if (forumBits.hasOwnProperty(subForum)) {
					this.subforums.push(new Forum(forumBits[subForum]));
				}
			}
		}
		
	}
};

Forum.prototype.cleanup = function() {
	delete(this.rawData);
};

module.exports = Forum;