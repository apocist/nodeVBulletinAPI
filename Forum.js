'use strict';
const Thread = require('./Thread');

/**
 * @type {Class}
 * @property {number} id
 * @property {string} title
 * @property {string} description
 * @property {number} parentId
 * @property {Forum[]} subForums
 * @property {Thread[]} threads
 */
class Forum {
    /**
     * @typedef {Object} RawForumData
     * @property {string} forumid
     * @property {string} title
     * @property {string} description
     * @property {string} parentid
     * @property {Object} foruminfo
     * @property {string} foruminfo.forumid
     * @property {string} foruminfo.title
     * @property {string} foruminfo.description
     * @property {RawForumData[]} forumbits
     * @property {RawThreadData[]} threadbits
     */

    /**
     *
     * @param {RawForumData} rawData
     */
    constructor(rawData) {
        this.rawData = rawData;
        this.__parseData();
        this.__cleanup();
    };

    __parseData() {
        if (this.rawData) {
            //TODO need to specify if its fully fetched
            let rawData = this.rawData;
            if (rawData.hasOwnProperty('forumid')) {
                this.id = parseInt(rawData.forumid);
            }
            if (rawData.hasOwnProperty('title')) {
                this.title = rawData.title;
            }
            if (rawData.hasOwnProperty('description')) {
                this.description = rawData.description;
            }
            if (rawData.hasOwnProperty('parentid')) {
                this.parentId = parseInt(rawData.parentid);
            }
            if (rawData.hasOwnProperty('foruminfo')) {
                let forumInfo = rawData.foruminfo;
                if (forumInfo.hasOwnProperty('forumid')) {
                    this.id = parseInt(forumInfo.forumid);
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

    __cleanup() {
        delete (this.rawData);
    };

    /**
     * List every Forum and sub forum available to the user.
     * @param {VBApi} VBApi
     * @returns {Promise<Forum[]>} - Array of Forum objects
     * @fulfill {Forum[]}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async getHome(VBApi) {
        let that = VBApi;
        return new Promise(async function (resolve, reject) {
            let forums = [];
            try {
                let response = await that.callMethod(
                    {
                        method: 'api_forumlist'
                    });

                if (response) {
                    for (let forum in response) {
                        if (response.hasOwnProperty(forum)) {
                            forums.push(new Forum(response[forum]));
                        }
                    }
                }
            } catch (e) {
                reject(e);
            }
            resolve(forums);
        });
    }

    /**
     * List detailed info about a forum and it's sub-forums and threads
     * @param {VBApi} VBApi
     * @param {number} forumId - Forum id
     * @param {object=} options - Secondary Options
     * @param {number=} options.forumid - Ignore, already required at forumId
     * TODO note additional options
     * @returns {Promise<Forum>} - Returns a Forum object
     * @fulfill {Forum}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async get(VBApi, forumId, options) {
        let that = VBApi;
        options = options || {};
        options.forumid = forumId || options.forumid || ''; //required

        return new Promise(async function (resolve, reject) {
            let forum = null;
            try {
                let response = await that.callMethod({
                    method: 'forumdisplay',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    forum = new Forum(response.response);
                }
            } catch (e) {
                reject(e);
            }
            if (forum !== null) {
                resolve(forum);
            } else {
                reject();
            }
        });
    }
}

module.exports = Forum;