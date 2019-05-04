const Thread = require('./Thread');

/**
 *
 * @param {object} rawData
 * @constructor
 * @property {number} forumId
 * @property {string} title
 * @property {string} description
 * @property {number} parentId
 * @property {[Thread]} threads
 * @property {[Forum]} subForums
 */
const Forum = function Forum(rawData) {
    this.rawData = rawData;
    this.parseData();
    this.cleanup();
};

Forum.prototype.parseData = function () {
    if (this.rawData) {
        //TODO need to specify if its fully fetched
        let rawData = this.rawData;
        if (rawData.hasOwnProperty('forumid')) {
            this.forumId = parseInt(rawData.forumid);
        }
        if (rawData.hasOwnProperty('title')) {
            this.title = rawData.title;
        }
        if (rawData.hasOwnProperty('description')) {
            this.description = rawData.description;
        }
        if (rawData.hasOwnProperty('parentid')) {
            this.subForums = rawData.parentid;
        }
        if (rawData.hasOwnProperty('foruminfo')) {
            let forumInfo = rawData.foruminfo;
            if (forumInfo.hasOwnProperty('forumid')) {
                this.forumId = parseInt(forumInfo.forumid);
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
        if (forumBits) {
            this.subForums = [];
            for (let subForum in forumBits) {
                if (forumBits.hasOwnProperty(subForum)) {
                    this.subForums.push(new Forum(forumBits[subForum]));
                }
            }
        }

    }
};

Forum.prototype.cleanup = function () {
    delete (this.rawData);
};

module.exports = Forum;