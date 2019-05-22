'use strict';
const _ = require('underscore');

/**
 *
 * @type {Class}
 * @property {number} totalMessages
 * @property {number} messageQuota
 * @property {Object[]} messages
 * @property {number} messages.id
 * @property {string} messages.title
 * @property {Date} messages.time
 * @property {'new' || 'old' || 'replied'} messages.status
 * @property {number} messages.userId
 * @property {string} messages.username
 * @property {boolean} messages.unread
 */
class Inbox {
    /**
     *
     * @typedef {Object} RawInboxData
     * @property {Object} inboxData
     * @property {Object} inboxData.HTML
     * @property {number} inboxData.HTML.folderid 0
     * @property {string} inboxData.HTML.pagenav
     * @property {number} inboxData.HTML.pagenumber 1
     * @property {number} inboxData.HTML.perpage 50
     * @property {string} inboxData.HTML.pmquota 2000
     * @property {string} inboxData.HTML.pmtotal 2
     * @property {Object} inboxData.HTML.receipts
     * @property {Object} inboxData.HTML.sortfilter
     * @property {string} inboxData.HTML.totalmessages 2
     * @property {string} inboxData.HTML.startmessage 1
     * @property {string} inboxData.HTML.endmessage 2
     * @property {Object} inboxData.HTML.messagelist_periodgroups
     * @property {string} inboxData.HTML.messagelist_periodgroups.group_id '0_yesterday'
     * @property {number} inboxData.HTML.messagelist_periodgroups.messagesingroup
     * @property {Object || Object[]} inboxData.HTML.messagelist_periodgroups.messagelistbits
     * @property {Object} inboxData.HTML.messagelist_periodgroups.messagelistbits.pm
     * @property {string} inboxData.HTML.messagelist_periodgroups.messagelistbits.pm.pmid
     * @property {string} inboxData.HTML.messagelist_periodgroups.messagelistbits.pm.sendtime
     * @property {string} inboxData.HTML.messagelist_periodgroups.messagelistbits.pm.statusicon 'new' || 'old' || 'replied'
     * @property {string} inboxData.HTML.messagelist_periodgroups.messagelistbits.pm.title
     * @property {Object} inboxData.HTML.messagelist_periodgroups.messagelistbits.userbit
     * @property {Object} inboxData.HTML.messagelist_periodgroups.messagelistbits.userbit.0
     * @property {Object} inboxData.HTML.messagelist_periodgroups.messagelistbits.userbit.1
     * @property {Object} inboxData.HTML.messagelist_periodgroups.messagelistbits.userbit.userinfo
     * @property {string} inboxData.HTML.messagelist_periodgroups.messagelistbits.userbit.userinfo.userid
     * @property {string} inboxData.HTML.messagelist_periodgroups.messagelistbits.userbit.userinfo.username
     * @property {Object} inboxData.HTML.messagelist_periodgroups.messagelistbits.show
     * @property {string || number} inboxData.HTML.messagelist_periodgroups.messagelistbits.show.pmicon true/false
     * @property {string || number} inboxData.HTML.messagelist_periodgroups.messagelistbits.show.unread true/false
     */

    /**
     *
     * @param {RawInboxData} rawData
     */
    constructor(rawData) {
        this.rawData = rawData;

        this.messages = [];

        this.__parseData();
        this.__cleanup();
    };

    __parseData() {
        // TODO Only handling single folder at this time
        let that = this;
        if (this.rawData) {
            let rawData = this.rawData;
            if (rawData.hasOwnProperty('HTML')) {
                that.totalMessages = parseInt(rawData.HTML.pmtotal);
                that.messageQuota = parseInt(rawData.HTML.pmquota);
                if (
                    rawData.HTML.hasOwnProperty('messagelist_periodgroups')
                    && rawData.HTML.messagelist_periodgroups.hasOwnProperty('messagelistbits')
                ) {
                    // Can be a object (singular) or array
                    let messageListBits = rawData.HTML.messagelist_periodgroups.messagelistbits;
                    if (!_.isArray(messageListBits)) {
                        messageListBits = [messageListBits];
                    }
                    messageListBits.forEach(function (rawMessage) {
                        that.messages.push({
                            id: parseInt(rawMessage.pm.pmid), // number
                            title: rawMessage.pm.title, // string
                            time: new Date(parseInt(rawMessage.pm.sendtime) * 1000), // Date
                            status: rawMessage.pm.statusicon, // string
                            userId: parseInt(rawMessage.userbit.userinfo.userid), // number
                            username: rawMessage.userbit.userinfo.username, // string
                            unread: !!parseInt(rawMessage.show.unread), // boolean
                        });
                    });
                }
            }
        }
    };

    __cleanup() {
        delete (this.rawData);
    };

    /**
     * Get logged in user's Inbox and list of private Messages
     * @param {VBApi} VBApi
     * @param {object=} options
     * @returns {Promise<Inbox>} - Returns an Inbox object
     * @fulfill {Inbox}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async get(VBApi, options) {
        let that = VBApi;
        options = options || {};

        return new Promise(async function (resolve, reject) {
            let inbox = null;
            try {
                let response = await that.callMethod({
                    method: 'private_messagelist',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    inbox = new Inbox(response.response);
                }
            } catch (e) {
                reject(e);
            }
            if (inbox !== null) {
                resolve(inbox);
            } else {
                reject();
            }
        });
    }

    /**
     * Attempts to submit a new Thread into a specified Forum. This will also be considered the first Post
     * @param {Date} date - Delete all messages from before the specified date
     * @param {number=0} folderId - Folder Id, defaults to 0
     * @param {object=} options
     * @param {string=} options.dateline - Ignore, already required at date
     * @param {number=} options.folderid - Ignore, already required at folderId
     * TODO note additional options
     * @param {VBApi} VBApi
     * @returns {Promise<void>} - Returns a unhandled response currently
     * @fulfill {void}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async empty(VBApi, date, folderId, options) {
        let that = VBApi;
        options = options || {};
        options.dateline = parseInt((date.getTime() / 1000).toFixed(0)) || options.dateline || ''; //required
        options.folderid = folderId || options.folderid || '0';

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'private_confirmemptyfolder',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                if (possibleError !== 'pm_messagesdeleted') {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
            resolve();
        });
    }
}

module.exports = Inbox;