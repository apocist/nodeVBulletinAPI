import * as _ from 'lodash'
import {FetchableObject} from './FetchableObject';
import {Message} from './Message';
import {CallMethodParameters, VBApi} from './VBApi';

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
        receipts: unknown, // object
        sortfilter: unknown, // object
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

class Inbox extends FetchableObject {
    protected rawData: RawInboxData;

    public folderId: number;
    public messages: Message[] = [];
    public totalMessages: number;
    public messageQuota: number;

    constructor(vbApi: VBApi, rawData?: RawInboxData) {
        super(vbApi, rawData);
    };

    protected parseData() {
        // TODO Only handling single folder at this time
        const that = this;
        if (this.rawData) {
            const rawData = this.rawData;
            that.messages = [];
            if (rawData.hasOwnProperty('HTML')) {
                that.folderId = parseInt(rawData.HTML.folderid, 10);
                that.totalMessages = parseInt(rawData.HTML.pmtotal, 10);
                that.messageQuota = parseInt(rawData.HTML.pmquota, 10);
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
                        const message = new Message(this.vbApi);
                        message.id = parseInt(rawMessage.pm.pmid, 10);
                        // message.folderId
                        message.title = rawMessage.pm.title;
                        message.time = new Date(parseInt(rawMessage.pm.sendtime, 10) * 1000);
                        message.status = rawMessage.pm.statusicon;
                        message.userId = parseInt(rawMessage.userbit.userinfo.userid, 10);
                        message.username = rawMessage.userbit.userinfo.username;
                        message.unread = !!parseInt(rawMessage.show.unread, 10);

                        that.messages.push(message);
                    });
                }
            }
        }
        super.parseData();
    };

    /**
     * Reload this Inbox data
     * Will remove any messages currently loaded
     * @TODO only handle the first folder
     * @fulfill {Inbox}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    public async get(): Promise<this> {
        let inboxData: RawInboxData;
        try {
            inboxData = await Inbox.getRawInboxData(this.vbApi)
        } catch (e) {
            throw(e);
        }

        if (inboxData == null) {
            throw new Error('Not Found');
        }
        this.rawData = inboxData;
        this.parseData();
        this.cleanup();
        return this;
    }

    /**
     * Attempts to submit a new Thread into a specified Forum. This will also be considered the first Post
     * @TODO note additional options
     * @fulfill {void}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    public async empty(date: Date = new Date()): Promise<void> {
        return Inbox.emptyInbox(this.vbApi, date, this.folderId);
    }

    /**
     * Get logged in user's Inbox and list of private Messages
     * @param vbApi -VBApi
     * @param options
     * @fulfill {RawInboxData}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    public static async getRawInboxData(vbApi: VBApi, options?: CallMethodParameters): Promise<RawInboxData> {
        options = options || {};

        let inboxData: RawInboxData;
        let response;
        try {
            response = await vbApi.callMethod({
                method: 'private_messagelist',
                params: options
            });
            if (
                response
                && response.hasOwnProperty('response')
            ) {
                inboxData = response.response;
            }
        } catch (e) {
            throw(e);
        }

        return inboxData;
    }

    /**
     * Get logged in user's Inbox and list of private Messages
     * @param vbApi -VBApi
     * @param options
     * @fulfill {Inbox}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    public static async getInbox(vbApi: VBApi, options?: CallMethodParameters): Promise<Inbox> {
        options = options || {};

        let inboxData: RawInboxData;
        try {
            inboxData = await Inbox.getRawInboxData(vbApi, options)
        } catch (e) {
            throw(e);
        }

        if (inboxData == null) {
            throw new Error('Not Found');
        }
        return new Inbox(vbApi, inboxData);
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
    public static async emptyInbox(
        vbApi: VBApi, date: Date = new Date(), folderId: number = 0, options?: InboxEmptyOptions
    ): Promise<void> {
        options = options || {};
        options.dateline = '' + parseInt((date.getTime() / 1000).toFixed(0), 10) || options.dateline || ''; // required
        options.folderid = '' + (folderId || options.folderid || '0');

        let response;
        let possibleError;

        try {
            response = await vbApi.callMethod({
                method: 'private_confirmemptyfolder',
                params: options
            });
        } catch (e) {
            throw(e);
        }

        possibleError = VBApi.parseErrorMessage(response);
        if (possibleError !== 'pm_messagesdeleted') {
            throw(possibleError || response);
        }
        return;
    }
}
