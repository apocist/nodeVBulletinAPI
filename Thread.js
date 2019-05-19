'use strict';
const Post = require('./Post');

/**
 * @type {Class}
 * @property {number} forumId
 * @property {string} forumTitle
 * @property {number} id
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
     * @property {RawPostData[]} postbits
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
                    this.id = parseInt(threadData.threadid);
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

    /**
     * Attempts to submit a new Thread into a specified Forum. This will also be considered the first Post
     * @param {VBApi} VBApi
     * @param {number} forumId - Forum Id
     * @param {string} subject - Post/Thread Subject
     * @param {string} message - Post Message
     * @param {object=} options
     * @param {boolean=} options.signature - Optionally append your signature
     * @param {number=} options.forumid - Ignore, already required at postId
     * @param {string=} options.subject - Ignore, already required at postId
     * @param {string=} options.message - Ignore, already required at postId
     * TODO note additional options
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async newThread(VBApi, forumId, subject, message, options) {
        let that = VBApi;
        options = options || {};
        options.forumid = forumId || options.forumid || ''; //required
        options.subject = subject || options.subject || ''; //required
        options.message = message || options.message || ''; //required

        if (options.signature === true) {
            //System only handle 1 or 0. defaults to 0
            options.signature = '1'; // FIXME This didn't seem to work
        }

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'newthread_postthread',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                //success is errormessgae 'redirect_postthanks'
                //reports threadid and postid
                if (
                    possibleError === 'redirect_postthanks'
                    && response.hasOwnProperty('show')
                ) {
                    resolve(response.show);
                } else {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * List detailed information about a Thread and it's Posts
     * @param {VBApi} VBApi
     * @param {number} threadId - Thread id
     * @param {object=} options - Secondary Options
     * @param {number=} options.threadid - Ignore, already required at threadId
     * TODO note additional options
     * @returns {Promise<Thread>} - Returns a Thread object
     * @fulfill {Thread}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async getThread(VBApi, threadId, options) {
        let that = VBApi;
        options = options || {};
        options.threadid = threadId || options.threadid || ''; //required

        return new Promise(async function (resolve, reject) {
            let thread = null;
            try {
                let response = await that.callMethod({
                    method: 'showthread',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    thread = new Thread(response.response);
                }
            } catch (e) {
                reject(e);
            }
            if (thread !== null) {
                resolve(thread);
            } else {
                reject();
            }
        });
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Attempts to close a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param {VBApi} VBApi
     * @param {number} threadId - Id of Thread to close
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async modCloseThread(VBApi, threadId) {
        let that = VBApi;
        let cookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'inlinemod_close',
                    cookies: cookies || {}
                });
                //let possibleError = that.constructor.parseErrorMessage(response);
                //unknown responses
                /*if (
                    possibleError === 'redirect_postthanks'
                    && response.hasOwnProperty('show')
                ) {*/
                resolve(response);
                /*} else {
                    reject(possibleError || response);
                }*/
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Attempts to open a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param {VBApi} VBApi
     * @param {number} threadId - Id of Thread to open
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async modOpenThread(VBApi, threadId) {
        let that = VBApi;
        let cookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'inlinemod_open',
                    cookies: cookies || {}
                });
                //let possibleError = that.constructor.parseErrorMessage(response);
                //unknown responses
                /*if (
                    possibleError === 'redirect_postthanks'
                    && response.hasOwnProperty('show')
                ) {*/
                resolve(response);
                /*} else {
                    reject(possibleError || response);
                }*/
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Attempts to delete a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param {VBApi} VBApi
     * @param {number} threadId - Id of Thread to close
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async modDeleteThread(VBApi, threadId) {
        let that = VBApi;
        let cookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'inlinemod_dodeletethreads',
                    cookies: cookies || {}
                });
                //let possibleError = that.constructor.parseErrorMessage(response);
                //unknown responses
                /*if (
                    possibleError === 'redirect_postthanks'
                    && response.hasOwnProperty('show')
                ) {*/
                resolve(response);
                /*} else {
                    reject(possibleError || response);
                }*/
            } catch (e) {
                reject(e);
            }
        });
    }
}

module.exports = Thread;