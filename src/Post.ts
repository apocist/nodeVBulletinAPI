import {VBApi, CallMethodParameters} from './VBApi';

export interface PostCreateOptions extends CallMethodParameters {
    threadid?: number,
    message?: string
    signature?: boolean | '0' | '1',
}

export interface PostEditOptions extends CallMethodParameters {
    postid?: number,
    message?: string
    signature?: boolean | '0' | '1',
    reason?: string,
}

export interface PostDeleteOptions extends CallMethodParameters {
    postid?: number,
    threadid?: number
    reason?: string,
}

export interface RawPostData {
    post: {
        postid: string,
        threadid: string,
        posttime: string,
        title: string,
        message: string,
        message_plain: string,
        message_bbcode: string,
        signature: string,
        userid: string,
        username: string
    }
}

export class Post {
    private readonly vbApi: VBApi;
    private rawData: RawPostData;

    id: number;
    threadId: number;
    postTime: number;
    title: string;
    message: string;
    messagePlain: string;
    messageBBCode: string;

    // TODO connect to Member
    userId: number;
    username: string;
    signature: string;

    constructor(vbApi: VBApi, rawData: RawPostData) {
        this.vbApi = vbApi;
        this.rawData = rawData;
        this.parseData();
        this.cleanup();
    };

    private parseData() {
        if (this.rawData) {
            const rawData = this.rawData;

            if (rawData.hasOwnProperty('post')) {
                let postData = rawData.post;
                if (postData.hasOwnProperty('postid')) {
                    this.id = parseInt(postData.postid, 10);
                }
                if (postData.hasOwnProperty('threadid')) {
                    this.threadId = parseInt(postData.threadid, 10);
                }
                if (postData.hasOwnProperty('posttime')) {
                    this.postTime = parseInt(postData.posttime, 10);
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
                    this.userId = parseInt(postData.userid, 10);
                }
                if (postData.hasOwnProperty('username')) {
                    this.username = postData.username;
                }
            }
        }
    }

    private cleanup() {
        delete this.rawData;
    }

    /**
     * Submit a new Post into a specified Thread
     * @param vbApi - VBApi
     * @param threadId - Thread id
     * @param message - Post Message
     * @param options
     * @param options.signature  - Optionally append your signature
     * @TODO note additional options
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async createPost(vbApi: VBApi, threadId: number, message: string, options?: PostCreateOptions) { // && add these options above
        options = options || {};
        options.threadid = threadId || options.threadid || 0; //required
        options.message = message || options.message || ''; //required
        options.signature = options.signature === true ? '1' : '0'; //System only handle 1 or 0. defaults to 0


        return new Promise(async function (resolve, reject) {
            try {
                const response = await vbApi.callMethod({
                    method: 'newreply_postreply',
                    params: options
                });
                const possibleError = VBApi.parseErrorMessage(response);
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
     * Edit an existing Post
     * @param vbApi - VBApi
     * @param postId - Post id
     * @param message - Post Message
     * @param options
     * @param options.reason - Reason for editing
     * @param options.signature - Optionally append your signature
     * @TODO note additional options
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async editPost(vbApi: VBApi, postId: number, message: string, options?: PostEditOptions) {
        options = options || {};
        options.postid = postId || options.postid || 0; //required
        options.message = message || options.message || ''; //required
        options.signature = options.signature === true ? '1' : '0'; //System only handle 1 or 0. defaults to 0

        return new Promise(async function (resolve, reject) {
            try {
                let response = await vbApi.callMethod({
                    method: 'editpost_updatepost',
                    params: options
                });
                let possibleError = VBApi.parseErrorMessage(response);
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
     * @TODO untested - does not seem to function yet
     * Delete an existing Post
     * @param vbApi - VBApi
     * @param postId - Post id
     * @param threadId - Thread id
     * @param options
     * @param options.reason - Reason for deleting
     * @param options.postid - Ignore, already required at postId
     * @param options.threadid - Ignore, already required at threadId
     * @TODO note additional options
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async deletePost(vbApi: VBApi, postId: number, threadId: number, options?: PostDeleteOptions) {
        options = options || {};
        options.postid = postId || options.postid || 0; //required
        options.threadid = threadId || options.threadid || 0; // TODO required????

        return new Promise(async function (resolve, reject) {
            try {
                let response = await vbApi.callMethod({
                    method: 'editpost_deletepost',
                    params: options
                });
                let possibleError = VBApi.parseErrorMessage(response);
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