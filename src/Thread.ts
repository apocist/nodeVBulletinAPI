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
    private readonly vbApi: VBApi;
    private rawData: RawThreadData;

    fetched: boolean = false;
    fetchTime: Date;

    id: number;
    title: string;
    forumId: number;
    forumTitle: string;
    posts: Post[] = [];

    constructor(vbApi: VBApi, rawData: RawThreadData) {
        this.vbApi = vbApi;
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
                    this.posts.push(new Post(this.vbApi, postData));
                });
            }

            this.fetched = true;
            this.fetchTime = new Date();
        }
    }

    private cleanup() {
        delete this.rawData;
    }

    /**
     * List detailed information about the current Thread and it's Posts
     * @param vbApi - VBApi
     * @param threadId - Thread id
     * @param options - Secondary Options
     * @TODO note additional options
     * @fulfill {this}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async get(vbApi: VBApi, threadId: number, options?: ThreadGetOptions): Promise<this> {
        let threadData = null;
        try {
            threadData = await Thread.getRawThreadData(vbApi, threadId, options);
        } catch (e) {
            throw(e);
        }

        if (threadData == null) {
            throw('Not Found');
        }
        this.rawData = threadData;
        this.parseData();
        this.cleanup();
        return this;
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
    static async createThread(vbApi: VBApi, forumId: number, subject: string, message: string, options?: ThreadCreateOptions) {
        options = options || {};
        options.forumid = forumId || options.forumid || 0; //required
        options.subject = subject || options.subject || ''; //required
        options.message = message || options.message || ''; //required
        options.signature = options.signature === true ? '1' : '0'; // FIXME This didn't seem to work

        let response;
        let possibleError;
        try {
            response = await vbApi.callMethod({
                method: 'newthread_postthread',
                params: options
            });
            possibleError = VBApi.parseErrorMessage(response);
            //success is errormessgae 'redirect_postthanks'
            //reports threadid and postid

        } catch (e) {
            throw(e);
        }

        if (
            possibleError === 'redirect_postthanks'
            && response.hasOwnProperty('show')
        ) {
            return response.show;
        } else {
            throw possibleError || response;
        }
    }

    /**
     * List detailed information about a Thread and it's Posts
     * @param vbApi - VBApi
     * @param threadId - Thread id
     * @param options - Secondary Options
     * @TODO note additional options
     * @fulfill {RawThreadData}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async getRawThreadData(vbApi: VBApi, threadId: number, options?: ThreadGetOptions): Promise<RawThreadData> {
        options = options || {};
        options.threadid = threadId || options.threadid || 0; //required

        let threadData = null;
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
                threadData = response.response;
            }
        } catch (e) {
            throw(e);
        }

        return threadData;
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
    static async getThread(vbApi: VBApi, threadId: number, options?: ThreadGetOptions): Promise<Thread> {
        let threadData = null;
        try {
            threadData = await Thread.getRawThreadData(vbApi, threadId, options);
        } catch (e) {
            throw(e);
        }

        if (threadData == null) {
            throw('Not Found');
        }
        return new Thread(vbApi, threadData);
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Close a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param vbApi - VBApi
     * @param threadId - Id of Thread to close (TODO list of thread ids)
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async closeThread(vbApi: VBApi, threadId: number) {
        let cookies: CallMethodCookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }

        let response;
        try {
            response = await vbApi.callMethod({
                method: 'inlinemod_close',
                cookies: cookies || {}
            });
            //let possibleError = that.constructor.parseErrorMessage(response);
            //unknown responses
            /*if (
                possibleError === 'redirect_postthanks'
                && response.hasOwnProperty('show')
            ) {*/

            /*} else {
                reject(possibleError || response);
            }*/
        } catch (e) {
            throw(e);
        }

        return response;
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Attempts to open a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param vbApi - VBApi
     * @param threadId - Id of Thread to open (TODO list of thread ids)
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async openThread(vbApi: VBApi, threadId: number) {
        let cookies: CallMethodCookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }

        let response;
        try {
            response = await vbApi.callMethod({
                method: 'inlinemod_open',
                cookies: cookies || {}
            });
            //let possibleError = that.constructor.parseErrorMessage(response);
            //unknown responses
            /*if (
                possibleError === 'redirect_postthanks'
                && response.hasOwnProperty('show')
            ) {*/

            /*} else {
                reject(possibleError || response);
            }*/
        } catch (e) {
            throw(e);
        }

        return response;
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Attempts to delete a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param vbApi - VBApi
     * @param threadId - Id of Thread to close (TODO list of thread ids)
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async deleteThread(vbApi: VBApi, threadId: number) {
        let cookies: CallMethodCookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }

        let response;
        try {
            response = await vbApi.callMethod({
                method: 'inlinemod_dodeletethreads',
                cookies: cookies || {}
            });
            //let possibleError = that.constructor.parseErrorMessage(response);
            //unknown responses
            /*if (
                possibleError === 'redirect_postthanks'
                && response.hasOwnProperty('show')
            ) {*/

            /*} else {
                reject(possibleError || response);
            }*/
        } catch (e) {
            throw(e);
        }

        return response;
    }

}