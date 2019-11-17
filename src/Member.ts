import {VBApi, CallMethodParameters} from './VBApi';

export interface MemberGetOptions extends CallMethodParameters {
    unsername?: string
}

export interface RawMemberData {
    prepared: {
        userid: string,
        username: string,
        profileurl: string,
        avatarurl: string,
        profilepicurl: string,
        joindate: string,
        lastactivitytime: string,
        usertitle: string,
        signature: string,
        posts: string,
        birthday: string,
        homepage: string,
        displayemail: string,
        usernotecount: string,
        canbefriend: 0 | 1,
        hasimdetails: 0 | 1,
        onlinestatus: {
            onlinestatus: string | number
        }
    }
}

class Member {
    private rawData: RawMemberData;

    id: number;
    username: string;
    profileUrl: string;
    avatarUrl: string;
    profilePicUrl: string;
    joinDate: Date;
    joinDateUnix: number;
    lastActivityTime: Date;
    lastActivityTimeUnix: number;
    title: string;
    signature: string;
    posts: number;
    birthday: string;
    homepage: string;
    displayEmail: string;
    noteCount: number;
    canBeFriend: boolean;
    hasIMDetails: boolean;
    online: boolean;

    constructor(rawData: RawMemberData) {
        this.rawData = rawData;
        this.parseData();
        this.cleanup();
    };

    private parseData() {
        let that = this;
        if (this.rawData) {
            const rawData = this.rawData;

            // TODO parse groups, visitor_messaging, stats, albums, aboutme, and friends

            if (rawData.hasOwnProperty('prepared')) {
                let memberData = rawData.prepared;

                const numberItems = {
                    id: 'userid',
                    joinDateUnix: 'joindate', // converts to Date later
                    lastActivityTimeUnix: 'lastactivitytime', // converts to Date later
                    posts: 'posts',
                    age: 'age',
                    noteCount: 'usernotecount',
                };

                const stringItems = {
                    username: 'username',
                    title: 'usertitle',
                    avatarUrl: 'avatarurl',
                    profilePicUrl: 'profilepicurl',
                    profileUrl: 'profileurl',
                    signature: 'signature',
                    birthday: 'birthday',
                    displayEmail: 'displayemail',
                    homepage: 'homepage',
                };

                const booleanItems = {
                    hasIMDetails: 'hasimdetails',
                    canBeFriend: 'canbefriend',
                };

                Object.keys(numberItems).forEach(function (key) {
                    if (memberData.hasOwnProperty(numberItems[key])) {
                        that[key] = parseInt(memberData[numberItems[key]]);
                    }
                });

                Object.keys(stringItems).forEach(function (key) {
                    if (memberData.hasOwnProperty(stringItems[key])) {
                        that[key] = memberData[stringItems[key]];
                    }
                });

                Object.keys(booleanItems).forEach(function (key) {
                    if (memberData.hasOwnProperty(booleanItems[key])) {
                        let bool = false;
                        if (
                            memberData[booleanItems[key]] === '1'
                            || memberData[booleanItems[key]] === 1
                        ) {
                            bool = true;
                        }
                        that[key] = bool;
                    }
                });

                if (memberData.hasOwnProperty('onlinestatus')) {
                    let bool = false;
                    if (
                        typeof memberData.onlinestatus === 'object'
                        && memberData.onlinestatus.hasOwnProperty('onlinestatus')
                        && (
                            memberData.onlinestatus.onlinestatus === '1'
                            || memberData.onlinestatus.onlinestatus === 1
                        )
                    ) {
                        bool = true;
                    }
                    that.online = bool;
                }

                if (that.hasOwnProperty('joinDateUnix')) {
                    that.joinDate = new Date(that.joinDateUnix  * 1000);
                }
                if (that.hasOwnProperty('lastActivityTimeUnix')) {
                    that.lastActivityTime = new Date(that.lastActivityTimeUnix * 1000);
                }
            }
        }
    };

    private cleanup() {
        delete this.rawData;
    };

    /**
     * Retrieve data about a specific user found by username
     * @param vbApi - VBApi
     * @param username - Username
     * @param options - Secondary Options
     * @fulfill {Member}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    static async get(vbApi: VBApi, username: string, options?: MemberGetOptions): Promise<Member> {
        options = options || {};
        options.username = username || options.username || ''; //required

        return new Promise(async function (resolve, reject) {
            let thread = null;
            try {
                let response = await vbApi.callMethod({
                    method: 'member',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    thread = new Member(response.response);
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
}