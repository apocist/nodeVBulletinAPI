'use strict';

/**
 *
 * @type {Class}
 * @property {number} id
 * @property {number} folderId
 * @property {string} recipients FIXME this needs to be parsed into username possible. expect to change
 * @property {string} title
 * @property {string} message
 * @property {string} messagePlain
 * @property {string} messageBBCode
 * @property {'new' || 'old' || 'replied'} status
 * @property {Date} time
 * @property {number} userId
 * @property {string} username
 * @property {Object} user
 * @property {number} user.id
 * @property {string} user.username
 * @property {string} user.title
 * @property {string} user.signature
 * @property {string} user.avatarUrl
 * @property {boolean} user.online
 * @property {Date} user.joinDate
 */
class Message {
    /**
     *
     * @typedef {Object} RawMessageData
     * @property {Object} messageData
     * @property {Object} messageData.HTML
     * @property {[]} messageData.HTML.bccrecipients
     * @property {[]} messageData.HTML.ccrecipients
     * @property {Object} messageData.HTML.pm
     * @property {string} messageData.HTML.pm.pmid
     * @property {string} messageData.HTML.pm.title
     * @property {string} messageData.HTML.pm.recipients 'UserHere ; ' possibly delimited by ;
     * @property {string || number} messageData.HTML.pm.savecopy 0
     * @property {string} messageData.HTML.pm.folderid '0'
     * @property {string} messageData.HTML.pm.fromusername
     * @property {Object} messageData.HTML.postbit
     * @property {Object} messageData.HTML.postbit.show
     * @property {Object} messageData.HTML.postbit.post
     * @property {'new' || 'old' || 'replied'} messageData.HTML.postbit.post.statusicon
     * @property {string} messageData.HTML.postbit.post.posttime
     * @property {string || number} messageData.HTML.postbit.post.checkbox_value
     * @property {string} messageData.HTML.postbit.post.onlinestatusphrase 'x_is_online_now'
     * @property {string || number} messageData.HTML.postbit.post.userid
     * @property {string} messageData.HTML.postbit.post.username
     * @property {string} messageData.HTML.postbit.post.avatarUrl  'customavatars/avatar0000_14.gif'
     * @property {Object} messageData.HTML.postbit.post.onlinestatus
     * @property {string || number} messageData.HTML.postbit.post.onlinestatus.onlinestatus 0
     * @property {string} messageData.HTML.postbit.post.usertitle
     * @property {string} messageData.HTML.postbit.post.joindate
     * @property {string} messageData.HTML.postbit.post.title Message title
     * @property {string} messageData.HTML.postbit.post.message
     * @property {string} messageData.HTML.postbit.post.message_plain
     * @property {string} messageData.HTML.postbit.post.message_bbcode
     * @property {string} messageData.HTML.postbit.post.signature
     */

    /**
     *
     * @param {RawMessageData} rawData
     */
    constructor(rawData) {
        this.rawData = rawData;
        this.__parseData();
        this.__cleanup();
    };

    __parseData() {
        let that = this;
        if (that.rawData
            && that.rawData.hasOwnProperty('HTML')
            && that.rawData.HTML.hasOwnProperty('pm')
            && that.rawData.HTML.hasOwnProperty('postbit')
            && that.rawData.HTML.hasOwnProperty('postbit')
            && that.rawData.HTML.postbit.hasOwnProperty('post')
        ) {
            let pm = that.rawData.HTML.pm;
            let post = that.rawData.HTML.postbit.post;

            that.id = parseInt(pm.pmid); // number
            that.folderId = parseInt(pm.folderid);
            that.recipients = pm.recipients; // FIXME need to parse this
            that.title = post.title || pm.title;
            that.message = post.message;
            that.messagePlain = post.message_plain;
            that.messageBBCode = post.message_bbcode;
            that.status = post.statusicon;
            that.time = new Date(parseInt(post.posttime) * 1000);


            that.userId = parseInt(post.userid);
            that.username = pm.fromusername;
            that.user = {
                id: parseInt(post.userid),
                username: post.username,
                title: post.usertitle,
                signature: post.signature,
                avatarUrl: post.avatarurl,
                online: !!parseInt(post.onlinestatus.onlinestatus),
                joinDate: new Date(parseInt(post.joindate) * 1000),
            };
        }
    };

    __cleanup() {
        delete (this.rawData);
    };

    /**
     * Get details of a specific Message for the logged in user
     * @param {VBApi} VBApi
     * @param {number} id
     * @param {object=} options
     * @param {number=} options.pmid - Ignore, already required at id
     * @returns {Promise<Message>} - Returns a Message object
     * @fulfill {Message}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async getMessage(VBApi, id, options) {
        let that = VBApi;
        options = options || {};
        options.pmid = id || options.pmid || ''; //required

        return new Promise(async function (resolve, reject) {
            let message = null;
            try {
                let response = await that.callMethod({
                    method: 'private_showpm',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    message = new Message(response.response);
                }
            } catch (e) {
                reject(e);
            }
            if (message !== null) {
                resolve(message);
            } else {
                reject();
            }
        });
    }

    /**
     *
     * @param {VBApi} VBApi
     * @param {string} username - Username to send the message to
     * @param {string} title - Message Subject
     * @param {string} message - Message content
     * @param {object=} options
     * @param {boolean=} options.signature - Optionally append your signature
     * @param {string=} options.recipients - Ignore, already required at username
     * @param {string=} options.title - Ignore, already required at title
     * @param {string=} options.message - Ignore, already required at message
     * TODO note additional options
     * @returns {Promise<void>} - Successfully completes if sent. TODO: provide a better response
     * @fulfill {void}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async sendMessage(VBApi, username, title, message, options) {
        let that = VBApi;
        options = options || {};
        options.recipients = username || options.recipients || ''; //required
        options.title = title || options.title || ''; //required
        options.message = message || options.message || ''; //required
        options.signature = options.signature === true ? '1' : '0';

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'private_insertpm',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                if (possibleError !== 'pm_messagesent') {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
            resolve();
        });
    }
}

module.exports = Message;