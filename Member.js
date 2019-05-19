'use strict';

/**
 *
 * @type {Class}
 * @property {number} userId
 * @property {string} username
 * @property {string} profileUrl
 * @property {string} avatarUrl
 * @property {string} profilePicUrl
 * @property {Date} joinDate
 * @property {Date} lastActivityTime
 * @property {string} title
 * @property {string} signature
 * @property {number} posts
 * @property {string} birthday
 * @property {string} homepage
 * @property {string} displayEmail
 * @property {number} userNoteCount
 * @property {boolean} canBeFriend
 * @property {boolean} hasIMDetails
 * @property {boolean} onlineStatus
 */
class Member {
    /**
     *
     * @typedef {Object} RawMemberData
     * @property {Object} memberData
     * @property {string} memberData.userid
     * @property {string} memberData.username
     * @property {string} memberData.profileurl
     * @property {string} memberData.avatarurl
     * @property {string} memberData.profilepicurl
     * @property {string} memberData.joindate
     * @property {string} memberData.lastactivitytime
     * @property {string} memberData.usertitle
     * @property {string} memberData.signature
     * @property {string} memberData.posts
     * @property {string} memberData.birthday
     * @property {string} memberData.homepage
     * @property {string} memberData.displayemail
     * @property {string} memberData.usernotecount
     * @property {number} memberData.canbefriend
     * @property {number} memberData.hasimdetails
     * @property {object} memberData.onlinestatus
     */

    /**
     *
     * @param {RawMemberData} rawData
     */
    constructor(rawData) {
        this.rawData = rawData;
        this.__parseData();
        this.__cleanup();
    };

    __parseData() {
        let that = this;
        if (this.rawData) {
            let rawData = this.rawData;

            // TODO parse groups, visitor_messaging, stats, albums, aboutme, and friends

            if (rawData.hasOwnProperty('prepared')) {
                let memberData = rawData['prepared'];

                const numberItems = {
                    userId: 'userid',
                    joinDate: 'joindate', // converts to Date later
                    lastActivityTime: 'lastactivitytime', // converts to Date later
                    posts: 'posts',
                    age: 'age',
                    userNoteCount: 'usernotecount',
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
                    that.onlineStatus = bool;
                }

                if (that.hasOwnProperty('joinDate')) {
                    that['joinDate'] = new Date(that['joinDate'] * 1000);
                }
                if (that.hasOwnProperty('lastActivityTime')) {
                    that['lastActivityTime'] = new Date(that['lastActivityTime'] * 1000);
                }
            }
        }
    };

    __cleanup() {
        delete (this.rawData);
    };
}

module.exports = Member;