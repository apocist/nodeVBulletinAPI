const Thread = require('./Thread');

function Forum(rawdata) {
	this.rawdata = rawdata;
	this.parseData();
	this.cleanup();
}

Forum.prototype.parseData = function() {
	if(this.rawdata) {
		//TODO need to speficiy if its fully fetched
		let rawdata = this.rawdata;
		if (rawdata.hasOwnProperty('forumid')) {
			this.forumid = rawdata.forumid;
		}
		if (rawdata.hasOwnProperty('title')) {
			this.title = rawdata.title;
		}
		if (rawdata.hasOwnProperty('description')) {
			this.description = rawdata.description;
		}
		if (rawdata.hasOwnProperty('parentid')) {
			this.parentid = rawdata.parentid;
		}
		if (rawdata.hasOwnProperty('foruminfo')) {
			let foruminfo = rawdata['foruminfo'];
			if (foruminfo.hasOwnProperty('forumid')) {
				this.forumid = foruminfo.forumid;
			}
			if (foruminfo.hasOwnProperty('title')) {
				this.title = foruminfo.title;
			}
			if (foruminfo.hasOwnProperty('description')) {
				this.description = foruminfo.description;
			}
			
			
		}
		//Get Threads
		if (rawdata.hasOwnProperty('threadbits')) {
			let threadbits = rawdata['threadbits'];
			this.threads = [];
			for (let thread in threadbits) {
				if (threadbits.hasOwnProperty(thread)) {
					this.threads.push(new Thread(threadbits[thread]));
				}
			}
		}
		//Get Sub Forums
		let forumbits;
		if (rawdata.hasOwnProperty('forumbits')) {
			forumbits = rawdata['forumbits'];
		} else if (rawdata.hasOwnProperty('subforums')) {
			forumbits = rawdata['subforums'];
		}
		if(forumbits){
			this.subforums = [];
			for (let subforum in forumbits) {
				if (forumbits.hasOwnProperty(subforum)) {
					this.subforums.push(new Forum(forumbits[subforum]));
				}
			}
		}
		
	}
};

Forum.prototype.cleanup = function() {
	delete(this.rawdata);
};

module.exports = Forum;