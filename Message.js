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
     * @property {string} messageData.HTML.pm.recipients 'UserHEre ; ' possibly delimited by ;
     * @property {string || number} messageData.HTML.pm.savecopy 0
     * @property {string} messageData.HTML.pm.folderid '0'
     * @property {string} messageData.HTML.pm.fromusername
     * @property {Object} messageData.HTML.postbits
     * @property {Object} messageData.HTML.postbits.post
     * @property {'new' || 'old' || 'replied'} messageData.HTML.postbits.post.statusicon
     * @property {string} messageData.HTML.postbits.post.posttime
     * @property {string || number} messageData.HTML.postbits.post.checkbox_value
     * @property {string} messageData.HTML.postbits.post.onlinestatusphrase 'x_is_online_now'
     * @property {number} messageData.HTML.postbits.post.userid
     * @property {string} messageData.HTML.postbits.post.username
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

            }

        }
    };

    __cleanup() {
        delete (this.rawData);
    };
}

module.exports = Message;