"use strict";
/**
 *
 * @param {object} rawData
 * @constructor
 * @property {number} postid
 * @property {number} threadId
 * @property {number} postTime
 * @property {string} title
 * @property {string} message
 * @property {string} messagePlain
 * @property {string} messageBBCode
 * @property {string} signature
 * @property {number} userId
 * @property {string} username
 */
const Post = function Post(rawData) {
    this.rawData = rawData;
    this.parseData();
    this.cleanup();
};

Post.prototype.parseData = function () {
    if (this.rawData) {
        let rawData = this.rawData;

        if (rawData.hasOwnProperty('post')) {
            let postData = rawData['post'];
            if (postData.hasOwnProperty('postid')) {
                this.postId = parseInt(postData.postid);
            }
            if (postData.hasOwnProperty('threadid')) {
                this.threadId = parseInt(postData.threadid);
            }
            if (postData.hasOwnProperty('posttime')) {
                this.postTime = parseInt(postData.posttime);
            }
            if (postData.hasOwnProperty('title')) {
                this.title = postData.title;
            }
            if (postData.hasOwnProperty('message')) {
                this.message = postData.message;
            }
            if (postData.hasOwnProperty('message_plain')) {
                this.messagePlain = postData.message_plain;
            }
            if (postData.hasOwnProperty('message_bbcode')) {
                this.messageBBCode = postData.message_bbcode;
            }
            if (postData.hasOwnProperty('signature')) {
                this.signature = postData.signature;
            }

            //TODO handle users
            if (postData.hasOwnProperty('userid')) {
                this.userId = parseInt(postData.userid);
            }
            if (postData.hasOwnProperty('username')) {
                this.username = postData.username;
            }
        }

    }
};

Post.prototype.cleanup = function () {
    delete (this.rawData);
};

module.exports = Post;