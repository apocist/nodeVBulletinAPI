'use strict';
const util = require('util');

/**
 *
 * @type {Class}
 * @property {number} userId
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
     * @TODO
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
        if (this.rawData) {
            let rawData = this.rawData;
            console.log('got inbox:', util.inspect(rawData, false, 5));

            if (
                rawData.hasOwnProperty('HTML')
                && rawData.HTML.hasOwnProperty('pm')
                && rawData.HTML.hasOwnProperty('postbit')
                && rawData.HTML.hasOwnProperty('postbit')
                && rawData.HTML.postbit.hasOwnProperty('post')
            ) {
                let pm = rawData.HTML.pm;
                let post = rawData.HTML.postbit.post;

                that.id = parseInt(pm.pmid); // number
                that.folderId = parseInt(pm.folderid);
                that.recipients = pm.recipients; // FIXME need to parse this
                that.title = post.title || pm.title;
                that.message = post.message;
                that.messagePlain = post.message_plain;
                that.messageBBCode = post.message_bbcode;


                that.userId = parseInt(post.userid);
                that.username = pm.username;
                that.user = {
                    // TODO push this into a Member object?
                    id: parseInt(post.userid),
                    username: post.username,
                    title: post.usertitle,
                    signature: post.signature,
                    avatarUrl: post.avatarUrl,
                    online: !!parseInt(post.onlinestatus.onlinestatus),
                    joinDate: new Date(parseInt(post.joindate) * 1000),
                };

            }

        }
    };

    __cleanup() {
        delete (this.rawData);
    };
}

module.exports = Message;