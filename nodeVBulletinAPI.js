'use strict';
const md5 = require('js-md5'),
    request = require('request'),
    url = require('url'),
    uuidV1 = require('uuid/v1'),
    _ = require('underscore'),
    Forum = require('./Forum'),
    Inbox = require('./Inbox'),
    Member = require('./Member'),
    Message = require('./Message'),
    Post = require('./Post'),
    Thread = require('./Thread'),
    {version} = require('./package.json');

/**
 *
 */
class VBApi {
    /**
     * Initialize a vb api connection .This needs to be called for the first time
     * @param {string} apiUrl
     * @param {string} apiKey
     * @param {string} platformName
     * @param {string} platformVersion
     */
    constructor(apiUrl, apiKey, platformName, platformVersion) {
        /**
         * The current status of the API connection to vBulletin server
         * @type {boolean}
         */
        this.initialized = false;
        let urlParts = url.parse(apiUrl);
        /**
         * @type {{baseUrl: string, apiUrl: (*|string), apiKey: (*|string), clientName: string, platformVersion: string, clientVersion, platformName: string, uniqueId: *}}
         * @private
         */
        this.__connectionVars = {
            baseUrl: `${urlParts.protocol}//${urlParts.hostname}/`,
            apiUrl: apiUrl || '',
            apiKey: apiKey,
            clientName: 'nodeVBulletinAPI',
            clientVersion: version,
            platformName: platformName || '',
            platformVersion: platformVersion || '',
            uniqueId: md5('nodeVBulletinAPI' + version + platformName + platformVersion + uuidV1()),
        };

        /**
         * @type {{apiVersion: string, apiAccessToken: string, sessionHash: string, apiClientId: string, secret: string, error: null||string}}
         * @private
         */
        this.__clientSessionVars = {
            apiVersion: '',
            apiAccessToken: '',
            sessionHash: '',
            apiClientId: '',
            secret: '',
            error: null
        };

        /**
         * @typedef UserVars
         * @property {string} dbsessionhash
         * @property {number} userid
         * @property {string} username
         * @property {boolean} loggedIn
         * @type {UserVars}
         */
        this.userSessionVars = {
            dbsessionhash: '',
            username: '',
            userid: 0,
            loggedIn: false
        };

        /** @private */
        this.__waitingForInitializationCallback = function () {
        }; // A blank callback to be filled in

        if (
            this.__connectionVars.apiKey !== ''
            && this.__connectionVars.apiUrl !== ''
            && this.__connectionVars.platformName !== ''
            && this.__connectionVars.platformVersion !== ''
        ) {
            this.__initialize();
        } else {
            this.__clientSessionVars.error = 'apiInit(): Initialization requires a `apiUrl`, `apiKey`, `platformName`, and `platformVersion`';
            this.__waitingForInitializationCallback(false);
        }
    }

    /**
     * Initialize a vb api connection. This needs to be called for the first time
     * @private
     */
    __initialize() {
        let that = this;
        // Run itself as a self invoked promise that is awaited by nothing. callMethod shall wait until this is finished
        (async function __initialize_self() {
            let error = null;
            let result = null;

            try {
                /**
                 *
                 * @type {{}}
                 * @property {string} apiversion
                 * @property {string} apiaccesstoken
                 * @property {string} sessionhash
                 * @property {string} apiclientid
                 * @property {string} secret
                 */
                let response = await that.callMethod({
                    method: 'api_init',
                    params: {
                        clientname: that.__connectionVars.clientName,
                        clientversion: that.__connectionVars.clientVersion,
                        platformname: that.__connectionVars.platformName,
                        platformversion: that.__connectionVars.platformVersion,
                        uniqueid: that.__connectionVars.uniqueId
                    }
                });

                if (
                    response.apiversion
                    && response.apiaccesstoken
                    && response.sessionhash
                    && response.apiclientid
                    && response.secret
                ) {
                    that.__clientSessionVars = {
                        apiVersion: response.apiversion,
                        apiAccessToken: response.apiaccesstoken,
                        sessionHash: response.sessionhash,
                        apiClientId: response.apiclientid,
                        secret: response.secret,
                        error: null
                    };
                    that.initialized = true;

                    that.__waitingForInitializationCallback(true);
                    result = that;
                }

                if (result === null) {
                    that.__clientSessionVars.error = that.constructor.parseErrorMessage(response) || 'TODO ERROR (api connection did not return a session)';
                    that.__waitingForInitializationCallback(false);
                    error = that.__clientSessionVars.error;
                }
            } catch (e) {
                that.__clientSessionVars.error = e;
                that.__waitingForInitializationCallback(false);
                // reject(e);
                error = e;
            }
            return error || result;
        }());
    }

    /**
     * Will return after #initialize() is complete. Otherwise may reject() after 15 second timeout
     * @param {number=5} waitTime
     * @returns {Promise<void>}
     * @fulfill {void}
     * @reject {string} - Error Reason
     */
    async waitForInitialization(waitTime) {
        let that = this;
        waitTime = waitTime || 5;
        return new Promise(async function (resolve, reject) {
            if (that.initialized) {
                resolve();
            } else if (that.__clientSessionVars.error !== null) {
                reject(that.__clientSessionVars.error);
            } else {
                /**
                 * @type {number}
                 * @private
                 */
                that.__waitingForInitializationTimeout = setTimeout(
                    function () {
                        that.__waitingForInitializationCallback = function () {
                        }; // Set back to a blank function
                        if (that.initialized) {
                            resolve();
                        } else {
                            reject('Connection could not be achieved due to timed out', that.__clientSessionVars.error);
                        }

                    },
                    waitTime * 1000 // x second timeout
                );
                /**
                 * @param {boolean=true} success
                 * @private
                 */
                that.__waitingForInitializationCallback = function (success) {
                    if (that.__waitingForInitializationTimeout) {
                        clearTimeout(that.__waitingForInitializationTimeout);
                    }
                    if (success === false) {
                        reject(that.__clientSessionVars.error);
                    } else {
                        resolve();
                    }
                };
            }
        })
    }

    /**
     *
     * @param {object} options
     * @param {string} options.method - Required action to take
     * @param {object<string,string>} [options.params={}] - Optional parameter variables
     * @param {?object<string,string>} [options.cookies] - Optional cookie variables
     * @returns {Promise<{}>}
     * @fulfill {{}}
     * @reject {string} - Error Reason
     */
    async callMethod(options) {
        let that = this;
        let sign = true;
        options = options || {};
        options.params = options.params || {};
        return new Promise(async function (resolve, reject) {
            try {
                if (!options.method) {
                    reject('callMethod(): requires a supplied method');
                    return;
                }

                // Sign all calls except for api_init
                if (options.method === 'api_init') {
                    sign = false;
                }

                // await a valid session before continuing (skipping waiting on __initialize())
                if (sign === true) {
                    await that.waitForInitialization();
                }

                // Gather our sessions variables together
                let reqParams = {
                    api_m: options.method,
                    api_c: that.__clientSessionVars.apiClientId, //clientId
                    api_s: that.__clientSessionVars.apiAccessToken, //apiAccessToken (may be empty)
                    api_v: that.__clientSessionVars.apiVersion //api version
                };
                _.extend(reqParams, options.params); // Combine the arrays

                if (sign === true) {
                    // Generate a signature to validate that we are authenticated
                    if (that.initialized) {
                        reqParams.api_sig = md5(that.__clientSessionVars.apiAccessToken + that.__clientSessionVars.apiClientId + that.__clientSessionVars.secret + that.__connectionVars.apiKey);
                    } else {
                        reject('callMethod(): requires initialization. Not initialized');
                        return;
                    }
                }

                // Create a valid http Request
                let reqOptions = {
                    url: that.__connectionVars.apiUrl,
                    formData: reqParams,
                    headers: {
                        'User-Agent': that.__connectionVars.clientName
                    }
                };

                // Some command require adding a cookie, we'll do that here
                if (options.cookies) {
                    let j = request.jar();
                    for (let variable in options.cookies) {
                        if (options.cookies.hasOwnProperty(variable)) {
                            let cookieString = variable + '=' + options.cookies[variable];
                            let cookie = request.cookie(cookieString);
                            j.setCookie(cookie, that.__connectionVars.baseUrl);
                        }
                    }
                    reqOptions.jar = j;// Adds cookies to the request
                }

                request.post(
                    reqOptions,
                    function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            resolve(JSON.parse(body));
                        } else {
                            //console.log('No response');
                            reject('callMethod(): no response.');
                        }
                    }
                );
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Attempts to log in a user.
     * @param {string} username - Username
     * @param {string} password - clear text password
     * @param {object=} options
     * @param {string=} options.username - Ignore, already required at username
     * @param {string=} options.password - Ignore, already required at password
     * @returns {Promise<UserVars>}
     * @fulfill {UserVars}
     * @reject {string} - Error Reason. Expects:
     */
    async login(username, password, options) {
        options = options || {};
        options.username = username || options.username || '';
        options.password = md5(password || options.password || '');
        return await this.loginMD5('', '', options);
    }

    /**
     *
     * Attempts to log in a user. Requires the password to be pre md5 hashed.
     * @param {string} username - Username
     * @param {string} password - MD5 hashed password
     * @param {object=} options
     * @param {string=} options.username - Ignore, already required at username
     * @param {string=} options.password - Ignore, already required at password
     * @returns {Promise<UserVars>}
     * @fulfill {UserVars}
     * @reject {string} - Error Reason. Expects:
     */
    async loginMD5(username, password, options) {
        let that = this;
        options = options || {};
        options.username = username || options.username || {};
        options.password = password || options.password || {};
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod(
                    {
                        method: 'login_login',
                        params: {
                            vb_login_username: options.username || '',
                            vb_login_md5password: options.password || ''
                        }
                    }
                );
                /**
                 redirect_login - (NOT A ERROR) Login successful
                 badlogin - Username or Password incorrect. Login failed.
                 badlogin_strikes - Username or Password incorrect. Login failed. You have used {X} out of 5 login attempts. After all 5 have been used, you will be unable to login for 15 minutes.
                 */
                let error = that.constructor.parseErrorMessage(response);
                if (response.session) {
                    that.userSessionVars = response.session;
                    if (error === 'redirect_login') {
                        that.userSessionVars.username = options.username;
                        that.userSessionVars.loggedIn = true;
                    }
                }
                if (error === 'redirect_login') {
                    resolve(that.userSessionVars);
                } else {
                    reject(error);
                }

            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Attempts to log the user out.
     * @returns {Promise<boolean>} - Returns true on success, otherwise error code is rejected
     * @fulfill {boolean}
     * @reject {string} - Error Reason
     */
    async logout() {
        let that = this;
        return new Promise(async function (resolve, reject) {
            let error;
            try {
                let response = await that.callMethod({
                    method: 'login_logout'
                });
                error = that.constructor.parseErrorMessage(response);
                if (response.session) {
                    that.userSessionVars = response.session;
                    if (error === 'cookieclear') {
                        that.userSessionVars.username = '';
                        that.userSessionVars.loggedIn = false;
                    }
                }
                if (error === 'cookieclear') {
                    error = null;
                }
            } catch (e) {
                reject(e);
            }

            if (error) {
                reject(error);
            } else {
                resolve(true)
            }
        });
    }

    /**
     *
     * @param {object} response - Response object from callMethod()
     * @returns {string || null} status - Error message
     */
    static parseErrorMessage(response) {
        let retur = '';
        if (
            response.hasOwnProperty('response')
            && response.response.hasOwnProperty('errormessage')
        ) {
            if (_.isArray(response.response.errormessage)) {
                retur = response.response.errormessage[0]
            } else {
                retur = response.response.errormessage;
            }
        }
        return retur;
    }

    /**
     * List every Forum and sub forum available to the user.
     * @returns {Promise<Forum[]>} - Array of Forum objects
     * @fulfill {Forum[]}
     * @reject {string} - Error Reason. Expects:
     */
    getForums() {
        return Forum.getHome(this);
    }

    /**
     * List detailed info about a forum and it's sub-forums and threads
     * @param {number} forumId - Forum id
     * @param {object=} options - Secondary Options
     * @param {number=} options.forumid - Ignore, already required at forumId
     * @returns {Promise<Forum>} - Returns a Forum object
     * @fulfill {Forum}
     * @reject {string} - Error Reason. Expects:
     */
    getForum(forumId, options) {
        return Forum.get(this, forumId, options);
    }


    /**
     * Attempts to submit a new Post into a specified Thread
     * @param {number} threadId - Thread id
     * @param {string} message - Post Message
     * @param {object=} options
     * @param {boolean=} options.signature  - Optionally append your signature
     * @param {number=} options.threadid - Ignore, already required at threadId
     * @param {string=} options.message - Ignore, already required at message
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects:
     */
    createPost(threadId, message, options) {
        return Post.create(this, threadId, message, options);
    }

    /**
     * @deprecated as of 1.4.1
     * @see createPost
     */
    newPost(threadId, message, options) {
        return Post.create(this, threadId, message, options);
    }

    /**
     * Attempts to edit an existing Post
     * @param {number} postId - Post id
     * @param {string} message - Post Message
     * @param {object=} options
     * @param {string=} options.reason - Reason for editing
     * @param {boolean=} options.signature - Optionally append your signature
     * @param {number=} options.postid - Ignore, already required at postId
     * @param {string=} options.message - Ignore, already required at message
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects:
     */
    editPost(postId, message, options) {
        return Post.edit(this, postId, message, options);
    }

    /**
     * Warning untested - does not seem to function yet
     * Attempts to delete an existing Post
     * @param {number} postId - Post id
     * @param {number} threadId - Thread id
     * @param {object=} options
     * @param {string=} options.reason - Reason for deleting
     * @param {number=} options.postid - Ignore, already required at postId
     * @param {number=} options.threadid - Ignore, already required at threadId
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects:
     */
    deletePost(postId, threadId, options) {
        return Post.delete(this, postId, threadId, options);
    }

    /**
     * List detailed information about a Thread and it's Posts
     * @param {number} threadId - Thread id
     * @param {object=} options - Secondary Options
     * @param {number=} options.threadid - Ignore, already required at threadId
     * @returns {Promise<Thread>} - Returns a Thread object
     * @fulfill {Thread}
     * @reject {string} - Error Reason. Expects:
     */
    getThread(threadId, options) {
        return Thread.get(this, threadId, options);
    }

    /**
     * Attempts to submit a new Thread into a specified Forum. This will also be considered the first Post
     * @param {number} forumId - Forum Id
     * @param {string} subject - Post/Thread Subject
     * @param {string} message - Post Message
     * @param {object=} options
     * @param {boolean=} options.signature - Optionally append your signature
     * @param {number=} options.forumid - Ignore, already required at postId
     * @param {string=} options.subject - Ignore, already required at postId
     * @param {string=} options.message - Ignore, already required at postId
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects:
     */
    createThread(forumId, subject, message, options) {
        return Thread.create(this, forumId, subject, message, options);
    }

    /**
     * @deprecated as of 1.4.1
     * @see createThread
     */
    newThread(forumId, subject, message, options) {
        return Thread.create(this, forumId, subject, message, options);
    }

    /**
     * Warning untested - may not function yet
     * Attempts to close a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param {number} threadId - Id of Thread to close
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects:
     */
    closeThread(threadId) {
        return Thread.close(this, threadId);
    }

    /**
     * Warning incomplete - may not function yet
     * Attempts to open a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param {number} threadId - Id of Thread to open
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects:
     */
    openThread(threadId) {
        return Thread.open(this, threadId);
    }

    /**
     * Warning incomplete - may not function yet
     * Attempts to delete a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param {number} threadId - Id of Thread to close
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects:
     */
    deleteThread(threadId) {
        return Thread.delete(this, threadId);
    }

    /**
     * @deprecated as of 1.3.1
     * @see closeThread
     */
    modCloseThread(threadId) {
        return Thread.close(this, threadId);
    }

    /**
     * @deprecated as of 1.3.1
     * @see openThread
     */
    modOpenThread(threadId) {
        return Thread.open(this, threadId);
    }

    /**
     * @deprecated as of 1.3.1
     * @see deleteThread
     */
    modDeleteThread(threadId) {
        return Thread.delete(this, threadId);
    }

    /**
     * Get logged in user's Inbox and list of private Messages
     * @param {object=} options
     * @returns {Promise<Inbox>} - Returns an Inbox object
     * @fulfill {Inbox}
     * @reject {string} - Error Reason. Expects:
     */
    getInbox(options) {
        return Inbox.get(this, options);
    }

    /**
     * Attempts to submit a new Thread into a specified Forum. This will also be considered the first Post
     * @param {Date} date - Delete all messages from before the specified date
     * @param {number=0} folderId - Folder Id, defaults to 0
     * @param {object=} options
     * @param {string=} options.dateline - Ignore, already required at date
     * @param {number=} options.folderid - Ignore, already required at folderId
     * @returns {Promise<void>} - Returns a unhandled response currently
     * @fulfill {void}
     * @reject {string} - Error Reason. Expects:
     */
    emptyInbox(date, folderId, options) {
        return Inbox.empty(this, date, folderId, options)
    }

    /**
     * Get details of a specific Message for the logged in user
     * @param {number} id
     * @param {object=} options
     * @param {number=} options.pmid - Ignore, already required at id
     * @returns {Promise<Message>} - Returns a Message object
     * @fulfill {Message}
     * @reject {string} - Error Reason. Expects:
     */
    getMessage(id, options) {
        return Message.get(this, id, options);
    }

    /**
     *
     * @param {string} username - Username to send the message to
     * @param {string} title - Message Subject
     * @param {string} message - Message content
     * @param {object=} options
     * @param {boolean=} options.signature - Optionally append your signature
     * @param {string=} options.recipients - Ignore, already required at username
     * @param {string=} options.title - Ignore, already required at title
     * @param {string=} options.message - Ignore, already required at message
     * @returns {Promise<void>} - Successfully completes if sent.
     * @fulfill {void}
     * @reject {string} - Error Reason. Expects:
     */
    createMessage(username, title, message, options) {
        return Message.create(this, username, title, message, options)
    }

    /**
     * @deprecated as of 1.4.1
     * @see createMessage
     */
    sendMessage(username, title, message, options) {
        return Message.create(this, username, title, message, options)
    }

    /**
     * Attempts to retrieve data about a specific user found by username
     * @param {string} username - Username
     * @param {object=} options - Secondary Options
     * @param {string=} options.username - Ignore, already required at username
     * @returns {Promise<Member>} - Returns a Member object
     * @fulfill {Member}
     * @reject {string} - Error Reason. Expects:
     */
    getMember(username, options) {
        return Member.get(this, username, options);
    }
}

module.exports = VBApi;
