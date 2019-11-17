import {VBApi, CallMethodParameters} from './VBApi';
import {Thread, RawThreadData} from './Thread';

export interface ForumGetOptions extends CallMethodParameters {
    forumid?: number
}

export interface RawForumData {
    forumid: string,
    title: string,
    description: string,
    parentid: string,
    foruminfo: {
        forumid: string,
        title: string,
        description: string,
    }
    forumbits?: RawForumData[]
    subforums?: RawForumData[]
    threadbits: RawThreadData[]
}

class Forum {
    private rawData: RawForumData;
    id: number;
    title: string;
    description: string;
    parentId: number;
    threads: Thread[] = [];
    subForums: Forum[] = [];

    constructor(rawData) {
        this.rawData = rawData;
        this.parseData();
        this.cleanup();
    };

    private parseData() {
        if (this.rawData) {
            //TODO need to specify if its fully fetched
            let rawData = this.rawData;
            if (rawData.hasOwnProperty('forumid')) {
                this.id = parseInt(rawData.forumid, 10);
            }
            if (rawData.hasOwnProperty('title')) {
                this.title = rawData.title;
            }
            if (rawData.hasOwnProperty('description')) {
                this.description = rawData.description;
            }
            if (rawData.hasOwnProperty('parentid')) {
                this.parentId = parseInt(rawData.parentid, 10);
            }
            if (rawData.hasOwnProperty('foruminfo')) {
                let forumInfo = rawData.foruminfo;
                if (forumInfo.hasOwnProperty('forumid')) {
                    this.id = parseInt(forumInfo.forumid, 10);
                }
                if (forumInfo.hasOwnProperty('title')) {
                    this.title = forumInfo.title;
                }
                if (forumInfo.hasOwnProperty('description')) {
                    this.description = forumInfo.description;
                }
            }

            // Set Threads
            if (rawData.hasOwnProperty('threadbits')) {
                let threadBits = rawData.threadbits;
                threadBits.forEach((thread) => {
                    this.threads.push(new Thread(thread));
                });
            }

            // Set Sub Forums
            let forumBits: RawForumData[];
            if (rawData.hasOwnProperty('forumbits')) {
                forumBits = rawData.forumbits;
            } else if (rawData.hasOwnProperty('subforums')) {
                forumBits = rawData.subforums;
            }
            if (forumBits) {
                forumBits.forEach((subForum) => {
                    this.subForums.push(new Forum(subForum));
                });
            }
        }
    };

    private cleanup() {
        delete this.rawData;
    };

    /**
     * List every Forum and sub forum available to the user.
     * @param vbApi - VBApi
     * @fulfill {Forum[]}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async getHome(vbApi: VBApi): Promise<Forum[]> {
        return new Promise(async function (resolve, reject) {
            try {
                let forums: Forum[] = [];
                let response = await vbApi.callMethod(
                    {
                        method: 'api_forumlist'
                    });

                if (response) {
                    for (let forum in response) {
                        if (response.hasOwnProperty(forum)) {
                            forums.push(new Forum(response[forum]));
                        }
                    }
                }
                resolve(forums);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * List detailed info about a forum and it's sub-forums and threads
     * @param vbApi: VBApi
     * @param forumId - Forum id
     * @param options - Secondary Options
     * @TODO note additional options
     * @fulfill {Forum}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async get(vbApi: VBApi, forumId: number, options?: ForumGetOptions): Promise<Forum> {
        options = options || {};
        options.forumid = forumId || options.forumid || 0; //required

        return new Promise(async function (resolve, reject) {
            try {
                let forum = null;
                let response = await vbApi.callMethod({
                    method: 'forumdisplay',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    forum = new Forum(response.response);
                }
                if(forum == null) {
                    reject();
                }
                resolve(forum);
            } catch (e) {
                reject(e);
            }
        });
    }
}