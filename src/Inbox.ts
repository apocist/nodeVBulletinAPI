import * as _ from 'lodash'
import {VBApi, CallMethodParameters} from './VBApi';
import {Message} from './Message';

export interface InboxEmptyOptions extends CallMethodParameters {
    dateline?: string,
    folderid?: string
}

export interface RawMessageListBit {
    pm: {
        pmid: string,
        sendtime: string,
        statusicon: 'new' | 'old' | 'replied',
        title: string
    },
    userbit: {
        0: unknown,
        1: unknown,
        userinfo: {
            userid: string,
            username: string
        }
    },
    show: {
        pmicon: 'true' | 'false',
        unread: '0' | '1'
    }
}

export interface RawInboxData {
    HTML: {
        folderid: string, // 0
        pagenav: string,
        pagenumber: string, // 1
        perpage: string, // 50
        pmquota: string, // 2000
        pmtotal: string, 2
        receipts: unknown, //object
        sortfilter: unknown, //object
        totalmessages: string, // 2
        startmessage: string, // 1
        endmessage: string, // 2
        messagelist_periodgroups: {
            group_id: string, // '0_yesterday'
            messagesingroup: string, // number
            messagelistbits: RawMessageListBit | RawMessageListBit[]
        }
    }
}

class Inbox {
    private rawData: RawInboxData;

    messages: Message[] = [];
    totalMessages: number;
    messageQuota: number;


    /**
     *
     * @param {RawInboxData} rawData
     */
    constructor(rawData: RawInboxData) {
        this.rawData = rawData;

        this.parseData();
        this.cleanup();
    };

    private parseData() {
        // TODO Only handling single folder at this time
        const that = this;
        if (this.rawData) {
            const rawData = this.rawData;
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
                    messageListBits.forEach((rawMessage) => {
                        const message = new Message();
                        message.id = parseInt(rawMessage.pm.pmid, 10);
                        // message.folderId
                        message.title = rawMessage.pm.title;
                        message.time = new Date(parseInt(rawMessage.pm.sendtime) * 1000);
                        message.status = rawMessage.pm.statusicon;
                        message.userId = parseInt(rawMessage.userbit.userinfo.userid, 10);
                        message.username = rawMessage.userbit.userinfo.username;
                        message.unread = !!parseInt(rawMessage.show.unread);

                        that.messages.push(message);
                    });
                }
            }
        }
    };

    private cleanup() {
        delete this.rawData;
    };

    /**
     * Get logged in user's Inbox and list of private Messages
     * @param vbApi -VBApi
     * @param options
     * @fulfill {Inbox}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async get(vbApi: VBApi, options?: CallMethodParameters): Promise<Inbox> {
        options = options || {};

        return new Promise(async function (resolve, reject) {
            try {
                let inbox = null;
                let response = await vbApi.callMethod({
                    method: 'private_messagelist',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    inbox = new Inbox(response.response);
                }

                if (inbox == null) {
                    reject();
                }
                resolve(inbox);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Attempts to submit a new Thread into a specified Forum. This will also be considered the first Post
     * @param vbApi - VBApi
     * @param date - Delete all messages from before the specified date
     * @param folderId - Folder Id, defaults to 0
     * @param options
     * @TODO note additional options
     * @fulfill {void}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async empty(vbApi: VBApi, date: Date, folderId: number = 0, options?: InboxEmptyOptions): Promise<void> {
        options = options || {};
        options.dateline = '' + parseInt((date.getTime() / 1000).toFixed(0)) || options.dateline || ''; //required
        options.folderid = '' + (folderId || options.folderid || '0');

        return new Promise(async function (resolve, reject) {
            try {
                let response = await vbApi.callMethod({
                    method: 'private_confirmemptyfolder',
                    params: options
                });
                let possibleError = VBApi.parseErrorMessage(response);
                if (possibleError !== 'pm_messagesdeleted') {
                    reject(possibleError || response);
                }

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
}