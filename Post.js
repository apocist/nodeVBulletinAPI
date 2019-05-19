'use strict';

/**
 *
 * @type {Class}
 * @property {number} id
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
class Post {
    /**
     *
     * @typedef {Object} RawPostData
     * @property {Object} post
     * @property {string} post.postid
     * @property {string} post.threadId
     * @property {string} post.postTime
     * @property {string} post.title
     * @property {string} post.message
     * @property {string} post.messagePlain
     * @property {string} post.messageBBCode
     * @property {string} post.signature
     * @property {string} post.userId
     * @property {string} post.username
     */

    /**
     *
     * @param {RawPostData} rawData
     */
    constructor(rawData) {
        this.rawData = rawData;
        this.__parseData();
        this.__cleanup();
    };

    __parseData() {
        if (this.rawData) {
            let rawData = this.rawData;

            if (rawData.hasOwnProperty('post')) {
                let postData = rawData['post'];
                if (postData.hasOwnProperty('postid')) {
                    this.id = parseInt(postData.postid);
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

    __cleanup() {
        delete (this.rawData);
    };
}

module.exports = Post;