
function Post(rawdata) {
	this.rawdata = rawdata;
	this.parseData();
	this.cleanup();
}

Post.prototype.parseData = function() {
	if(this.rawdata) {
		let rawdata = this.rawdata;
		
		if(rawdata.hasOwnProperty('post')) {
			let postData = rawdata['post'];
			if (postData.hasOwnProperty('postid')) {
				this.postid = postData.postid;
			}
			if (postData.hasOwnProperty('threadid')) {
				this.threadid = postData.threadid;
			}
			if (postData.hasOwnProperty('posttime')) {
				this.posttime = postData.posttime;
			}
			if (postData.hasOwnProperty('title')) {
				this.title = postData.title;
			}
			if (postData.hasOwnProperty('message')) {
				this.message = postData.message;
			}
			if (postData.hasOwnProperty('message_plain')) {
				this.message_plain = postData.message_plain;
			}
			if (postData.hasOwnProperty('message_bbcode')) {
				this.message_bbcode = postData.message_bbcode;
			}
			if (postData.hasOwnProperty('signature')) {
				this.signature = postData.signature;
			}
			
			//TODO handle users
			if (postData.hasOwnProperty('userid')) {
				this.userid = postData.userid;
			}
			if (postData.hasOwnProperty('username')) {
				this.username = postData.username;
			}
		}
		
	}
};

Post.prototype.cleanup = function() {
	delete(this.rawdata);
};

module.exports = Post;