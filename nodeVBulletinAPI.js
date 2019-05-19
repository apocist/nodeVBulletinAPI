'use strict';
const md5 = require('js-md5'),
    os = require('os'),
    request = require('request'),
    _ = require('underscore'),
    Forum = require('./Forum'),
    Inbox = require('./Inbox'),
    Member = require('./Member'),
    Message = require('./Message'),
    //Post = require('./Post'),
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
     * @param {object=} options - A fallback to the old style config
     * @param {string=} options.apiUrl
     * @param {string=} options.apiKey
     * @param {string=} options.platformName
     * @param {string=} options.platformVersion
     */
    constructor(apiUrl, apiKey, platformName, platformVersion, options) {
        this.defaultVars = {
            baseUrl: '', //Needed for cookie related commands
            apiUrl: '',
            apiKey: '',
            clientName: 'nodeVBulletinAPI',
            clientVersion: version,
            uniqueId: ''
        };

        this.clientSessionVars = {
            apiVersion: '',
            apiAccessToken: '',
            sessionHash: '', // Unused?
            apiClientId: '',
            secret: '',
            inited: false,
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

        options = options || {};
        options.apiUrl = apiUrl || options.apiUrl || '';
        options.apiKey = apiKey || options.apiKey || '';
        options.platformName = platformName || options.platformName || '';
        options.platformVersion = platformVersion || options.platformVersion || '';

        if (
            options.apiUrl !== ''
            && options.apiUrl !== ''
            && options.platformName !== ''
            && options.platformVersion !== ''
        ) {
            this.__initialize(options);
        } else {
            this.clientSessionVars.error = 'apiInit(): Initialization requires a `apiUrl`, `apiKey`, `platformName`, and `platformVersion`';
            this.__waitingForInitializationCallback(false);
        }
    }

    /**
     * Initialize a vb api connection. This needs to be called for the first time
     * @param {object} options
     * @param {string} options.apiUrl
     * @param {string} options.apiKey
     * @param {string} options.platformName
     * @param {string} options.platformVersion
     * @private
     */
    __initialize(options) {
        let that = this;
        // Run itself as a self invoked promise that is awaited by nothing. callMethod shall wait until this is finished
        (async function __initialize_self() {
            let error = null;
            let result = null;
            let regex_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
            let url_parts = regex_url.exec(options.apiUrl);
            that.defaultVars.baseUrl = that.defaultVars.baseUrl || url_parts[1] + ':' + url_parts[2] + url_parts[3] + '/';
            that.defaultVars.apiUrl = that.defaultVars.apiUrl || options.apiUrl;
            that.defaultVars.apiKey = that.defaultVars.apiKey || options.apiKey;
            that.defaultVars.uniqueId = that.defaultVars.uniqueId || md5(that.defaultVars.clientName + that.defaultVars.clientVersion + options.platformName + options.platformVersion + that.constructor.getMacAddress() + new Date().getTime());

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
                        clientname: that.defaultVars.clientName,
                        clientversion: that.defaultVars.clientVersion,
                        platformname: options.platformName,
                        platformversion: options.platformVersion,
                        uniqueid: that.defaultVars.uniqueId
                    }
                });

                that.clientSessionVars.apiVersion = '';
                that.clientSessionVars.apiAccessToken = '';
                that.clientSessionVars.sessionHash = '';
                that.clientSessionVars.apiClientId = '';
                that.clientSessionVars.secret = '';
                that.clientSessionVars.inited = false;
                if (
                    response.apiversion
                    && response.apiaccesstoken
                    && response.sessionhash
                    && response.apiclientid
                    && response.secret
                ) {
                    that.clientSessionVars.apiVersion = response.apiversion;
                    that.clientSessionVars.apiAccessToken = response.apiaccesstoken;
                    that.clientSessionVars.sessionHash = response.sessionhash;
                    that.clientSessionVars.apiClientId = response.apiclientid;
                    that.clientSessionVars.secret = response.secret;
                    that.clientSessionVars.inited = true;
                    that.__waitingForInitializationCallback(true);
                    result = that;
                }

                if (result === null) {
                    that.clientSessionVars.error = that.constructor.parseErrorMessage(response) || 'TODO ERROR (api connection did not return a session)';
                    that.__waitingForInitializationCallback(false);
                    error = that.clientSessionVars.error;
                }
            } catch (e) {
                that.clientSessionVars.error = e;
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
            if (that.clientSessionVars.inited === true) {
                resolve();
            } else if (that.clientSessionVars.error !== null) {
                reject(that.clientSessionVars.error);
            }

            /**
             * @type {number}
             * @private
             */
            that.__waitingForInitializationTimeout = setTimeout(
                function () {
                    that.__waitingForInitializationCallback = function () {
                    }; // Set back to a blank function
                    if (that.clientSessionVars.inited === true) {
                        resolve();
                    } else {
                        reject('Connection could not be achieved due to timed out', that.clientSessionVars.error);
                    }

                },
                waitTime * 1000 // 1 minute timeout
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
                    reject(that.clientSessionVars.error);
                } else {
                    resolve();
                }
            };
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
                    api_c: that.clientSessionVars.apiClientId, //clientId
                    api_s: that.clientSessionVars.apiAccessToken, //apiAccessToken (may be empty)
                    api_v: that.clientSessionVars.apiVersion //api version
                };
                _.extend(reqParams, options.params); // Combine the arrays

                if (sign === true) {
                    // Generate a signature to validate that we are authenticated
                    if (that.clientSessionVars.inited) {
                        reqParams.api_sig = md5(that.clientSessionVars.apiAccessToken + that.clientSessionVars.apiClientId + that.clientSessionVars.secret + that.defaultVars.apiKey);
                    } else {
                        reject('callMethod(): requires initialization. Not initialized');
                        return;
                    }
                }

                // Create a valid http Request
                let reqOptions = {
                    url: that.defaultVars.apiUrl,
                    formData: reqParams,
                    headers: {
                        'User-Agent': that.defaultVars.clientName
                    }
                };

                // Some command require adding a cookie, we'll do that here
                if (options.cookies) {
                    let j = request.jar();
                    for (let variable in options.cookies) {
                        if (options.cookies.hasOwnProperty(variable)) {
                            let cookieString = variable + '=' + options.cookies[variable];
                            let cookie = request.cookie(cookieString);
                            j.setCookie(cookie, that.defaultVars.baseUrl);
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
     * @param {string} password - clear text password TODO need to secure this more?
     * @param {object=} options
     * @param {string=} options.username - Ignore, already required at username
     * @param {string=} options.password - Ignore, already required at password
     * @returns {Promise<UserVars>}
     * @fulfill {UserVars}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
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
     * @param {string} password - MD5 hashed password TODO need to secure this more?
     * @param {object=} options
     * @param {string=} options.username - Ignore, already required at username
     * @param {string=} options.password - Ignore, already required at password
     * @returns {Promise<UserVars>}
     * @fulfill {UserVars}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
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
                    error = null;
                }
                if (error === null) {
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
     * Return a Mac address of a network interface for machine identification
     * @returns {string} macAddress
     */
    static getMacAddress() {
        let interfaces = os.networkInterfaces();
        let address = '';
        loop1:
            for (let k in interfaces) {
                if (interfaces.hasOwnProperty(k)) {
                    for (let k2 in interfaces[k]) {
                        if (interfaces[k].hasOwnProperty(k2)) {
                            let addressI = interfaces[k][k2];
                            if (
                                (addressI.family === 'IPv4' || addressI.family === 'IPv6')
                                && addressI.hasOwnProperty('internal')
                                && addressI.internal === false
                                && addressI.hasOwnProperty('mac')
                                && addressI.mac !== '00:00:00:00:00:00'
                            ) {
                                address = addressI.mac;
                                break loop1;
                            }
                        }
                    }
                }
            }
        return address;
    }

    /**
     *
     * @param {object} response - Response object from callMethod()
     * @returns {string} status - Error message
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
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async getForums() {
        let that = this;
        return new Promise(async function (resolve, reject) {
            let forums = [];
            try {
                let response = await that.callMethod(
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
            } catch (e) {
                reject(e);
            }
            resolve(forums);
        });
    }

    /**
     * List detailed info about a forum and it's sub-forums and threads
     * @param {number} forumId - Forum id
     * @param {object=} options - Secondary Options
     * @param {number=} options.forumid - Ignore, already required at forumId
     * TODO note additional options
     * @returns {Promise<Forum>} - Returns a Forum object
     * @fulfill {Forum}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async getForum(forumId, options) {
        let that = this;
        options = options || {};
        options.forumid = forumId || options.forumid || ''; //required

        return new Promise(async function (resolve, reject) {
            let forum = null;
            try {
                let response = await that.callMethod({
                    method: 'forumdisplay',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    forum = new Forum(response.response);
                }
            } catch (e) {
                reject(e);
            }
            if (forum !== null) {
                resolve(forum);
            } else {
                reject();
            }
        });
    }

    /**
     * List detailed information about a Thread and it's Posts
     * @param {number} threadId - Thread id
     * @param {object=} options - Secondary Options
     * @param {number=} options.threadid - Ignore, already required at threadId
     * TODO note additional options
     * @returns {Promise<Thread>} - Returns a Thread object
     * @fulfill {Thread}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async getThread(threadId, options) {
        let that = this;
        options = options || {};
        options.threadid = threadId || options.threadid || ''; //required

        return new Promise(async function (resolve, reject) {
            let thread = null;
            try {
                let response = await that.callMethod({
                    method: 'showthread',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    thread = new Thread(response.response);
                }
            } catch (e) {
                reject(e);
            }
            if (thread !== null) {
                resolve(thread);
            } else {
                reject();
            }
        });
    }

    /**
     * Attempts to submit a new Post into a specified Thread
     * @param {number} threadId - Thread id
     * @param {string} message - Post Message
     * @param {object=} options
     * @param {boolean=} options.signature  - Optionally append your signature
     * @param {number=} options.threadid - Ignore, already required at threadId
     * @param {string=} options.message - Ignore, already required at message
     * TODO note additional options
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async newPost(threadId, message, options) {
        let that = this;
        options = options || {};
        options.threadid = threadId || options.threadid || ''; //required
        options.message = message || options.message || ''; //required
        if (options.signature === true) {
            //System only handle 1 or 0. defaults to 0
            options.signature = '1';
        }

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'newreply_postreply',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
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
     * Attempts to edit an existing Post
     * @param {number} postId - Post id
     * @param {string} message - Post Message
     * @param {object=} options
     * @param {string=} options.reason - Reason for editing
     * @param {boolean=} options.signature - Optionally append your signature
     * @param {number=} options.postid - Ignore, already required at postId
     * @param {string=} options.message - Ignore, already required at message
     * TODO note additional options
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async editPost(postId, message, options) {
        let that = this;
        options = options || {};
        options.postid = postId || options.postid || ''; //required
        options.message = message || options.message || ''; //required
        if (options.signature === true) {
            //System only handle 1 or 0. defaults to 0
            options.signature = '1';
        }

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'editpost_updatepost',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
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
     * Attempts to retrieve data about a specific user found by username
     * @param {string} username - Username
     * @param {object=} options - Secondary Options
     * @param {string=} options.username - Ignore, already required at username
     * @returns {Promise<Member>} - Returns a Member object
     * @fulfill {Member}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async getMember(username, options) {
        let that = this;
        options = options || {};
        options.username = username || options.username || ''; //required

        return new Promise(async function (resolve, reject) {
            let thread = null;
            try {
                let response = await that.callMethod({
                    method: 'member',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    thread = new Member(response.response);
                }
            } catch (e) {
                reject(e);
            }
            if (thread !== null) {
                resolve(thread);
            } else {
                reject();
            }
        });
    }

    /**
     * TODO untested - does not seem to function yet
     * Attempts to delete an existing Post
     * @param {number} postId - Post id
     * @param {number} threadId - Thread id
     * @param {object=} options
     * @param {string=} options.reason - Reason for deleting
     * @param {number=} options.postid - Ignore, already required at postId
     * @param {number=} options.threadid - Ignore, already required at threadId
     * TODO note additional options
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async deletePost(postId, threadId, options) {
        let that = this;
        options = options || {};
        options.postid = postId || options.postid || ''; //required
        options.threadid = threadId || options.threadid || ''; // TODO required????

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'editpost_deletepost',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
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
     * TODO note additional options
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async newThread(forumId, subject, message, options) {
        let that = this;
        options = options || {};
        options.forumid = forumId || options.forumid || ''; //required
        options.subject = subject || options.subject || ''; //required
        options.message = message || options.message || ''; //required

        if (options.signature === true) {
            //System only handle 1 or 0. defaults to 0
            options.signature = '1'; // FIXME This didn't seem to work
        }

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'newthread_postthread',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
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
     * Get logged in user's Inbox and list of private Messages
     * @param {object=} options
     * @returns {Promise<Inbox>} - Returns an Inbox object
     * @fulfill {Inbox}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async getInbox(options) {
        let that = this;
        options = options || {};

        return new Promise(async function (resolve, reject) {
            let inbox = null;
            try {
                let response = await that.callMethod({
                    method: 'private_messagelist',
                    params: options
                });
                if (
                    response
                    && response.hasOwnProperty('response')
                ) {
                    inbox = new Inbox(response.response);
                }
            } catch (e) {
                reject(e);
            }
            if (inbox !== null) {
                resolve(inbox);
            } else {
                reject();
            }
        });
    }

    /**
     *
     * Attempts to submit a new Thread into a specified Forum. This will also be considered the first Post
     * @param {Date} date - Delete all messages from before the specified date
     * @param {number=0} folderId - Folder Id, defaults to 0
     * @param {object=} options
     * @param {string=} options.dateline - Ignore, already required at date
     * @param {number=} options.folderid - Ignore, already required at folderId
     * TODO note additional options
     * @returns {Promise<void>} - Returns a unhandled response currently
     * @fulfill {void}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async emptyInbox(date, folderId, options) {
        let that = this;
        options = options || {};
        options.dateline = parseInt((date.getTime() / 1000).toFixed(0)) || options.dateline || ''; //required
        options.folderid = folderId || options.folderid || '0';

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'private_confirmemptyfolder',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                if (possibleError !== 'pm_messagesdeleted') {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
            resolve();
        });
    }

    /**
     * Get details of a specific Message for the logged in user
     * @param {number} id
     * @param {object=} options
     * @param {number=} options.pmid - Ignore, already required at id
     * @returns {Promise<Message>} - Returns a Message object
     * @fulfill {Message}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async getMessage(id, options) {
        let that = this;
        options = options || {};
        options.pmid = id || options.pmid || ''; //required

        return new Promise(async function (resolve, reject) {
            let message = null;
            try {
                let response = await that.callMethod({
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
                reject(e);
            }
            if (message !== null) {
                resolve(message);
            } else {
                reject();
            }
        });
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
     * TODO note additional options
     * @returns {Promise<void>} - Successfully completes if sent. TODO: provide a better response
     * @fulfill {void}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async sendMessage(username, title, message, options) {
        let that = this;
        options = options || {};
        options.recipients = username || options.recipients || ''; //required
        options.title = title || options.title || ''; //required
        options.message = message || options.message || ''; //required
        options.signature = options.signature === true ? '1' : '0';

        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
                    method: 'private_insertpm',
                    params: options
                });
                let possibleError = that.constructor.parseErrorMessage(response);
                if (possibleError !== 'pm_messagesent') {
                    reject(possibleError || response);
                }
            } catch (e) {
                reject(e);
            }
            resolve();
        });
    }

    /**
     * TODO incomplete - does not seem to function yet
     * Attempts to close a specific Thread. Requires a user to have a 'inline mod' permissions
     * @param {number} threadId - Id of Thread to close
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async modCloseThread(threadId) {
        let that = this;
        let cookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
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
     * @param {number} threadId - Id of Thread to open
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async modOpenThread(threadId) {
        let that = this;
        let cookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
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
     * @param {number} threadId - Id of Thread to close
     * @returns {Promise<*>} - Returns a unhandled response currently
     * @fulfill {*}
     * @reject {string} - Error Reason. Expects: (TODO list common errors here)
     */
    async modDeleteThread(threadId) {
        let that = this;
        let cookies = {};
        if (threadId) {
            //TODO multiple ids are delimited with a '-'. eg: 123-345-456
            cookies.vbulletin_inlinethread = threadId;
        }
        return new Promise(async function (resolve, reject) {
            try {
                let response = await that.callMethod({
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

module.exports = VBApi;
