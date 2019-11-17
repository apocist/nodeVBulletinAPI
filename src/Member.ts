import {FetchableObject} from './FetchableObject';
import {CallMethodParameters, VBApi} from './VBApi';

export interface MemberGetOptions extends CallMethodParameters {
    username?: string
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

export class Member extends FetchableObject {
    protected rawData: RawMemberData;

    // Info available before full fetch
    public id: number;
    public username: string;
    public avatarUrl: string;
    public title: string;
    public signature: string;
    public joinDate: Date;
    public online: boolean;

    public profileUrl: string;
    public profilePicUrl: string;
    public joinDateUnix: number;
    public lastActivityTime: Date;
    public lastActivityTimeUnix: number;
    public posts: number;
    public birthday: string;
    public homepage: string;
    public displayEmail: string;
    public noteCount: number;
    public canBeFriend: boolean;
    public hasIMDetails: boolean;

    constructor(vbApi: VBApi, rawData?: RawMemberData) {
        super(vbApi, rawData);
    };

    protected parseData() {
        const that = this;
        if (this.rawData) {
            const rawData = this.rawData;

            // TODO parse groups, visitor_messaging, stats, albums, aboutme, and friends

            if (rawData.hasOwnProperty('prepared')) {
                const memberData = rawData.prepared;

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

                Object.keys(numberItems).forEach((key) => {
                    if (memberData.hasOwnProperty(numberItems[key])) {
                        that[key] = parseInt(memberData[numberItems[key]], 10);
                    }
                });

                Object.keys(stringItems).forEach((key) => {
                    if (memberData.hasOwnProperty(stringItems[key])) {
                        that[key] = memberData[stringItems[key]];
                    }
                });

                Object.keys(booleanItems).forEach((key) => {
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
                    that.joinDate = new Date(that.joinDateUnix * 1000);
                }
                if (that.hasOwnProperty('lastActivityTimeUnix')) {
                    that.lastActivityTime = new Date(that.lastActivityTimeUnix * 1000);
                }
            }
        }
        super.parseData();
    };

    /**
     * Retrieve full data about this Member (or refresh it's data)
     * Useful if the Member was first generated from existing data and not  retrieved originally
     * @fulfill {this}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     * @throws {'Not Found'} If Member cannot be retrieved
     */
    public async get(): Promise<this> {
        let memberData: RawMemberData;
        try {

            const response = await this.vbApi.callMethod({
                method: 'member',
                params: {
                    username: this.username
                }
            });
            if (
                response
                && response.hasOwnProperty('response')
            ) {
                memberData = response.response;
            }
        } catch (e) {
            throw(e);
        }

        if (memberData == null) {
            throw new Error('Not Found') // FIXME make errors
        }
        this.rawData = memberData;
        this.parseData();
        this.cleanup();
        return this;
    }

    /**
     * Retrieve data about a specific user found by username
     * @param vbApi - VBApi
     * @param username - Username
     * @param options - Secondary Options
     * @fulfill {Member}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     * @throws {'Not Found'} If Member cannot be retrieved
     */
    public static async getMember(vbApi: VBApi, username: string, options?: MemberGetOptions): Promise<Member> {
        options = options || {};
        options.username = username || options.username || ''; // required

        let member = null;
        try {
            const response = await vbApi.callMethod({
                method: 'member',
                params: options
            });
            if (
                response
                && response.hasOwnProperty('response')
            ) {
                member = new Member(response.response);
            }
        } catch (e) {
            throw(e);
        }
        if (member == null) {
            throw new Error('Not Found') // FIXME make errors
        }
        return member
    }
}
