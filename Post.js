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

    /**
     * Attempts to submit a new Post into a specified Thread
     * @param {VBApi} VBApi
     * @param {number} threadId - Thread id
     * @param {string} message - Post Message
     * @param {object=} options
     * @param {boolean=} options.signature  - Optionally append your signature
     * @param {number=} options.threadid - Ignore, already required at threadId
     * @param {string=} options.message - Ignore, already required at message
     * TODO note additional options
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async newPost(VBApi, threadId, message, options) {
        let that = VBApi;
        options = options || {};
        options.threadid = threadId || options.threadid || ''; //required
        options.message = message || options.message || ''; //required
        if (options.signature === true) {
            //System only handle 1 or 0. defaults to 0
            options.signature = '1';
        }

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'newreply_postreply',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                //success is errormessgae 'redirect_postthanks'
                //error 'threadclosed' if thread is closed. FIXME does not error
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
     * Attempts to edit an existing Post
     * @param {VBApi} VBApi
     * @param {number} postId - Post id
     * @param {string} message - Post Message
     * @param {object=} options
     * @param {string=} options.reason - Reason for editing
     * @param {boolean=} options.signature - Optionally append your signature
     * @param {number=} options.postid - Ignore, already required at postId
     * @param {string=} options.message - Ignore, already required at message
     * TODO note additional options
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async editPost(VBApi, postId, message, options) {
        let that = VBApi;
        options = options || {};
        options.postid = postId || options.postid || ''; //required
        options.message = message || options.message || ''; //required
        if (options.signature === true) {
            //System only handle 1 or 0. defaults to 0
            options.signature = '1';
        }

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'editpost_updatepost',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                //success is errormessgae 'redirect_editthanks'
                if (possibleError === 'redirect_editthanks') {
                    resolve({postid: options.postid});
                } else {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * TODO untested - does not seem to function yet
     * Attempts to delete an existing Post
     * @param {VBApi} VBApi
     * @param {number} postId - Post id
     * @param {number} threadId - Thread id
     * @param {object=} options
     * @param {string=} options.reason - Reason for deleting
     * @param {number=} options.postid - Ignore, already required at postId
     * @param {number=} options.threadid - Ignore, already required at threadId
     * TODO note additional options
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async deletePost(VBApi, postId, threadId, options) {
        let that = VBApi;
        options = options || {};
        options.postid = postId || options.postid || ''; //required
        options.threadid = threadId || options.threadid || ''; // TODO required????

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'editpost_deletepost',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                //unknown response
                if (
                    possibleError === 'redirect_deletepost'
                    && response.hasOwnProperty('show')
                ) {
                    //console.log('response', response);
                    resolve(response.show);
                } else {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
        });
    }
}

module.exports = Post;