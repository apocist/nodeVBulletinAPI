"use strict";
const Post = require('./Post');

/**
 * @type {Class}
 * @property {number} forumId
 * @property {string} forumTitle
 * @property {number} threadId
 * @property {string} title
 * @property {Post[]} posts
 */
class Thread {
    /**
     * @typedef {Object} RawThreadData
     * @property {Object} thread
     * @property {string} thread.forumid
     * @property {string} thread.forumtitle
     * @property {string} thread.threadid
     * @property {string} thread.title
     * @property {string} thread.threadtitle
     * @property {[]} postbits
     */

    /**
     * @param {RawThreadData} rawData
     */
    constructor(rawData) {
        this.rawData = rawData;
        this.__parseData();
        this.__cleanup();
    }

    /**
     *
     * @private
     */
    __parseData() {
        if (this.rawData) {
            //TODO need to specify if its fully fetched
            let rawData = this.rawData;

            if (rawData.hasOwnProperty('thread')) {
                let threadData = rawData['thread'];
                if (threadData.hasOwnProperty('forumid')) {
                    this.forumId = parseInt(threadData.forumid);
                }
                if (threadData.hasOwnProperty('forumtitle')) {
                    this.forumTitle = threadData.forumtitle;
                }
                if (threadData.hasOwnProperty('threadid')) {
                    this.threadId = parseInt(threadData.threadid);
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
    }

    /**
     *
     * @private
     */
    __cleanup() {
        delete (this.rawData);
    }
}

module.exports = Thread;