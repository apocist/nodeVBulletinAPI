import {VBApi, FetchableObject, CallMethodParameters} from './VBApi';
import {Member} from './Member';

export interface MessageGetOptions extends CallMethodParameters {
    pmid?: number
}

export interface MessageCreateOptions extends CallMethodParameters {
    signature?: boolean | '0' | '1'
    recipients?: string
    title?: string
    message?: string
}

export interface RawMessageData {
    HTML: {
        bccrecipients: any[],
        ccrecipients: any[],
        pm: {
            pmid: string,
            title: string,
            recipients: string, //'UserHere ; ' possibly delimited by ;
            savecopy: string, // 0 (noting as string just to be able to parseInt)
            folderid: string, // '0'
            fromusername: string
        },
        postbit: {
            show: any, // object
            post: {
                statusicon: 'new' | 'old' | 'replied',
                posttime: string,
                checkbox_value: string, //(noting as string just to be able to parseInt)
                onlinestatusphrase: string, //'x_is_online_now'
                userid: string, //(noting as string just to be able to parseInt)
                username: string,
                avatarurl: string,  //'customavatars/avatar0000_14.gif'
                onlinestatus: {
                    onlinestatus: string // 0 (noting as string just to be able to parseInt)
                },
                usertitle: string,
                joindate: string,
                title: string, //Message title
                message: string,
                message_plain: string,
                message_bbcode: string,
                signature: string,
            }
        }
    }
}

export class Message extends FetchableObject {
    protected rawData: RawMessageData;

    fetched: boolean = false;
    unread: boolean = false;

    id: number;
    folderId: number;
    recipients: string;
    title: string;
    message: string;
    messagePlain: string;
    messageBBCode: string;
    status: string;
    time: Date;

    userId: number;
    username: string;
    user: Member;

    constructor(vbApi: VBApi, rawData?: RawMessageData) {
        super(vbApi, rawData);
    };

    protected parseData() {
        if (this.rawData
            && this.rawData.hasOwnProperty('HTML')
            && this.rawData.HTML.hasOwnProperty('pm')
            && this.rawData.HTML.hasOwnProperty('postbit')
            && this.rawData.HTML.postbit.hasOwnProperty('post')
        ) {
            const pm = this.rawData.HTML.pm;
            const post = this.rawData.HTML.postbit.post;

            this.id = parseInt(pm.pmid, 10); // number
            this.folderId = parseInt(pm.folderid, 10);
            this.recipients = pm.recipients; // FIXME need to parse this
            this.title = post.title || pm.title;
            this.message = post.message;
            this.messagePlain = post.message_plain;
            this.messageBBCode = post.message_bbcode;
            this.status = post.statusicon;
            this.time = new Date(parseInt(post.posttime, 10) * 1000);


            this.userId = parseInt(post.userid, 10);
            this.username = pm.fromusername;

            // Sending Member
            const member = new Member(this.vbApi);
            member.id = parseInt(post.userid, 10);
            member.username = post.username;
            member.avatarUrl = post.avatarurl;
            member.title = post.usertitle;
            member.signature = post.signature;
            member.joinDate = new Date(parseInt(post.joindate, 10) * 1000);
            member.online = !!parseInt(post.onlinestatus.onlinestatus, 10);
            this.user = member;
        }
        super.parseData();
    };

    /**
     * Get the full details of this Message
     * @fulfill {this}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     * @throws {'Not Found'} If Message cannot be retrieved
     */

    async get(): Promise<this> {
        let messageData: RawMessageData;
        try {
            let response = await this.vbApi.callMethod({
                method: 'private_showpm',
                params: {
                    pmid: this.id
                }
            });
            if (
                response
                && response.hasOwnProperty('response')
            ) {
                messageData = response.response;
            }


        } catch (e) {
            throw(e);
        }

        if (messageData == null) {
            throw 'Not Found' // FIXME make errors
        }
        this.rawData = messageData;
        this.parseData();
        this.cleanup();
        return this;
    }

    /**
     * Get details of a specific Message for the logged in user
     * @param vbApi - VBApi
     * @param id - MessageId
     * @param options
     * @fulfill {Message}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     * @throws {'Not Found'} If Message cannot be retrieved
     */
    static async getMessage(vbApi: VBApi, id: number, options?: MessageGetOptions): Promise<Message> {
        options = options || {};
        options.pmid = id || options.pmid || 0; //required

        let message = null;
        try {
            let response = await vbApi.callMethod({
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
            throw(e);
        }

        if (message == null) {
            throw 'Not Found' // FIXME make errors
        }
        return message;
    }

    /**
     * Send a new Message to a Member
     * @param vbApi - VBApi
     * @param username - Username to send the message to
     * @param title - Message Subject
     * @param message - Message content
     * @param options
     * @param options.signature - Optionally append your signature
     * @TODO note additional options
     * @fulfill {void}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async create(vbApi: VBApi, username: string, title: string, message: string, options?: MessageCreateOptions) {
        options = options || {};
        options.recipients = username || options.recipients || ''; //required
        options.title = title || options.title || ''; //required
        options.message = message || options.message || ''; //required
        options.signature = options.signature === true ? '1' : '0';

        let possibleError;
        let response;
        try {
            response = await vbApi.callMethod({
                method: 'private_insertpm',
                params: options
            });
            possibleError = VBApi.parseErrorMessage(response);
        } catch (e) {
            throw(e);
        }

        if (possibleError !== 'pm_messagesent') {
            throw(possibleError || response);
        }
        return; // TODO: provide a better response
    }
}