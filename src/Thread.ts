import {VBApi, CallMethodParameters, CallMethodCookies} from './VBApi';
import {Post, RawPostData} from './Post';

export interface ThreadCreateOptions extends CallMethodParameters {
    signature?: boolean | '0' | '1',
    forumid?: number,
    subject?: string
    message?: string
}

export interface ThreadGetOptions extends CallMethodParameters {
    threadid?: number
}

export interface RawThreadData {
    thread: {
        forumid: string,
        forumtitle: string,
        threadid: string,
        title: string,
        threadtitle: string
    },
    postbits: RawPostData[]
}

export class Thread {
    private rawData: RawThreadData;
    forumId: number;
    forumTitle: string;
    id: number;
    title: string;
    posts: Post[] = [];

    constructor(rawData: RawThreadData) {
        this.rawData = rawData;
        this.parseData();
        this.cleanup();
    }

    private parseData() {
        if (this.rawData) {
            //TODO need to specify if its fully fetched
            const rawData = this.rawData;

            if (rawData.hasOwnProperty('thread')) {
                let threadData = rawData.thread;
                if (threadData.hasOwnProperty('forumid')) {
                    this.forumId = parseInt(threadData.forumid, 10);
                }
                if (threadData.hasOwnProperty('forumtitle')) {
                    this.forumTitle = threadData.forumtitle;
                }
                if (threadData.hasOwnProperty('threadid')) {
                    this.id = parseInt(threadData.threadid, 10);
                }
                if (threadData.hasOwnProperty('title')) {
                    this.title = threadData.title;
                } else if (threadData.hasOwnProperty('threadtitle')) {
                    this.title = threadData.threadtitle;
                }
            }

            if (rawData.hasOwnProperty('postbits')) {
                let postBits = rawData.postbits;
                postBits.forEach((postData) => {
                    this.posts.push(new Post(postData));
                });
            }
        }
    }

    private cleanup() {
        delete this.rawData;
    }

    /**
     * Submit a new Thread into a specified Forum. This will also be considered the first Post
     * @param vbApi - VBApi
     * @param forumId - Forum Id
     * @param subject - Post/Thread Subject
     * @param message - Post Message
     * @param options
     * @param options.signature - Optionally append your signature (currently not functional)
     * @TODO note additional options
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async create(vbApi: VBApi, forumId: number, subject: string, message: string, options?: ThreadCreateOptions) {
        options = options || {};
        options.forumid = forumId || options.forumid || 0; //required
        options.subject = subject || options.subject || ''; //required
        options.message = message || options.message || ''; //required
        options.signature = options.signature === true ? '1' : '0'; // FIXME This didn't seem to work

        return new Promise(async function (resolve, reject) {
            try {
                let response = await vbApi.callMethod({
                    method: 'newthread_postthread',
                    params: options
                });
                let possibleError = VBApi.parseErrorMessage(response);
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
     * @param vbApi - VBApi
     * @param threadId - Thread id
     * @param options - Secondary Options
     * @TODO note additional options
     * @fulfill {Thread}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async get(vbApi: VBApi, threadId: number, options?: ThreadGetOptions): Promise<Thread> {
        options = options || {};
        options.threadid = threadId || options.threadid || 0; //required

        return new Promise(async function (resolve, reject) {
            let thread = null;
            try {
                let response = await vbApi.callMethod({
                    method: 'showthread',
                    params: options
                });
                // TODO parse errors
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    thread = new Thread(response.response);
                }

                if (thread == null) {
                    reject();
                }
                resolve(thread);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Close a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param vbApi - VBApi
     * @param threadId - Id of Thread to close (TODO list of thread ids)
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async close(vbApi: VBApi, threadId: number) {
        let cookies: CallMethodCookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await vbApi.callMethod({
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
     * @param vbApi - VBApi
     * @param threadId - Id of Thread to open (TODO list of thread ids)
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async open(vbApi: VBApi, threadId: number) {
        let cookies: CallMethodCookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await vbApi.callMethod({
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
     * @param vbApi - VBApi
     * @param threadId - Id of Thread to close (TODO list of thread ids)
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async delete(vbApi: VBApi, threadId: number) {
        let cookies: CallMethodCookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await vbApi.callMethod({
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